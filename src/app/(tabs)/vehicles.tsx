import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listAllVehicles } from "@/db/repositories/vehicles";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { Vehicle } from "@/types/models";

export default function VehiclesTabScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const strings = useMemo(() => t(language), [language]);
  const vs = strings.vehicle;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const refresh = useCallback(async () => {
    setVehicles(await listAllVehicles(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.tabs.vehicles}</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={
          vehicles.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{strings.home.noVehicleBody}</Text>
        }
        ListHeaderComponent={
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push("/vehicle/new")}
          >
            <Text style={styles.addBtnText}>+ {strings.home.addVehicle}</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/vehicle/${item.id}`)}
          >
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              {(item.make || item.model) && (
                <Text style={styles.meta}>
                  {[item.make, item.model].filter(Boolean).join(" ")}
                </Text>
              )}
            </View>
            {item.archived ? (
              <Text style={styles.archived}>{vs.archivedLabel}</Text>
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  emptyList: { padding: 16, flexGrow: 1 },
  empty: { fontSize: 16, color: "#666", paddingVertical: 24 },
  addBtn: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  name: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14, color: "#666", marginTop: 4 },
  archived: { fontSize: 13, color: "#888" },
  chevron: { fontSize: 22, color: "#ccc" },
});
