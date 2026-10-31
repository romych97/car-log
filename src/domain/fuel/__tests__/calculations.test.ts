import {
  averageConsumptionLastN,
  computeConsumptionIntervals,
  syncFuelFields,
  weightedAveragePricePerLiter,
} from "@/domain/fuel/calculations";
import type { FuelLog } from "@/types/models";

function fuel(partial: Partial<FuelLog> & Pick<FuelLog, "odometer" | "volume">): FuelLog {
  return {
    id: partial.id ?? "1",
    vehicleId: "v1",
    date: partial.date ?? 0,
    odometer: partial.odometer,
    volume: partial.volume,
    pricePerUnit: partial.pricePerUnit ?? 5000,
    totalCost: partial.totalCost ?? Math.round(partial.volume * 5000),
    fullTank: partial.fullTank ?? true,
    note: partial.note,
  };
}

describe("syncFuelFields", () => {
  it("computes total from volume and price", () => {
    const result = syncFuelFields(
      { volume: 40, pricePerUnit: 5500, totalCost: null },
      "volume",
    );
    expect(result.totalCost).toBe(220000);
    expect(result.volume).toBe(40);
  });

  it("computes volume from total and price when total edited", () => {
    const result = syncFuelFields(
      { volume: null, pricePerUnit: 5000, totalCost: 250000 },
      "totalCost",
    );
    expect(result.volume).toBe(50);
  });

  it("computes price from total and volume when total edited", () => {
    const result = syncFuelFields(
      { volume: 25, pricePerUnit: null, totalCost: 125000 },
      "totalCost",
    );
    expect(result.pricePerUnit).toBe(5000);
  });
});

describe("computeConsumptionIntervals", () => {
  it("uses only intervals between full tanks", () => {
    const logs: FuelLog[] = [
      fuel({ id: "a", date: 1, odometer: 1000, volume: 40, fullTank: true }),
      fuel({ id: "b", date: 2, odometer: 1500, volume: 20, fullTank: false }),
      fuel({ id: "c", date: 3, odometer: 1500, volume: 25, fullTank: true }),
    ];
    const intervals = computeConsumptionIntervals(logs);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]!.distanceKm).toBe(500);
    expect(intervals[0]!.volumeLiters).toBe(45);
    expect(intervals[0]!.litersPer100km).toBeCloseTo(9, 5);
  });

  it("ignores partial fill-only logs for interval count", () => {
    const logs: FuelLog[] = [
      fuel({ id: "a", date: 1, odometer: 0, volume: 10, fullTank: false }),
    ];
    expect(computeConsumptionIntervals(logs)).toHaveLength(0);
  });
});

describe("averageConsumptionLastN", () => {
  it("averages by total volume over total distance", () => {
    const intervals = [
      { litersPer100km: 10, distanceKm: 100, volumeLiters: 10 },
      { litersPer100km: 8, distanceKm: 100, volumeLiters: 8 },
    ];
    expect(averageConsumptionLastN(intervals, 5)).toBeCloseTo(9, 5);
  });
});

describe("weightedAveragePricePerLiter", () => {
  it("weights by volume", () => {
    const logs: FuelLog[] = [
      fuel({ odometer: 1, volume: 10, pricePerUnit: 5000 }),
      fuel({ odometer: 2, volume: 30, pricePerUnit: 6000 }),
    ];
    expect(weightedAveragePricePerLiter(logs)).toBe(5750);
  });
});
