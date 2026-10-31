import type { DistanceUnit, VolumeUnit } from "@/types/models";

/** US liquid gallon */
export const LITERS_PER_GALLON = 3.785_411_784;
export const KM_PER_MILE = 1.609_344;

export function kmToDisplay(km: number, unit: DistanceUnit): number {
  return unit === "mi" ? km / KM_PER_MILE : km;
}

export function kmFromDisplay(value: number, unit: DistanceUnit): number {
  return unit === "mi" ? value * KM_PER_MILE : value;
}

export function litersToDisplay(l: number, unit: VolumeUnit): number {
  return unit === "gal" ? l / LITERS_PER_GALLON : l;
}

export function litersFromDisplay(value: number, unit: VolumeUnit): number {
  return unit === "gal" ? value * LITERS_PER_GALLON : value;
}

/** Minor currency units per liter → minor per display unit (L or gal). */
export function priceMinorPerLiterToDisplay(
  minorPerLiter: number,
  volumeUnit: VolumeUnit,
): number {
  return volumeUnit === "gal"
    ? minorPerLiter * LITERS_PER_GALLON
    : minorPerLiter;
}

export function priceMinorPerLiterFromDisplay(
  minorPerDisplayUnit: number,
  volumeUnit: VolumeUnit,
): number {
  return volumeUnit === "gal"
    ? minorPerDisplayUnit / LITERS_PER_GALLON
    : minorPerDisplayUnit;
}

/** US mpg from L/100 km */
export function litersPer100KmToMpg(l100: number): number {
  if (l100 <= 0) return 0;
  return 235.214_583 / l100;
}

export function formatDistanceValue(km: number, unit: DistanceUnit): string {
  const v = kmToDisplay(km, unit);
  return Math.round(v).toLocaleString();
}

export function formatVolumeValue(liters: number, unit: VolumeUnit): string {
  const v = litersToDisplay(liters, unit);
  return (Math.round(v * 100) / 100).toLocaleString();
}
