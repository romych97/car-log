import { router, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FuelLogForm } from "@/components/FuelLogForm";
import { getSuggestedOdometer } from "@/db/repositories/fuelLogs";
import { getVehicleById } from "@/db/repositories/vehicles";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { Vehicle } from "@/types/models";

export default function NewFuelScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [initialOdometer, setInitialOdometer] = useState<number | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      const v = await getVehicleById(db, vehicleId);
      if (!v || cancelled) return;
      setVehicle(v);
      const suggested = await getSuggestedOdometer(
        db,
        v.id,
        v.initialOdometer,
      );
      if (!cancelled) setInitialOdometer(suggested);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, vehicleId]);

  if (!vehicleId || !vehicle || initialOdometer == null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: strings.fuel.newTitle }} />
      <FuelLogForm
        vehicle={vehicle}
        initialOdometer={initialOdometer}
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
