import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  countActiveVehicles,
  listAllVehicles,
  unarchiveVehicle,
} from "@/db/repositories/vehicles";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { createVehiclesScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import type { Vehicle } from "@/types/models";

export default function VehiclesTabScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createVehiclesScreenStyles(colors),
    [colors],
  );
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

  const confirmUnarchive = useCallback(
    (vehicle: Vehicle) => {
      void (async () => {
        const activeCount = await countActiveVehicles(db);
        if (!isPremium && activeCount >= 1) {
          Alert.alert(vs.freeLimit);
          return;
        }
        Alert.alert(vs.unarchiveConfirmTitle, vs.unarchiveConfirmMessage, [
          { text: strings.common.cancel, style: "cancel" },
          {
            text: vs.unarchive,
            onPress: async () => {
              await unarchiveVehicle(db, vehicle.id);
              refresh();
            },
          },
        ]);
      })();
    },
    [db, isPremium, refresh, strings.common.cancel, vs],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.tabs.vehicles}</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        style={{ flex: 1 }}
        contentContainerStyle={
          vehicles.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{strings.home.noVehicleBody}</Text>
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
              <Pressable
                hitSlop={8}
                onPress={() => confirmUnarchive(item)}
                style={styles.unarchiveBtn}
              >
                <Text style={styles.unarchiveText}>{vs.unarchive}</Text>
              </Pressable>
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </Pressable>
        )}
      />
      <View style={styles.tabFooter}>
        <Pressable
          style={styles.tabFooterBtn}
          onPress={() => router.push("/vehicle/new")}
        >
          <Text style={styles.tabFooterBtnText}>
            {strings.home.addVehicleButton}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
