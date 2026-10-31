import { Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { replaceDatabaseFromBackup } from "@/backup/database";
import { exportAndShareBackup, readBackupFromPicker } from "@/backup/share";
import { parseBackupJson } from "@/backup/serialize";
import { saveSettings } from "@/db/repositories/settings";
import { syncAllReminderNotifications } from "@/notifications/reminders";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type {
  AppLanguage,
  DistanceUnit,
  Settings,
  VolumeUnit,
} from "@/types/models";

type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function OptionRow({ label, selected, onPress }: OptionRowProps) {
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
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const currency = useSettingsStore((s) => s.currency);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const patch = useSettingsStore((s) => s.patch);
  const strings = useMemo(() => t(language), [language]);
  const ss = strings.settings;
  const [currencyDraft, setCurrencyDraft] = useState(currency);
  const [busy, setBusy] = useState(false);

  const persist = useCallback(
    async (partial: Partial<Settings>) => {
      const current = useSettingsStore.getState();
      const next: Settings = { ...current, ...partial };
      patch(partial);
      await saveSettings(db, next);
    },
    [db, patch],
  );

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      await exportAndShareBackup(db);
      Alert.alert(ss.exportDone);
    } catch (err) {
      if (String(err).includes("sharing_unavailable")) {
        Alert.alert(ss.sharingUnavailable);
      } else {
        Alert.alert(ss.importError);
      }
    } finally {
      setBusy(false);
    }
  }, [db, ss]);

  const runImport = useCallback(async () => {
    setBusy(true);
    try {
      const raw = await readBackupFromPicker();
      const backup = parseBackupJson(raw);
      const merged = await replaceDatabaseFromBackup(db, backup);
      hydrate(merged);
      try {
        await syncAllReminderNotifications(db, merged.language);
      } catch (syncErr) {
        console.warn("[carlog] Notification resync after import:", syncErr);
      }
      Alert.alert(ss.importDone);
    } catch (err) {
      if (String(err).includes("canceled")) return;
      console.warn("[carlog] Backup import failed:", err);
      Alert.alert(ss.importError);
    } finally {
      setBusy(false);
    }
  }, [db, hydrate, ss]);

  const onImport = useCallback(() => {
    Alert.alert(ss.importConfirmTitle, ss.importConfirmMessage, [
      { text: strings.common.cancel, style: "cancel" },
      { text: ss.importBackup, style: "destructive", onPress: runImport },
    ]);
  }, [runImport, ss, strings.common.cancel]);

  const saveCurrency = useCallback(async () => {
    const code = currencyDraft.trim().toUpperCase().slice(0, 8);
    if (!code) return;
    await persist({ currency: code });
  }, [currencyDraft, persist]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: ss.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{ss.sectionUnits}</Text>
        <Text style={styles.fieldLabel}>{ss.language}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            label={ss.languageRu}
            selected={language === "ru"}
            onPress={() => persist({ language: "ru" as AppLanguage })}
          />
          <OptionRow
            label={ss.languageEn}
            selected={language === "en"}
            onPress={() => persist({ language: "en" as AppLanguage })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.distanceUnit}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            label={ss.unitKm}
            selected={distanceUnit === "km"}
            onPress={() => persist({ distanceUnit: "km" as DistanceUnit })}
          />
          <OptionRow
            label={ss.unitMi}
            selected={distanceUnit === "mi"}
            onPress={() => persist({ distanceUnit: "mi" as DistanceUnit })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.volumeUnit}</Text>
        <View style={styles.optionGroup}>
          <OptionRow
            label={ss.unitLiters}
            selected={volumeUnit === "l"}
            onPress={() => persist({ volumeUnit: "l" as VolumeUnit })}
          />
          <OptionRow
            label={ss.unitGal}
            selected={volumeUnit === "gal"}
            onPress={() => persist({ volumeUnit: "gal" as VolumeUnit })}
          />
        </View>

        <Text style={styles.fieldLabel}>{ss.currency}</Text>
        <Text style={styles.hint}>{ss.currencyHint}</Text>
        <TextInput
          style={styles.input}
          value={currencyDraft}
          onChangeText={setCurrencyDraft}
          autoCapitalize="characters"
          onBlur={saveCurrency}
          onSubmitEditing={saveCurrency}
        />

        <Text style={[styles.sectionTitle, styles.sectionGap]}>
          {ss.premium}
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isPremium ? ss.premiumActive : ss.premiumInactive}
          </Text>
          <Text style={styles.hint}>{ss.premiumHint}</Text>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  sectionGap: { marginTop: 20 },
  fieldLabel: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  hint: { fontSize: 13, color: "#666", lineHeight: 18, marginTop: 4 },
  optionGroup: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  optionRowSelected: { backgroundColor: "#E6F4FE" },
  optionLabel: { fontSize: 16 },
  optionCheck: { color: "#208AEF", fontWeight: "700", fontSize: 18 },
  input: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  rowButtons: { flexDirection: "row", gap: 12, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#208AEF",
  },
  secondaryBtnText: { color: "#208AEF", fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
});
