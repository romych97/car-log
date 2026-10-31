import { useCallback, useMemo, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import {
  averageConsumptionLastN,
  computeConsumptionIntervals,
} from "@/domain/fuel/calculations";
import type { FuelLog } from "@/types/models";

export function useFuelLogs(db: SQLiteDatabase, vehicleId: string | null) {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listFuelLogsByVehicle(db, vehicleId);
      setLogs(list);
    } finally {
      setLoading(false);
    }
  }, [db, vehicleId]);

  return { logs, loading, refresh };
}

export function useFuelSummary(logs: FuelLog[]) {
  return useMemo(() => {
    const intervals = computeConsumptionIntervals(logs);
    const avgConsumption = averageConsumptionLastN(intervals, 5);
    return { intervals, avgConsumption };
  }, [logs]);
}
