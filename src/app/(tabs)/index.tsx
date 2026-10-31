import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "@/components/ActionSheetModal";
import { AppWordmark } from "@/components/AppWordmark";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { VehiclePickerModal } from "@/components/VehiclePickerModal";
import { setSelectedVehicleId } from "@/db/repositories/settings";
import { computePeriodSummary } from "@/domain/vehicle/summary";
import { useFuelLogs, useFuelSummary } from "@/hooks/useFuelLogs";
import { useJournal } from "@/hooks/useJournal";
import { useReminders } from "@/hooks/useReminders";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { useVehicleOdometer, useVehicles } from "@/hooks/useVehicles";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { createHomeScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import {
  formatReminderDueLine,
  reminderStatusColor,
} from "@/utils/reminderFormat";
import { formatMoneyMinor } from "@/utils/money";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const selectedVehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const setSelected = useSettingsStore((s) => s.setSelectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createHomeScreenStyles(colors),
    [colors],
  );
  const uf = useUnitFormat();
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const { vehicles, refresh } = useVehicles();
  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const { odometer, refresh: refreshOdometer } =
    useVehicleOdometer(selectedVehicle);
  const { logs, refresh: refreshFuel } = useFuelLogs(db, selectedVehicleId);
  const { expenses, refresh: refreshJournal } = useJournal(
    db,
    selectedVehicleId,
  );
  const { avgConsumption } = useFuelSummary(logs);
  const { topThree, refresh: refreshReminders } = useReminders(
    db,
    selectedVehicleId,
  );
  const summary = useMemo(
    () => computePeriodSummary(logs, expenses),
    [logs, expenses],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshFuel();
      refreshJournal();
      refreshReminders();
    }, [refresh, refreshFuel, refreshJournal, refreshReminders]),
  );

  useFocusEffect(
    useCallback(() => {
      refreshOdometer();
    }, [refreshOdometer]),
  );

  const onSelectVehicle = useCallback(
    async (id: string) => {
      setSelected(id);
      await setSelectedVehicleId(db, id);
    },
    [db, setSelected],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <AppWordmark />
        <Link href="/settings" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.link}>{strings.home.settings}</Text>
          </Pressable>
        </Link>
      </View>

      {!selectedVehicle ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{strings.home.noVehicleTitle}</Text>
          <Text style={styles.emptyBody}>{strings.home.noVehicleBody}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/vehicle/new")}
          >
            <Text style={styles.primaryButtonText}>
              {strings.home.addVehicle}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScreenScrollView
          contentContainerStyle={[styles.content, styles.contentGap]}
        >
          <Pressable
            style={styles.card}
            onPress={() =>
              vehicles.length > 1 ? setPickerOpen(true) : undefined
            }
          >
            <Text style={styles.cardLabel}>{selectedVehicle.name}</Text>
            {(selectedVehicle.make || selectedVehicle.model) && (
              <Text style={styles.cardMeta}>
                {[selectedVehicle.make, selectedVehicle.model]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            <Text style={styles.odometerLabel}>
              {strings.home.currentOdometer}
            </Text>
            <Text style={styles.odometerValue}>
              {odometer != null ? uf.formatDistance(odometer) : "—"}
            </Text>
            {vehicles.length > 1 && (
              <Text style={styles.tapHint}>{strings.home.selectVehicle}</Text>
            )}
          </Pressable>

          <View style={styles.statsRow}>
            <View style={[styles.card, styles.statCard]}>
              <Text style={styles.statLabel}>{strings.home.avgConsumption}</Text>
              {avgConsumption != null ? (
                <Text style={styles.statValue}>
                  {uf.formatConsumption(avgConsumption)}
                </Text>
              ) : (
                <Text style={styles.statPlaceholder}>
                  {strings.home.noConsumptionYet}
                </Text>
              )}
            </View>
            <View style={[styles.card, styles.statCard]}>
              <Text style={styles.statLabel}>{strings.home.costPerKm}</Text>
              {summary.costPerKmMinor != null ? (
                <Text style={styles.statValue}>
                  {formatMoneyMinor(summary.costPerKmMinor, locale)}
                </Text>
              ) : (
                <Text style={styles.statPlaceholder}>
                  {strings.home.noCostData}
                </Text>
              )}
              <Text style={styles.statHint}>{strings.home.costPerKmHint}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.statLabel}>{strings.home.monthSpend}</Text>
            <Text style={styles.statValue}>
              {formatMoneyMinor(summary.monthCostMinor, locale)}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.reminderHeader}>
              <Text style={styles.statLabel}>
                {strings.home.upcomingMaintenance}
              </Text>
              <Link href="/(tabs)/maintenance" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.link}>{strings.home.allReminders}</Text>
                </Pressable>
              </Link>
            </View>
            {topThree.length === 0 ? (
              <Text style={styles.statPlaceholder}>
                {strings.home.noReminders}
              </Text>
            ) : (
              topThree.map(({ reminder, evaluation }) => (
                <Pressable
                  key={reminder.id}
                  style={styles.reminderRow}
                  onPress={() => router.push(`/reminder/${reminder.id}`)}
                >
                  <View
                    style={[
                      styles.reminderDot,
                      { backgroundColor: reminderStatusColor(evaluation.status) },
                    ]}
                  />
                  <View style={styles.reminderText}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderMeta}>
                      {formatReminderDueLine(evaluation, language, (km) =>
                        uf.formatDistance(km),
                      )}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => setAddOpen(true)}
          >
            <Text style={styles.primaryButtonText}>{strings.home.addEntry}</Text>
          </Pressable>

          {(isPremium || vehicles.length < 2) && (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/vehicle/new")}
            >
              <Text style={styles.secondaryButtonText}>
                {strings.home.addVehicle}
              </Text>
            </Pressable>
          )}
        </ScreenScrollView>
      )}

      <VehiclePickerModal
        visible={pickerOpen}
        vehicles={vehicles}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => onSelectVehicle(v.id)}
      />

      <ActionSheetModal
        visible={addOpen}
        title={strings.journal.addTitle}
        onClose={() => setAddOpen(false)}
        options={[
          {
            key: "fuel",
            label: strings.home.addFuel,
            onPress: () => router.push("/fuel/new"),
          },
          {
            key: "expense",
            label: strings.home.addExpense,
            onPress: () => router.push("/expense/new"),
          },
        ]}
      />
    </SafeAreaView>
  );
}
