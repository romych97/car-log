import type { SQLiteDatabase } from "expo-sqlite";

import { rowToFuelLog, type FuelLogRow } from "@/db/rows";
import type { FuelLog } from "@/types/models";

export async function listFuelLogsByVehicle(
  db: SQLiteDatabase,
  vehicleId: string,
): Promise<FuelLog[]> {
  const rows = await db.getAllAsync<FuelLogRow>(
    `SELECT * FROM fuel_logs WHERE vehicle_id = ?
     ORDER BY date DESC, odometer DESC`,
    vehicleId,
  );
  return rows.map(rowToFuelLog);
}

export async function getFuelLogById(
  db: SQLiteDatabase,
  id: string,
): Promise<FuelLog | null> {
  const row = await db.getFirstAsync<FuelLogRow>(
    "SELECT * FROM fuel_logs WHERE id = ?",
    id,
  );
  return row ? rowToFuelLog(row) : null;
}

export async function insertFuelLog(
  db: SQLiteDatabase,
  log: FuelLog,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO fuel_logs (
      id, vehicle_id, date, odometer, volume, price_per_unit, total_cost, full_tank, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    log.id,
    log.vehicleId,
    log.date,
    log.odometer,
    log.volume,
    log.pricePerUnit,
    log.totalCost,
    log.fullTank ? 1 : 0,
    log.note ?? null,
  );
}

export async function updateFuelLog(
  db: SQLiteDatabase,
  log: FuelLog,
): Promise<void> {
  await db.runAsync(
    `UPDATE fuel_logs SET
      date = ?, odometer = ?, volume = ?, price_per_unit = ?, total_cost = ?,
      full_tank = ?, note = ?
    WHERE id = ?`,
    log.date,
    log.odometer,
    log.volume,
    log.pricePerUnit,
    log.totalCost,
    log.fullTank ? 1 : 0,
    log.note ?? null,
    log.id,
  );
}

export async function deleteFuelLog(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM fuel_logs WHERE id = ?", id);
}

/** Suggested odometer for a new entry: latest known for vehicle. */
export async function getSuggestedOdometer(
  db: SQLiteDatabase,
  vehicleId: string,
  initialOdometer: number,
): Promise<number> {
  const fuelMax = await db.getFirstAsync<{ maxOdometer: number | null }>(
    "SELECT MAX(odometer) AS maxOdometer FROM fuel_logs WHERE vehicle_id = ?",
    vehicleId,
  );
  const expenseMax = await db.getFirstAsync<{ maxOdometer: number | null }>(
    `SELECT MAX(odometer) AS maxOdometer FROM expenses
     WHERE vehicle_id = ? AND odometer IS NOT NULL`,
    vehicleId,
  );
  return Math.max(
    initialOdometer,
    fuelMax?.maxOdometer ?? initialOdometer,
    expenseMax?.maxOdometer ?? initialOdometer,
  );
}
