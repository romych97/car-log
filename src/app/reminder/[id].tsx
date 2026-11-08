import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReminderForm } from "@/components/ReminderForm";
import { getReminderById } from "@/db/repositories/reminders";
import { getVehicleById } from "@/db/repositories/vehicles";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { createFormScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import type { Reminder, Vehicle } from "@/types/models";

export default function EditReminderScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createFormScreenStyles(colors),
    [colors],
  );
  const language = useSettingsStore((s) => s.language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const strings = useMemo(() => t(language), [language]);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const r = await getReminderById(db, id);
      if (!r || cancelled) return;
      setReminder(r);
      const v = await getVehicleById(db, r.vehicleId);
      if (!cancelled) setVehicle(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (!reminder || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: strings.reminder.editTitle }} />
      <ReminderForm
        vehicle={vehicle}
        existing={reminder}
        language={language}
        onCancel={() => router.back()}
        onSaved={() => router.back()}
      />
    </SafeAreaView>
  );
}
