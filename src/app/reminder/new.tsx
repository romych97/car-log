import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReminderForm } from "@/components/ReminderForm";
import { getSuggestedOdometer } from "@/db/repositories/fuelLogs";
import { getVehicleById } from "@/db/repositories/vehicles";
import {
  REMINDER_TEMPLATES,
  type ReminderTemplateId,
} from "@/domain/reminders/templates";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { Vehicle } from "@/types/models";

export default function NewReminderScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const { template } = useLocalSearchParams<{ template?: string }>();
  const strings = useMemo(() => t(language), [language]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [lastOdometer, setLastOdometer] = useState<number | undefined>();

  const tpl = REMINDER_TEMPLATES.find((x) => x.id === template);
  const templateTitle =
    tpl && template
      ? strings.reminder.templates[template as ReminderTemplateId]
      : undefined;

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      const v = await getVehicleById(db, vehicleId);
      if (!v || cancelled) return;
      setVehicle(v);
      const suggested = await getSuggestedOdometer(db, v.id, v.initialOdometer);
      if (!cancelled) setLastOdometer(suggested);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, vehicleId]);

  if (!vehicleId || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: strings.reminder.newTitle }} />
      <ReminderForm
        vehicle={vehicle}
        language={language}
        initialTitle={templateTitle}
        initialEveryKm={tpl?.everyKm}
        initialEveryMonths={tpl?.everyMonths}
        initialLastOdometer={lastOdometer}
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
