import type { SQLiteDatabase } from "expo-sqlite";

import { rowToExpense, rowToFuelLog, rowToReminder, rowToVehicle } from "@/db/rows";
import type { ExpenseRow, FuelLogRow, ReminderRow, VehicleRow } from "@/db/rows";
import { getSettings, saveSettings } from "@/db/repositories/settings";
import type { CarLogBackup } from "@/types/backup";
import { DATA_SCHEMA_VERSION } from "@/types/models";
import type { Settings } from "@/types/models";

async function upsertBackupRows(
  db: SQLiteDatabase,
  backup: CarLogBackup,
): Promise<void> {
  for (const vehicle of backup.vehicles) {
    await db.runAsync(
      `INSERT OR REPLACE INTO vehicles (
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

  for (const log of backup.fuelLogs) {
    await db.runAsync(
      `INSERT OR REPLACE INTO fuel_logs (
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

  for (const expense of backup.expenses) {
    await db.runAsync(
      `INSERT OR REPLACE INTO expenses (
        id, vehicle_id, date, odometer, category, title, amount, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      expense.id,
      expense.vehicleId,
      expense.date,
      expense.odometer ?? null,
      expense.category,
      expense.title,
      expense.amount,
      expense.note ?? null,
    );
  }

  for (const reminder of backup.reminders) {
    await db.runAsync(
      `INSERT OR REPLACE INTO reminders (
        id, vehicle_id, title, every_km, every_months,
        last_odometer, last_date, notification_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      reminder.id,
      reminder.vehicleId,
      reminder.title,
      reminder.everyKm ?? null,
      reminder.everyMonths ?? null,
      reminder.lastOdometer,
      reminder.lastDate,
      JSON.stringify(reminder.notificationIds ?? []),
    );
  }
}

function resolveSelectedVehicleId(
  backup: CarLogBackup,
  preferBackupSelection: boolean,
  currentSelectedId: string | null,
): string | null {
  const vehicleIds = new Set(backup.vehicles.map((v) => v.id));
  let selectedId = preferBackupSelection
    ? (backup.settings.selectedVehicleId ?? null)
    : currentSelectedId;
  if (selectedId && !vehicleIds.has(selectedId)) {
    selectedId =
      backup.vehicles.find((v) => !v.archived)?.id ??
      backup.vehicles[0]?.id ??
      currentSelectedId;
  }
  if (!selectedId) {
    selectedId =
      backup.vehicles.find((v) => !v.archived)?.id ??
      backup.vehicles[0]?.id ??
      null;
  }
  return selectedId;
}

export async function buildBackupPayload(
  db: SQLiteDatabase,
): Promise<CarLogBackup> {
  const settings = await getSettings(db);
  const vehicleRows = await db.getAllAsync<VehicleRow>("SELECT * FROM vehicles");
  const fuelRows = await db.getAllAsync<FuelLogRow>("SELECT * FROM fuel_logs");
  const expenseRows = await db.getAllAsync<ExpenseRow>("SELECT * FROM expenses");
  const reminderRows = await db.getAllAsync<ReminderRow>(
    "SELECT * FROM reminders",
  );

  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: Date.now(),
    app: "carlog",
    settings: {
      distanceUnit: settings.distanceUnit,
      volumeUnit: settings.volumeUnit,
      currency: settings.currency,
      language: settings.language,
      isPremium: settings.isPremium,
      selectedVehicleId: settings.selectedVehicleId,
    },
    vehicles: vehicleRows.map(rowToVehicle),
    fuelLogs: fuelRows.map(rowToFuelLog),
    expenses: expenseRows.map(rowToExpense),
    reminders: reminderRows.map(rowToReminder),
  };
}

export async function replaceDatabaseFromBackup(
  db: SQLiteDatabase,
  backup: CarLogBackup,
): Promise<Settings> {
  const current = await getSettings(db);

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM reminders");
    await db.runAsync("DELETE FROM expenses");
    await db.runAsync("DELETE FROM fuel_logs");
    await db.runAsync("DELETE FROM vehicles");
    await upsertBackupRows(db, backup);
  });

  const selectedId = resolveSelectedVehicleId(
    backup,
    true,
    current.selectedVehicleId,
  );

  const merged: Settings = {
    distanceUnit: backup.settings.distanceUnit,
    volumeUnit: backup.settings.volumeUnit,
    currency: backup.settings.currency,
    language: backup.settings.language,
    isPremium: current.isPremium,
    selectedVehicleId: selectedId,
  };
  await saveSettings(db, merged);
  return merged;
}

export async function mergeDatabaseFromBackup(
  db: SQLiteDatabase,
  backup: CarLogBackup,
): Promise<Settings> {
  const current = await getSettings(db);

  await db.withTransactionAsync(async () => {
    await upsertBackupRows(db, backup);
  });

  const selectedId = resolveSelectedVehicleId(
    backup,
    false,
    current.selectedVehicleId,
  );

  const merged: Settings = {
    ...current,
    selectedVehicleId: selectedId,
  };
  await saveSettings(db, merged);
  return merged;
}
