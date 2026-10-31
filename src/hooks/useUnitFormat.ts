import { useMemo } from "react";

import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import {
  formatDistanceValue,
  formatVolumeValue,
  kmFromDisplay,
  kmToDisplay,
  litersFromDisplay,
  litersPer100KmToMpg,
  litersToDisplay,
  priceMinorPerLiterFromDisplay,
  priceMinorPerLiterToDisplay,
} from "@/utils/units";
import { formatPricePerLiterMinor, parseMoneyToMinor } from "@/utils/money";

export function useUnitFormat() {
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const strings = useMemo(() => t(language), [language]);
  const locale = language === "ru" ? "ru-RU" : "en-US";

  return useMemo(() => {
    const distanceLabel =
      distanceUnit === "mi" ? strings.units.mi : strings.common.km;
    const volumeLabel =
      volumeUnit === "gal" ? strings.units.gal : strings.units.liter;
    const consumptionLabel =
      distanceUnit === "mi" && volumeUnit === "gal"
        ? strings.units.mpg
        : strings.common.l100km;

    return {
      distanceUnit,
      volumeUnit,
      distanceLabel,
      volumeLabel,
      consumptionLabel,
      formatDistance(km: number) {
        return `${formatDistanceValue(km, distanceUnit)} ${distanceLabel}`;
      },
      formatDistanceInput(km: number) {
        const v = kmToDisplay(km, distanceUnit);
        return String(Math.round(v));
      },
      parseDistanceInput(text: string): number | null {
        const n = Number(text.replace(",", ".").trim());
        if (!Number.isFinite(n) || n < 0) return null;
        return kmFromDisplay(n, distanceUnit);
      },
      formatVolume(liters: number) {
        return `${formatVolumeValue(liters, volumeUnit)} ${volumeLabel}`;
      },
      formatVolumeInput(liters: number) {
        const v = litersToDisplay(liters, volumeUnit);
        return String(Math.round(v * 100) / 100);
      },
      parseVolumeInput(text: string): number | null {
        const n = Number(text.replace(",", ".").trim());
        if (!Number.isFinite(n) || n <= 0) return null;
        return litersFromDisplay(n, volumeUnit);
      },
      formatPricePerVolumeMinor(minorPerLiter: number) {
        const minor = priceMinorPerLiterToDisplay(minorPerLiter, volumeUnit);
        return formatPricePerLiterMinor(minor, locale);
      },
      parsePricePerVolumeInput(text: string): number | null {
        const minor = parseMoneyToMinor(text);
        if (minor == null || minor <= 0) return null;
        return priceMinorPerLiterFromDisplay(minor, volumeUnit);
      },
      formatConsumption(l100km: number | null) {
        if (l100km == null) return "—";
        if (distanceUnit === "mi" && volumeUnit === "gal") {
          return `${litersPer100KmToMpg(l100km).toFixed(1)} ${consumptionLabel}`;
        }
        return `${l100km.toFixed(1)} ${consumptionLabel}`;
      },
      chartConsumptionValue(l100km: number) {
        if (distanceUnit === "mi" && volumeUnit === "gal") {
          return Math.round(litersPer100KmToMpg(l100km) * 10) / 10;
        }
        return Math.round(l100km * 10) / 10;
      },
      formatTankCapacityInput(liters: number | undefined) {
        if (liters == null) return "";
        return String(Math.round(litersToDisplay(liters, volumeUnit) * 10) / 10);
      },
      parseTankCapacityInput(text: string): number | undefined {
        const trimmed = text.trim();
        if (!trimmed) return undefined;
        const n = Number(trimmed.replace(",", "."));
        if (!Number.isFinite(n) || n <= 0) return undefined;
        return litersFromDisplay(n, volumeUnit);
      },
    };
  }, [
    distanceUnit,
    volumeUnit,
    strings.common.km,
    strings.common.l100km,
    strings.units.gal,
    strings.units.liter,
    strings.units.mi,
    strings.units.mpg,
    locale,
  ]);
}
