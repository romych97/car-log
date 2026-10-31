import { useCallback, useMemo, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { listRemindersByVehicle } from "@/db/repositories/reminders";
import { getCurrentOdometer, getVehicleById } from "@/db/repositories/vehicles";
import {
  computeDailyKmAverage,
  evaluateReminder,
  sortRemindersByUrgency,
  type ReminderEvaluation,
} from "@/domain/reminders/status";
import type { Reminder } from "@/types/models";

export type ReminderWithEvaluation = {
  reminder: Reminder;
  evaluation: ReminderEvaluation;
};

export function useReminders(
  db: SQLiteDatabase,
  vehicleId: string | null,
) {
  const [items, setItems] = useState<ReminderWithEvaluation[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [reminders, fuelLogs, expenses, vehicle] = await Promise.all([
        listRemindersByVehicle(db, vehicleId),
        listFuelLogsByVehicle(db, vehicleId),
        listExpensesByVehicle(db, vehicleId),
        getVehicleById(db, vehicleId),
      ]);
      const odometer = await getCurrentOdometer(
        db,
        vehicleId,
        vehicle?.initialOdometer ?? 0,
      );
      const { dailyKm, dataSpanDays } = computeDailyKmAverage(
        fuelLogs,
        expenses,
      );
      const evaluated = reminders.map((reminder) => ({
        reminder,
        evaluation: evaluateReminder(
          reminder,
          odometer,
          dailyKm,
          dataSpanDays,
        ),
      }));
      setItems(sortRemindersByUrgency(evaluated));
    } finally {
      setLoading(false);
    }
  }, [db, vehicleId]);

  const topThree = useMemo(() => items.slice(0, 3), [items]);

  return { items, topThree, loading, refresh };
}
