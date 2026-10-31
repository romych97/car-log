import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FuelLogForm } from "@/components/FuelLogForm";
import { getFuelLogById } from "@/db/repositories/fuelLogs";
import { getVehicleById } from "@/db/repositories/vehicles";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { FuelLog, Vehicle } from "@/types/models";

export default function EditFuelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const strings = useMemo(() => t(language), [language]);
  const [log, setLog] = useState<FuelLog | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!id) return;
    getFuelLogById(db, id).then(async (entry) => {
      setLog(entry);
      if (entry) {
        setVehicle(await getVehicleById(db, entry.vehicleId));
      }
    });
  }, [db, id]);

  if (!log || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: strings.fuel.editTitle }} />
      <FuelLogForm
        vehicle={vehicle}
        existing={log}
        language={language}
        onCancel={() => router.back()}
        onSaved={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
