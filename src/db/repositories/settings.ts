import type { SQLiteDatabase } from "expo-sqlite";

import { rowToSettings, type SettingsRow } from "@/db/rows";
import type { Settings } from "@/types/models";

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<SettingsRow>(
    "SELECT * FROM app_settings WHERE id = 1",
  );
  if (!row) {
    throw new Error("app_settings row missing");
  }
  return rowToSettings(row);
}

export async function saveSettings(
  db: SQLiteDatabase,
  settings: Settings,
): Promise<void> {
  await db.runAsync(
    `UPDATE app_settings SET
      distance_unit = ?,
      volume_unit = ?,
      currency = ?,
      language = ?,
      is_premium = ?,
      selected_vehicle_id = ?
    WHERE id = 1`,
    settings.distanceUnit,
    settings.volumeUnit,
    settings.currency,
    settings.language,
    settings.isPremium ? 1 : 0,
    settings.selectedVehicleId,
  );
}

export async function setSelectedVehicleId(
  db: SQLiteDatabase,
  vehicleId: string | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE app_settings SET selected_vehicle_id = ? WHERE id = 1",
    vehicleId,
  );
}
