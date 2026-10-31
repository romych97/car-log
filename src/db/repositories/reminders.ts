import type { SQLiteDatabase } from "expo-sqlite";

import { rowToReminder, type ReminderRow } from "@/db/rows";
import type { Reminder } from "@/types/models";

export async function listAllReminders(
  db: SQLiteDatabase,
): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>("SELECT * FROM reminders");
  return rows.map(rowToReminder);
}

export async function listRemindersByVehicle(
  db: SQLiteDatabase,
  vehicleId: string,
): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    "SELECT * FROM reminders WHERE vehicle_id = ? ORDER BY title COLLATE NOCASE",
    vehicleId,
  );
  return rows.map(rowToReminder);
}

export async function countRemindersByVehicle(
  db: SQLiteDatabase,
  vehicleId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM reminders WHERE vehicle_id = ?",
    vehicleId,
  );
  return row?.count ?? 0;
}

export async function getReminderById(
  db: SQLiteDatabase,
  id: string,
): Promise<Reminder | null> {
  const row = await db.getFirstAsync<ReminderRow>(
    "SELECT * FROM reminders WHERE id = ?",
    id,
  );
  return row ? rowToReminder(row) : null;
}

export async function insertReminder(
  db: SQLiteDatabase,
  reminder: Reminder,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO reminders (
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
    JSON.stringify(reminder.notificationIds),
  );
}

export async function updateReminder(
  db: SQLiteDatabase,
  reminder: Reminder,
): Promise<void> {
  await db.runAsync(
    `UPDATE reminders SET
      title = ?, every_km = ?, every_months = ?,
      last_odometer = ?, last_date = ?, notification_ids = ?
    WHERE id = ?`,
    reminder.title,
    reminder.everyKm ?? null,
    reminder.everyMonths ?? null,
    reminder.lastOdometer,
    reminder.lastDate,
    JSON.stringify(reminder.notificationIds),
    reminder.id,
  );
}

export async function deleteReminder(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM reminders WHERE id = ?", id);
}
