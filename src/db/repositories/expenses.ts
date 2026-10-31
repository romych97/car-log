import type { SQLiteDatabase } from "expo-sqlite";

import { rowToExpense, type ExpenseRow } from "@/db/rows";
import type { Expense } from "@/types/models";

export async function listExpensesByVehicle(
  db: SQLiteDatabase,
  vehicleId: string,
): Promise<Expense[]> {
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT * FROM expenses WHERE vehicle_id = ?
     ORDER BY date DESC`,
    vehicleId,
  );
  return rows.map(rowToExpense);
}

export async function getExpenseById(
  db: SQLiteDatabase,
  id: string,
): Promise<Expense | null> {
  const row = await db.getFirstAsync<ExpenseRow>(
    "SELECT * FROM expenses WHERE id = ?",
    id,
  );
  return row ? rowToExpense(row) : null;
}

export async function insertExpense(
  db: SQLiteDatabase,
  expense: Expense,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO expenses (
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

export async function updateExpense(
  db: SQLiteDatabase,
  expense: Expense,
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses SET
      date = ?, odometer = ?, category = ?, title = ?, amount = ?, note = ?
    WHERE id = ?`,
    expense.date,
    expense.odometer ?? null,
    expense.category,
    expense.title,
    expense.amount,
    expense.note ?? null,
    expense.id,
  );
}

export async function deleteExpense(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM expenses WHERE id = ?", id);
}
