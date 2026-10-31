import type { SQLiteDatabase } from "expo-sqlite";

import { rowToVehicle, type VehicleRow } from "@/db/rows";
import type { Vehicle } from "@/types/models";

export type CreateVehicleInput = Omit<Vehicle, "id" | "archived">;

export async function listActiveVehicles(
  db: SQLiteDatabase,
): Promise<Vehicle[]> {
  const rows = await db.getAllAsync<VehicleRow>(
    "SELECT * FROM vehicles WHERE archived = 0 ORDER BY name COLLATE NOCASE",
  );
  return rows.map(rowToVehicle);
}

export async function countActiveVehicles(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM vehicles WHERE archived = 0",
  );
  return row?.count ?? 0;
}

export async function getVehicleById(
  db: SQLiteDatabase,
  id: string,
): Promise<Vehicle | null> {
  const row = await db.getFirstAsync<VehicleRow>(
    "SELECT * FROM vehicles WHERE id = ?",
    id,
  );
  return row ? rowToVehicle(row) : null;
}

export async function insertVehicle(
  db: SQLiteDatabase,
  vehicle: Vehicle,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO vehicles (
      id, name, make, model, year, fuel_type, tank_capacity, initial_odometer, archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    vehicle.id,
    vehicle.name,
    vehicle.make ?? null,
    vehicle.model ?? null,
    vehicle.year ?? null,
    vehicle.fuelType,
    vehicle.tankCapacity ?? null,
    vehicle.initialOdometer,
    vehicle.archived ? 1 : 0,
  );
}

export async function getCurrentOdometer(
  db: SQLiteDatabase,
  vehicleId: string,
  initialOdometer: number,
  excludeFuelLogId?: string,
): Promise<number> {
  const fuelSql = excludeFuelLogId
    ? "SELECT MAX(odometer) AS maxOdometer FROM fuel_logs WHERE vehicle_id = ? AND id != ?"
    : "SELECT MAX(odometer) AS maxOdometer FROM fuel_logs WHERE vehicle_id = ?";
  const fuelParams = excludeFuelLogId
    ? [vehicleId, excludeFuelLogId]
    : [vehicleId];
  const fuelMax = await db.getFirstAsync<{ maxOdometer: number | null }>(
    fuelSql,
    ...fuelParams,
  );
  const expenseMax = await db.getFirstAsync<{ maxOdometer: number | null }>(
    "SELECT MAX(odometer) AS maxOdometer FROM expenses WHERE vehicle_id = ? AND odometer IS NOT NULL",
    vehicleId,
  );
  const values = [
    initialOdometer,
    fuelMax?.maxOdometer ?? initialOdometer,
    expenseMax?.maxOdometer ?? initialOdometer,
  ];
  return Math.max(...values);
}
