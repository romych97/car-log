import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
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
import { useAppTheme } from "@/hooks/useAppTheme";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { t } from "@/i18n/translations";
import { createJournalScreenStyles } from "@/theme/screenStyles";
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
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createJournalScreenStyles(colors),
    [colors],
  );
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
      </View>

      {vehicleId ? (
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
      ) : null}

      {!vehicleId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{strings.home.noVehicleTitle}</Text>
          <Text style={styles.emptyBody}>{strings.home.noVehicleBody}</Text>
        </View>
      ) : (
        <>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={
            entries.length === 0 ? styles.listEmpty : styles.list
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>{js.empty}</Text>
              <Text style={styles.emptyBody}>{js.emptyBody}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ReanimatedSwipeable
              containerStyle={styles.swipeable}
              friction={2}
              overshootRight={false}
              renderRightActions={() => (
                <View style={styles.swipeDeleteOuter}>
                  <Pressable
                    style={styles.swipeDelete}
                    onPress={() => confirmDelete(item)}
                  >
                    <Text style={styles.swipeDeleteText}>{js.deleteAction}</Text>
                  </Pressable>
                </View>
              )}
            >
              <Pressable style={styles.card} onPress={() => openEntry(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardMain}>
                    <View style={styles.rowTitleLine}>
                      <Text style={styles.typeBadge}>
                        {item.kind === "fuel"
                          ? js.typeFuel
                          : js.typeExpense}
                      </Text>
                      <Text style={styles.cardTitle}>
                        {new Date(item.date).toLocaleDateString(locale)}
                      </Text>
                    </View>
                    {item.kind === "fuel" ? (
                      <Text style={styles.cardMeta}>
                        {uf.formatDistance(item.data.odometer)} ·{" "}
                        {uf.formatVolume(item.data.volume)}
                        {item.data.fullTank
                          ? ` · ${strings.fuel.fullTankBadge}`
                          : ""}
                      </Text>
                    ) : (
                      <Text style={styles.cardMeta}>
                        {item.data.title} ·{" "}
                        {strings.expense.categories[item.data.category]}
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
                </View>
              </Pressable>
            </ReanimatedSwipeable>
          )}
        />
        <View style={styles.tabFooter}>
          <Pressable
            style={styles.tabFooterBtn}
            onPress={() => setAddOpen(true)}
          >
            <Text style={styles.tabFooterBtnText}>{js.addButton}</Text>
          </Pressable>
        </View>
        </>
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
