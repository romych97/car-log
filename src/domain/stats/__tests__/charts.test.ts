import { buildMonthlySpendSeries, expensesByCategory } from "@/domain/stats/charts";
import type { Expense, FuelLog } from "@/types/models";

describe("buildMonthlySpendSeries", () => {
  const now = new Date("2026-10-15T12:00:00Z").getTime();

  it("sums fuel and expenses per calendar month", () => {
    const monthStart = new Date("2026-10-01T00:00:00").getTime();
    const fuelLogs: FuelLog[] = [
      {
        id: "1",
        vehicleId: "v",
        date: monthStart + 86400000,
        odometer: 1000,
        volume: 40,
        pricePerUnit: 5000,
        totalCost: 200_000,
        fullTank: true,
      },
    ];
    const expenses: Expense[] = [
      {
        id: "e1",
        vehicleId: "v",
        date: monthStart + 2 * 86400000,
        category: "wash",
        title: "Wash",
        amount: 50_000,
      },
    ];

    const series = buildMonthlySpendSeries(fuelLogs, expenses, 1, now, "en");
    expect(series).toHaveLength(1);
    expect(series[0]!.fuelMinor).toBe(200_000);
    expect(series[0]!.expenseMinor).toBe(50_000);
    expect(series[0]!.totalMinor).toBe(250_000);
  });
});

describe("expensesByCategory", () => {
  it("aggregates by category in period", () => {
    const now = Date.now();
    const expenses: Expense[] = [
      {
        id: "1",
        vehicleId: "v",
        date: now - 10 * 86400000,
        category: "service",
        title: "A",
        amount: 100,
      },
      {
        id: "2",
        vehicleId: "v",
        date: now - 5 * 86400000,
        category: "service",
        title: "B",
        amount: 50,
      },
      {
        id: "3",
        vehicleId: "v",
        date: now - 400 * 86400000,
        category: "tax",
        title: "Old",
        amount: 999,
      },
    ];
    const rows = expensesByCategory(expenses, 30, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.category).toBe("service");
    expect(rows[0]!.amountMinor).toBe(150);
  });
});
