import { useCallback, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  getCurrentOdometer,
  listActiveVehicles,
} from "@/db/repositories/vehicles";
import type { Vehicle } from "@/types/models";

export function useVehicles() {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listActiveVehicles(db);
      setVehicles(list);
    } finally {
      setLoading(false);
    }
  }, [db]);

  return { vehicles, loading, refresh };
}

export function useVehicleOdometer(vehicle: Vehicle | null) {
  const db = useSQLiteContext();
  const [odometer, setOdometer] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!vehicle) {
      setOdometer(null);
      return;
    }
    const value = await getCurrentOdometer(
      db,
      vehicle.id,
      vehicle.initialOdometer,
    );
    setOdometer(value);
  }, [db, vehicle]);

  return { odometer, refresh };
}
