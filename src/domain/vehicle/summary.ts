import { startOfMonth } from "date-fns";

import type { Expense, FuelLog } from "@/types/models";

const MS_PER_DAY = 86_400_000;

export type PeriodSummary = {
  totalCostMinor: number;
  distanceKm: number;
  costPerKmMinor: number | null;
  monthCostMinor: number;
};

export function computePeriodSummary(
  fuelLogs: FuelLog[],
  expenses: Expense[],
  periodDays = 30,
  nowMs = Date.now(),
): PeriodSummary {
  const periodStart = nowMs - periodDays * MS_PER_DAY;
  const monthStart = startOfMonth(new Date(nowMs)).getTime();

  let fuelCost = 0;
  let expenseCost = 0;
  let monthCost = 0;
  const odometers: number[] = [];

  for (const log of fuelLogs) {
    if (log.date >= periodStart) {
      fuelCost += log.totalCost;
      odometers.push(log.odometer);
    }
    if (log.date >= monthStart) {
      monthCost += log.totalCost;
    }
  }

  for (const expense of expenses) {
    if (expense.date >= periodStart) {
      expenseCost += expense.amount;
    }
    if (expense.date >= monthStart) {
      monthCost += expense.amount;
    }
    if (expense.odometer != null && expense.date >= periodStart) {
      odometers.push(expense.odometer);
    }
  }

  const distanceKm =
    odometers.length >= 2
      ? Math.max(...odometers) - Math.min(...odometers)
      : 0;
  const totalCostMinor = fuelCost + expenseCost;

  return {
    totalCostMinor,
    distanceKm,
    costPerKmMinor:
      distanceKm > 0 ? Math.round(totalCostMinor / distanceKm) : null,
    monthCostMinor: monthCost,
  };
}
