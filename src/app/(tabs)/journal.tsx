import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFuelLogs } from "@/hooks/useFuelLogs";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import { formatMoneyMinor } from "@/utils/money";

export default function JournalScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const { logs, refresh } = useFuelLogs(db, vehicleId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.fuel.listTitle}</Text>
        {vehicleId && (
          <Pressable onPress={() => router.push("/fuel/new")} hitSlop={8}>
            <Text style={styles.link}>+</Text>
          </Pressable>
        )}
      </View>

      {!vehicleId ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{strings.home.noVehicleTitle}</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={logs.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <Text style={styles.muted}>{strings.fuel.empty}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/fuel/${item.id}`)}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowDate}>
                  {new Date(item.date).toLocaleDateString(locale)}
                </Text>
                <Text style={styles.rowMeta}>
                  {Math.round(item.odometer).toLocaleString()} {strings.common.km}
                  {" · "}
                  {item.volume.toLocaleString(locale)} л
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>
                  {formatMoneyMinor(item.totalCost, locale)}
                </Text>
                {item.fullTank && (
                  <Text style={styles.badge}>{strings.fuel.fullTankBadge}</Text>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
  muted: { fontSize: 16, color: "#666", textAlign: "center" },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  rowMain: { flex: 1, gap: 4 },
  rowDate: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 14, color: "#666" },
  rowRight: { alignItems: "flex-end", gap: 4 },
  rowAmount: { fontSize: 16, fontWeight: "600" },
  badge: { fontSize: 11, color: "#208AEF" },
});
