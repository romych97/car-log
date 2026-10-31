import { format, startOfMonth, subMonths } from "date-fns";
import { enUS, ru } from "date-fns/locale";

import type { ConsumptionInterval } from "@/domain/fuel/calculations";
import type { AppLanguage, Expense, ExpenseCategory, FuelLog } from "@/types/models";

const MS_PER_DAY = 86_400_000;

export type MonthSpendPoint = {
  key: string;
  label: string;
  monthStart: number;
  totalMinor: number;
  fuelMinor: number;
  expenseMinor: number;
};

export function buildMonthlySpendSeries(
  fuelLogs: FuelLog[],
  expenses: Expense[],
  months = 6,
  nowMs = Date.now(),
  language: AppLanguage = "ru",
): MonthSpendPoint[] {
  const locale = language === "ru" ? ru : enUS;
  const points: MonthSpendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(nowMs), i)).getTime();
    const monthEnd = startOfMonth(subMonths(new Date(nowMs), i - 1)).getTime();

    let fuelMinor = 0;
    let expenseMinor = 0;
    for (const log of fuelLogs) {
      if (log.date >= monthStart && log.date < monthEnd) {
        fuelMinor += log.totalCost;
      }
    }
    for (const expense of expenses) {
      if (expense.date >= monthStart && expense.date < monthEnd) {
        expenseMinor += expense.amount;
      }
    }

    points.push({
      key: String(monthStart),
      label: format(monthStart, "LLL", { locale }),
      monthStart,
      fuelMinor,
      expenseMinor,
      totalMinor: fuelMinor + expenseMinor,
    });
  }

  return points;
}

export type CategorySpend = {
  category: ExpenseCategory;
  amountMinor: number;
};

export function expensesByCategory(
  expenses: Expense[],
  periodDays = 365,
  nowMs = Date.now(),
): CategorySpend[] {
  const start = nowMs - periodDays * MS_PER_DAY;
  const totals = new Map<ExpenseCategory, number>();

  for (const expense of expenses) {
    if (expense.date < start) continue;
    totals.set(
      expense.category,
      (totals.get(expense.category) ?? 0) + expense.amount,
    );
  }

  return [...totals.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export type ConsumptionChartPoint = {
  label: string;
  value: number;
};

export function consumptionChartPoints(
  intervals: ConsumptionInterval[],
  maxPoints = 8,
): ConsumptionChartPoint[] {
  const slice = intervals.slice(-maxPoints);
  return slice.map((interval, index) => ({
    label: String(index + 1),
    value: Math.round(interval.litersPer100km * 10) / 10,
  }));
}
