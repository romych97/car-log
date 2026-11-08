import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTextInput } from "@/components/AppTextInput";
import { ScreenScrollView } from "@/components/ScreenScrollView";

import {
  mergeDatabaseFromBackup,
  replaceDatabaseFromBackup,
} from "@/backup/database";
import {
  exportAndShareBackup,
  getLastExportCacheUri,
  loadLastExportUriFromDisk,
  readBackupFromPicker,
  readLastExportBackup,
} from "@/backup/share";
import { parseBackupJson, importErrorMessage } from "@/backup/serialize";
import { saveSettings } from "@/db/repositories/settings";
import { syncAllReminderNotifications } from "@/notifications/reminders";
import {
  attachPremiumCustomerInfoListener,
  getPurchaseFailureAlert,
  getRestoreFailureAlert,
  isPurchasesConfigured,
  purchasePremiumPackage,
  restorePremiumPurchases,
  syncPremiumToDatabase,
} from "@/purchases/revenueCat";
import { exportVehiclePdfReport } from "@/reports/pdfReport";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { createSettingsScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import type {
  AppLanguage,
  AppThemeMode,
  DistanceUnit,
  Settings,
  VolumeUnit,
} from "@/types/models";

type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createSettingsScreenStyles>;
};

function OptionRow({ label, selected, onPress, styles }: OptionRowProps) {
  return (
    <Pressable
      style={[styles.optionRow, selected && styles.optionRowSelected]}
      onPress={onPress}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      {selected && <Text style={styles.optionCheck}>✓</Text>}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const currency = useSettingsStore((s) => s.currency);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const patch = useSettingsStore((s) => s.patch);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createSettingsScreenStyles(colors),
    [colors],
  );
  const strings = useMemo(() => t(language), [language]);
  const ss = strings.settings;
  const [currencyDraft, setCurrencyDraft] = useState(currency);
  const [busy, setBusy] = useState(false);
  const [hasLastExport, setHasLastExport] = useState(
    () => getLastExportCacheUri() != null,
  );
  const purchasesReady = isPurchasesConfigured();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollYRef = useRef(0);

  const restoreScroll = useCallback(() => {
    const y = scrollYRef.current;
    if (y <= 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, []);

  useEffect(() => {
    loadLastExportUriFromDisk().then((uri) => {
      setHasLastExport((prev) => {
        const next = uri != null;
        return prev === next ? prev : next;
      });
    });
  }, []);

  const finishImport = useCallback(
    async (loadRaw: () => Promise<string>, merge: boolean) => {
      setBusy(true);
      try {
        const raw = await loadRaw();
        const backup = parseBackupJson(raw);
        const merged = merge
          ? await mergeDatabaseFromBackup(db, backup)
          : await replaceDatabaseFromBackup(db, backup);
        hydrate(merged);
        try {
          await syncAllReminderNotifications(db, merged.language);
        } catch (syncErr) {
          console.error("[carlog] Notification resync after import:", syncErr);
        }
      } catch (err) {
        if (String(err).includes("canceled")) return;
        console.error("[carlog] Backup import failed:", err);
        Alert.alert(ss.importError, importErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [db, hydrate, ss],
  );

  const promptImportMode = useCallback(
    (loadRaw: () => Promise<string>) => {
      Alert.alert(ss.importMergeTitle, ss.importMergeMessage, [
        { text: strings.common.cancel, style: "cancel" },
        { text: ss.importMerge, onPress: () => finishImport(loadRaw, true) },
        {
          text: ss.importReplace,
          style: "destructive",
          onPress: () => finishImport(loadRaw, false),
        },
      ]);
    },
    [finishImport, ss, strings.common.cancel],
  );

  const runImport = useCallback(() => {
    promptImportMode(readBackupFromPicker);
  }, [promptImportMode]);

  const runImportLastExport = useCallback(() => {
    promptImportMode(readLastExportBackup);
  }, [promptImportMode]);

  const persist = useCallback(
    async (partial: Partial<Settings>) => {
      const current = useSettingsStore.getState();
      const next: Settings = { ...current, ...partial };
      patch(partial);
      await saveSettings(db, next);
      restoreScroll();
    },
    [db, patch, restoreScroll],
  );

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      await exportAndShareBackup(db);
      setHasLastExport(true);
    } catch (err) {
      if (String(err).includes("sharing_unavailable")) {
        Alert.alert(ss.sharingUnavailable);
      } else {
        Alert.alert(ss.importError, importErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }, [db, ss]);

  const onImport = useCallback(() => {
    runImport();
  }, [runImport]);

  const onImportLastExport = useCallback(() => {
    runImportLastExport();
  }, [runImportLastExport]);

  const onBuyPremium = useCallback(async () => {
    if (!purchasesReady || busy) return;
    setBusy(true);
    try {
      const result = await purchasePremiumPackage();
      if (result.userCanceled) return;
      const active = await syncPremiumToDatabase(db);
      patch({ isPremium: active });
      if (active) {
        Alert.alert(ss.premiumSuccess);
      } else {
        Alert.alert(ss.premiumNotGrantedTitle, ss.premiumNotGrantedHint);
      }
    } catch (err) {
      console.error("[carlog] Purchase failed:", err);
      const { title, message } = getPurchaseFailureAlert(err, ss);
      Alert.alert(title, message);
    } finally {
      setBusy(false);
    }
  }, [busy, db, patch, purchasesReady, ss]);

  const onRestorePremium = useCallback(async () => {
    if (!purchasesReady || busy) return;
    setBusy(true);
    try {
      const active = await restorePremiumPurchases(db);
      patch({ isPremium: active });
      Alert.alert(
        active ? ss.premiumSuccess : ss.premiumRestoreDone,
      );
    } catch (err) {
      console.error("[carlog] Restore failed:", err);
      const { title, message } = getRestoreFailureAlert(err, ss);
      Alert.alert(title, message);
    } finally {
      setBusy(false);
    }
  }, [busy, db, patch, purchasesReady, ss]);

  const onExportPdf = useCallback(async () => {
    if (!vehicleId) {
      Alert.alert(strings.stats.noVehicle);
      return;
    }
    setBusy(true);
    try {
      await exportVehiclePdfReport(db, vehicleId);
    } catch (err) {
      if (String(err).includes("sharing_unavailable")) {
        Alert.alert(ss.sharingUnavailable);
      } else {
        Alert.alert(ss.pdfShareError, importErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }, [db, ss, strings.stats.noVehicle, vehicleId]);

  const saveCurrency = useCallback(async () => {
    const code = currencyDraft.trim().toUpperCase().slice(0, 8);
    if (!code || code === currency) return;
    await persist({ currency: code });
  }, [currency, currencyDraft, persist]);

  useEffect(() => {
    setCurrencyDraft(currency);
  }, [currency]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>{strings.common.cancel}</Text>
        </Pressable>
        <Text style={styles.toolbarTitle}>{ss.title}</Text>
        <View style={styles.toolbarSpacer} />
      </View>
      <ScreenScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardDismissMode="none"
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
      >
        <Text style={styles.sectionTitle}>{ss.sectionAppearance}</Text>
        <Text style={styles.fieldLabel}>{ss.theme}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            styles={styles}
            label={ss.themeSystem}
            selected={themeMode === "system"}
            onPress={() => persist({ themeMode: "system" as AppThemeMode })}
          />
          <OptionRow
            styles={styles}
            label={ss.themeLight}
            selected={themeMode === "light"}
            onPress={() => persist({ themeMode: "light" as AppThemeMode })}
          />
          <OptionRow
            styles={styles}
            label={ss.themeDark}
            selected={themeMode === "dark"}
            onPress={() => persist({ themeMode: "dark" as AppThemeMode })}
          />
        </View>

        <Text style={[styles.sectionTitle, styles.sectionGap]}>
          {ss.sectionUnits}
        </Text>
        <Text style={styles.fieldLabel}>{ss.language}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            styles={styles}
            label={ss.languageRu}
            selected={language === "ru"}
            onPress={() => persist({ language: "ru" as AppLanguage })}
          />
          <OptionRow
            styles={styles}
            label={ss.languageEn}
            selected={language === "en"}
            onPress={() => persist({ language: "en" as AppLanguage })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.distanceUnit}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            styles={styles}
            label={ss.unitKm}
            selected={distanceUnit === "km"}
            onPress={() => persist({ distanceUnit: "km" as DistanceUnit })}
          />
          <OptionRow
            styles={styles}
            label={ss.unitMi}
            selected={distanceUnit === "mi"}
            onPress={() => persist({ distanceUnit: "mi" as DistanceUnit })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.volumeUnit}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            styles={styles}
            label={ss.unitLiters}
            selected={volumeUnit === "l"}
            onPress={() => persist({ volumeUnit: "l" as VolumeUnit })}
          />
          <OptionRow
            styles={styles}
            label={ss.unitGal}
            selected={volumeUnit === "gal"}
            onPress={() => persist({ volumeUnit: "gal" as VolumeUnit })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.currency}</Text>
        <Text style={styles.hint}>{ss.currencyHint}</Text>
        <AppTextInput
          style={styles.input}
          value={currencyDraft}
          onChangeText={setCurrencyDraft}
          autoCapitalize="characters"
          onSubmitEditing={saveCurrency}
          returnKeyType="done"
        />

        <Text style={[styles.sectionTitle, styles.sectionGap]}>
          {ss.premium}
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isPremium ? ss.premiumActive : ss.premiumInactive}
          </Text>
          <Text style={styles.hint}>{ss.premiumHint}</Text>
          {!purchasesReady && (
            <Text style={styles.hint}>{ss.premiumNotConfigured}</Text>
          )}
          {purchasesReady && !isPremium && (
            <Pressable
              style={[styles.primaryBtn, styles.fullWidthBtn, busy && styles.btnDisabled]}
              onPress={onBuyPremium}
              disabled={busy}
            >
              <Text style={styles.primaryBtnText}>{ss.premiumBuy}</Text>
            </Pressable>
          )}
          {purchasesReady && (
            <Pressable
              style={[styles.secondaryBtn, styles.fullWidthBtn, busy && styles.btnDisabled]}
              onPress={onRestorePremium}
              disabled={busy}
            >
              <Text style={styles.secondaryBtnText}>{ss.premiumRestore}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.hint}>{ss.devBuildHint}</Text>

        <Pressable
          style={[styles.secondaryBtn, styles.fullWidthBtn, busy && styles.btnDisabled]}
          onPress={onExportPdf}
          disabled={busy}
        >
          <Text style={styles.secondaryBtnText}>{ss.exportPdf}</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, styles.sectionGap]}>
          {ss.sectionBackup}
        </Text>
        <Text style={styles.hint}>{ss.backupHint}</Text>
        <View style={styles.rowButtons}>
          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={onExport}
            disabled={busy}
          >
            <Text style={styles.primaryBtnText}>{ss.exportBackup}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, busy && styles.btnDisabled]}
            onPress={onImport}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>{ss.importBackup}</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{ss.importLastExportHint}</Text>
        <Pressable
          style={[
            styles.secondaryBtn,
            styles.fullWidthBtn,
            (busy || !hasLastExport) && styles.btnDisabled,
          ]}
          onPress={onImportLastExport}
          disabled={busy || !hasLastExport}
        >
          <Text style={styles.secondaryBtnText}>{ss.importLastExport}</Text>
        </Pressable>
      </ScreenScrollView>
    </SafeAreaView>
  );
}
