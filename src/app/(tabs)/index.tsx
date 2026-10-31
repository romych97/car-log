import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "@/components/ActionSheetModal";
import { VehiclePickerModal } from "@/components/VehiclePickerModal";
import { setSelectedVehicleId } from "@/db/repositories/settings";
import { computePeriodSummary } from "@/domain/vehicle/summary";
import { useFuelLogs, useFuelSummary } from "@/hooks/useFuelLogs";
import { useJournal } from "@/hooks/useJournal";
import { useReminders } from "@/hooks/useReminders";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { useVehicleOdometer, useVehicles } from "@/hooks/useVehicles";
import { t } from "@/i18n/translations";
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
        <Text style={styles.appTitle}>{strings.home.title}</Text>
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
        <ScrollView contentContainerStyle={styles.content}>
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
        </ScrollView>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  link: {
    fontSize: 16,
    color: "#208AEF",
  },
  empty: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
    marginBottom: 24,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  odometerLabel: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  odometerValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  tapHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#208AEF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  statPlaceholder: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
  statHint: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  reminderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reminderText: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: "600" },
  reminderMeta: { fontSize: 13, color: "#666", marginTop: 2 },
  primaryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#208AEF",
  },
  secondaryButtonText: {
    color: "#208AEF",
    fontSize: 16,
    fontWeight: "600",
  },
});
