import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "@/components/ActionSheetModal";
import { UndoSnackbar } from "@/components/UndoSnackbar";
import { deleteExpense, insertExpense } from "@/db/repositories/expenses";
import { deleteFuelLog, insertFuelLog } from "@/db/repositories/fuelLogs";
import { useJournal } from "@/hooks/useJournal";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { JournalEntry } from "@/types/journal";
import type { Expense, FuelLog } from "@/types/models";
import { formatMoneyMinor } from "@/utils/money";

type PendingUndo =
  | { kind: "fuel"; data: FuelLog }
  | { kind: "expense"; data: Expense };

export default function JournalScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
  const uf = useUnitFormat();
  const js = strings.journal;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const { entries, filter, setFilter, refresh } = useJournal(db, vehicleId);
  const [addOpen, setAddOpen] = useState(false);
  const [undo, setUndo] = useState<PendingUndo | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const confirmDelete = useCallback(
    (entry: JournalEntry) => {
      Alert.alert(js.deleteConfirmTitle, js.deleteConfirmMessage, [
        { text: strings.common.cancel, style: "cancel" },
        {
          text: js.deleteAction,
          style: "destructive",
          onPress: async () => {
            if (entry.kind === "fuel") {
              await deleteFuelLog(db, entry.data.id);
              setUndo({ kind: "fuel", data: entry.data });
            } else {
              await deleteExpense(db, entry.data.id);
              setUndo({ kind: "expense", data: entry.data });
            }
            setSnackbarVisible(true);
            refresh();
          },
        },
      ]);
    },
    [db, js, refresh, strings.common.cancel],
  );

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    if (undo.kind === "fuel") {
      await insertFuelLog(db, undo.data);
    } else {
      await insertExpense(db, undo.data);
    }
    setUndo(null);
    setSnackbarVisible(false);
    refresh();
  }, [db, refresh, undo]);

  const openEntry = (entry: JournalEntry) => {
    if (entry.kind === "fuel") {
      router.push(`/fuel/${entry.data.id}`);
    } else {
      router.push(`/expense/${entry.data.id}`);
    }
  };

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: js.filterAll },
    { key: "fuel", label: js.filterFuel },
    { key: "expense", label: js.filterExpense },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{js.title}</Text>
        {vehicleId && (
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
            <Text style={styles.link}>+</Text>
          </Pressable>
        )}
      </View>

      {vehicleId && (
        <View style={styles.filters}>
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === f.key && styles.chipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!vehicleId ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{strings.home.noVehicleTitle}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            entries.length === 0 ? styles.emptyList : styles.listPad
          }
          ListEmptyComponent={<Text style={styles.muted}>{js.empty}</Text>}
          renderItem={({ item }) => (
            <ReanimatedSwipeable
              friction={2}
              overshootRight={false}
              renderRightActions={() => (
                <Pressable
                  style={styles.swipeDelete}
                  onPress={() => confirmDelete(item)}
                >
                  <Text style={styles.swipeDeleteText}>{js.deleteAction}</Text>
                </Pressable>
              )}
            >
              <Pressable style={styles.row} onPress={() => openEntry(item)}>
                <View style={styles.rowMain}>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.typeBadge}>
                      {item.kind === "fuel"
                        ? js.typeFuel
                        : js.typeExpense}
                    </Text>
                    <Text style={styles.rowDate}>
                      {new Date(item.date).toLocaleDateString(locale)}
                    </Text>
                  </View>
                  {item.kind === "fuel" ? (
                    <Text style={styles.rowMeta}>
                      {uf.formatDistance(item.data.odometer)} ·{" "}
                      {uf.formatVolume(item.data.volume)}
                      {item.data.fullTank ? ` · ${strings.fuel.fullTankBadge}` : ""}
                    </Text>
                  ) : (
                    <Text style={styles.rowMeta}>
                      {item.data.title} · {strings.expense.categories[item.data.category]}
                    </Text>
                  )}
                </View>
                <Text style={styles.rowAmount}>
                  {formatMoneyMinor(
                    item.kind === "fuel"
                      ? item.data.totalCost
                      : item.data.amount,
                    locale,
                  )}
                </Text>
              </Pressable>
            </ReanimatedSwipeable>
          )}
        />
      )}

      <ActionSheetModal
        visible={addOpen}
        title={js.addTitle}
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

      <UndoSnackbar
        visible={snackbarVisible && undo != null}
        message={js.deletedMessage}
        actionLabel={strings.common.undo}
        onUndo={handleUndo}
        onDismiss={() => {
          setSnackbarVisible(false);
          setUndo(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  link: { fontSize: 28, color: "#208AEF", fontWeight: "300" },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e8e8ed",
  },
  chipActive: { backgroundColor: "#208AEF" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
  listPad: { paddingBottom: 100 },
  muted: { fontSize: 16, color: "#666", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  rowMain: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#208AEF",
    textTransform: "uppercase",
  },
  rowDate: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 14, color: "#666" },
  rowAmount: { fontSize: 16, fontWeight: "600" },
  swipeDelete: {
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    width: 96,
  },
  swipeDeleteText: { color: "#fff", fontWeight: "600" },
});
