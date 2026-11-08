import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExpenseForm } from "@/components/ExpenseForm";
import { getExpenseById } from "@/db/repositories/expenses";
import { getVehicleById } from "@/db/repositories/vehicles";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { createFormScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import type { Expense, Vehicle } from "@/types/models";

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createFormScreenStyles(colors),
    [colors],
  );
  const language = useSettingsStore((s) => s.language);
  const strings = useMemo(() => t(language), [language]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!id) return;
    getExpenseById(db, id).then(async (entry) => {
      setExpense(entry);
      if (entry) {
        setVehicle(await getVehicleById(db, entry.vehicleId));
      }
    });
  }, [db, id]);

  if (!expense || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: strings.expense.editTitle }} />
      <ExpenseForm
        vehicle={vehicle}
        existing={expense}
        language={language}
        onCancel={() => router.back()}
        onSaved={() => router.back()}
      />
    </SafeAreaView>
  );
}
