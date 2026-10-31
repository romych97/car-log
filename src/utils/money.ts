/** Parse user decimal string to minor units (kopecks). */
export function parseMoneyToMinor(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Minor units → display with 2 decimals. */
export function formatMoneyMinor(minor: number, locale = "ru-RU"): string {
  return (minor / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Price per liter in major units for input display. */
export function formatPricePerLiterMinor(minorPerLiter: number, locale = "ru-RU"): string {
  return (minorPerLiter / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

export function parseDecimal(input: string): number | null {
  const trimmed = input.trim().replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
