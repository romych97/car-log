import { addMonths, startOfDay } from "date-fns";

import type { Expense, FuelLog, Reminder } from "@/types/models";

const MS_PER_DAY = 86_400_000;

export const SOON_KM = 500;
export const SOON_DAYS = 14;
export const MIN_DAYS_FOR_KM_ESTIMATE = 14;
export const ODOMETER_LOOKBACK_DAYS = 60;

export type ReminderStatus = "ok" | "soon" | "overdue";

export type ReminderEvaluation = {
  status: ReminderStatus;
  /** Nearest effective due moment (start of day). */
  dueAtMs: number | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
  targetOdometer: number | null;
};

export function computeDailyKmAverage(
  fuelLogs: FuelLog[],
  expenses: Expense[],
  nowMs = Date.now(),
): { dailyKm: number; dataSpanDays: number } {
  const start = nowMs - ODOMETER_LOOKBACK_DAYS * MS_PER_DAY;
  const points: { date: number; odometer: number }[] = [];

  for (const log of fuelLogs) {
    if (log.date >= start) {
      points.push({ date: log.date, odometer: log.odometer });
    }
  }
  for (const expense of expenses) {
    if (expense.odometer != null && expense.date >= start) {
      points.push({ date: expense.date, odometer: expense.odometer });
    }
  }

  if (points.length < 2) {
    return { dailyKm: 0, dataSpanDays: 0 };
  }

  points.sort((a, b) => a.date - b.date);
  const spanMs = points[points.length - 1]!.date - points[0]!.date;
  const spanDays = Math.max(1, spanMs / MS_PER_DAY);
  const minOdo = Math.min(...points.map((p) => p.odometer));
  const maxOdo = Math.max(...points.map((p) => p.odometer));

  return {
    dailyKm: (maxOdo - minOdo) / spanDays,
    dataSpanDays: spanDays,
  };
}

export function evaluateReminder(
  reminder: Reminder,
  currentOdometer: number,
  dailyKm: number,
  dataSpanDays: number,
  nowMs = Date.now(),
): ReminderEvaluation {
  const targetOdometer =
    reminder.everyKm != null
      ? reminder.lastOdometer + reminder.everyKm
      : null;

  const dateDueMs =
    reminder.everyMonths != null
      ? startOfDay(
          addMonths(new Date(reminder.lastDate), reminder.everyMonths),
        ).getTime()
      : null;

  let kmDueMs: number | null = null;
  if (
    targetOdometer != null &&
    dailyKm > 0 &&
    dataSpanDays >= MIN_DAYS_FOR_KM_ESTIMATE &&
    currentOdometer < targetOdometer
  ) {
    const daysUntil = (targetOdometer - currentOdometer) / dailyKm;
    kmDueMs = startOfDay(new Date(nowMs + daysUntil * MS_PER_DAY)).getTime();
  }

  let dueAtMs: number | null = null;
  if (dateDueMs != null && kmDueMs != null) {
    dueAtMs = Math.min(dateDueMs, kmDueMs);
  } else {
    dueAtMs = dateDueMs ?? kmDueMs;
  }

  const kmRemaining =
    targetOdometer != null
      ? Math.max(0, targetOdometer - currentOdometer)
      : null;

  const daysRemaining =
    dueAtMs != null
      ? Math.ceil((dueAtMs - startOfDay(new Date(nowMs)).getTime()) / MS_PER_DAY)
      : null;

  let status: ReminderStatus = "ok";

  const overdueByKm =
    targetOdometer != null && currentOdometer >= targetOdometer - 0.01;
  const overdueByDate =
    dateDueMs != null && nowMs > dateDueMs + MS_PER_DAY - 1;

  if (overdueByKm || overdueByDate) {
    status = "overdue";
  } else {
    const soonByKm =
      kmRemaining != null && kmRemaining <= SOON_KM && kmRemaining > 0;
    const soonByDate =
      daysRemaining != null && daysRemaining <= SOON_DAYS && daysRemaining >= 0;
    if (soonByKm || soonByDate) {
      status = "soon";
    }
  }

  return {
    status,
    dueAtMs,
    kmRemaining,
    daysRemaining,
    targetOdometer,
  };
}

export function sortRemindersByUrgency(
  items: { reminder: Reminder; evaluation: ReminderEvaluation }[],
): typeof items {
  const rank = (s: ReminderStatus) =>
    s === "overdue" ? 0 : s === "soon" ? 1 : 2;
  return [...items].sort((a, b) => {
    const r = rank(a.evaluation.status) - rank(b.evaluation.status);
    if (r !== 0) return r;
    const da = a.evaluation.dueAtMs ?? Number.MAX_SAFE_INTEGER;
    const db = b.evaluation.dueAtMs ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}
