import { useCallback, useMemo, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import {
  filterJournalEntries,
  mergeJournalEntries,
  type JournalFilter,
} from "@/types/journal";

export function useJournal(db: SQLiteDatabase, vehicleId: string | null) {
  const [fuelLogs, setFuelLogs] = useState<Awaited<
    ReturnType<typeof listFuelLogsByVehicle>
  >>([]);
  const [expenses, setExpenses] = useState<Awaited<
    ReturnType<typeof listExpensesByVehicle>
  >>([]);
  const [filter, setFilter] = useState<JournalFilter>("all");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setFuelLogs([]);
      setExpenses([]);
      return;
    }
    setLoading(true);
    try {
      const [fuel, ex] = await Promise.all([
        listFuelLogsByVehicle(db, vehicleId),
        listExpensesByVehicle(db, vehicleId),
      ]);
      setFuelLogs(fuel);
      setExpenses(ex);
    } finally {
      setLoading(false);
    }
  }, [db, vehicleId]);

  const entries = useMemo(() => {
    const merged = mergeJournalEntries(fuelLogs, expenses);
    return filterJournalEntries(merged, filter);
  }, [fuelLogs, expenses, filter]);

  return {
    fuelLogs,
    expenses,
    entries,
    filter,
    setFilter,
    loading,
    refresh,
  };
}
