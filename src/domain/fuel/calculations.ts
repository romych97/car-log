import type { FuelLog } from "@/types/models";

export type FuelFieldKey = "volume" | "pricePerUnit" | "totalCost";

export type FuelFieldValues = {
  volume: number | null;
  pricePerUnit: number | null;
  totalCost: number | null;
};

export type ConsumptionInterval = {
  litersPer100km: number;
  distanceKm: number;
  volumeLiters: number;
};

/** Sync the third field from the other two; `lastEdited` is not overwritten. */
export function syncFuelFields(
  values: FuelFieldValues,
  lastEdited: FuelFieldKey,
): FuelFieldValues {
  const next = { ...values };

  const volume = next.volume;
  const price = next.pricePerUnit;
  const total = next.totalCost;

  if (lastEdited === "volume" || lastEdited === "pricePerUnit") {
    if (volume != null && volume > 0 && price != null && price > 0) {
      next.totalCost = Math.round(volume * price);
    }
    return next;
  }

  if (total != null && total > 0 && price != null && price > 0) {
    next.volume = total / price;
  } else if (total != null && total > 0 && volume != null && volume > 0) {
    next.pricePerUnit = Math.round(total / volume);
  }

  return next;
}

export function sortFuelLogsChronological(logs: FuelLog[]): FuelLog[] {
  return [...logs].sort(
    (a, b) => a.date - b.date || a.odometer - b.odometer || a.id.localeCompare(b.id),
  );
}

/** L/100 km between consecutive full-tank refills. */
export function computeConsumptionIntervals(
  logs: FuelLog[],
): ConsumptionInterval[] {
  const sorted = sortFuelLogsChronological(logs);
  const fullIndices: number[] = [];
  sorted.forEach((log, index) => {
    if (log.fullTank) fullIndices.push(index);
  });

  const intervals: ConsumptionInterval[] = [];

  for (let f = 1; f < fullIndices.length; f++) {
    const prevIdx = fullIndices[f - 1]!;
    const currIdx = fullIndices[f]!;
    const prev = sorted[prevIdx]!;
    const curr = sorted[currIdx]!;
    const distanceKm = curr.odometer - prev.odometer;
    if (distanceKm <= 0) continue;

    let volumeLiters = 0;
    for (let j = prevIdx + 1; j <= currIdx; j++) {
      volumeLiters += sorted[j]!.volume;
    }

    intervals.push({
      litersPer100km: (volumeLiters / distanceKm) * 100,
      distanceKm,
      volumeLiters,
    });
  }

  return intervals;
}

/** Weighted average L/100 km over the last `count` intervals. */
export function averageConsumptionLastN(
  intervals: ConsumptionInterval[],
  count = 5,
): number | null {
  if (intervals.length === 0) return null;
  const slice = intervals.slice(-count);
  const totalVolume = slice.reduce((s, i) => s + i.volumeLiters, 0);
  const totalDistance = slice.reduce((s, i) => s + i.distanceKm, 0);
  if (totalDistance <= 0) return null;
  return (totalVolume / totalDistance) * 100;
}

/** Volume-weighted average price per liter (minor currency units). */
export function weightedAveragePricePerLiter(logs: FuelLog[]): number | null {
  let totalVolume = 0;
  let weightedSum = 0;
  for (const log of logs) {
    if (log.volume <= 0) continue;
    totalVolume += log.volume;
    weightedSum += log.volume * log.pricePerUnit;
  }
  if (totalVolume <= 0) return null;
  return Math.round(weightedSum / totalVolume);
}

export const MAX_ODOMETER_JUMP_KM = 2000;
