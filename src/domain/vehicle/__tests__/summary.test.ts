import { computePeriodSummary } from "@/domain/vehicle/summary";
import type { Expense, FuelLog } from "@/types/models";

describe("computePeriodSummary", () => {
  it("computes cost per km from fuel and expenses in period", () => {
    const now = new Date("2026-10-31").getTime();
    const fuelLogs: FuelLog[] = [
      {
        id: "1",
        vehicleId: "v",
        date: now - 5 * 86400000,
        odometer: 1000,
        volume: 40,
        pricePerUnit: 5000,
        totalCost: 200000,
        fullTank: true,
      },
      {
        id: "2",
        vehicleId: "v",
        date: now - 2 * 86400000,
        odometer: 1500,
        volume: 35,
        pricePerUnit: 5000,
        totalCost: 175000,
        fullTank: true,
      },
    ];
    const expenses: Expense[] = [
      {
        id: "e1",
        vehicleId: "v",
        date: now - 3 * 86400000,
        amount: 50000,
        category: "wash",
        title: "Wash",
      },
    ];
    const summary = computePeriodSummary(fuelLogs, expenses, 30, now);
    expect(summary.distanceKm).toBe(500);
    expect(summary.totalCostMinor).toBe(425000);
    expect(summary.costPerKmMinor).toBe(850);
  });
});
