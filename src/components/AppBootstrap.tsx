import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

import { getSettings, setSelectedVehicleId } from "@/db/repositories/settings";
import { listActiveVehicles } from "@/db/repositories/vehicles";
import { syncAllReminderNotifications } from "@/notifications/reminders";
import { loadLastExportUriFromDisk } from "@/backup/share";
import { syncPremiumToDatabase, attachPremiumCustomerInfoListener } from "@/purchases/revenueCat";
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

  const patch = useSettingsStore((s) => s.patch);

  useEffect(() => {
    attachPremiumCustomerInfoListener(db, (active) => {
      patch({ isPremium: active });
    });
  }, [db, patch]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await loadLastExportUriFromDisk();
      let settings = await getSettings(db);
      await syncPremiumToDatabase(db);
      settings = await getSettings(db);
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

      if (!cancelled) {
        try {
          await syncAllReminderNotifications(db, merged.language);
        } catch (err) {
          console.warn("[carlog] Reminder notification sync failed:", err);
        }
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
