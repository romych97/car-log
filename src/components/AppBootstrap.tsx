import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

import { getSettings, setSelectedVehicleId } from "@/db/repositories/settings";
import { listActiveVehicles } from "@/db/repositories/vehicles";
import { useSettingsStore } from "@/store/settingsStore";

type Props = {
  children: ReactNode;
};

export function AppBootstrap({ children }: Props) {
  const db = useSQLiteContext();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const setSelected = useSettingsStore((s) => s.setSelectedVehicleId);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const settings = await getSettings(db);
      const vehicles = await listActiveVehicles(db);

      let selectedId = settings.selectedVehicleId;
      if (selectedId && !vehicles.some((v) => v.id === selectedId)) {
        selectedId = null;
      }
      if (!selectedId && vehicles.length > 0) {
        selectedId = vehicles[0]!.id;
        await setSelectedVehicleId(db, selectedId);
      }

      const merged = { ...settings, selectedVehicleId: selectedId };
      if (!cancelled) {
        hydrate(merged);
        setSelected(selectedId);
        setReady(true);
      }
    }

    bootstrap().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [db, hydrate, setSelected]);

  if (!ready || !hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
