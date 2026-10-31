import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";
import { format } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { Platform } from "react-native";

import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { getSettings } from "@/db/repositories/settings";
import { getVehicleById, getCurrentOdometer } from "@/db/repositories/vehicles";
import { computeConsumptionIntervals } from "@/domain/fuel/calculations";
import { buildMonthlySpendSeries, expensesByCategory } from "@/domain/stats/charts";
import { computePeriodSummary } from "@/domain/vehicle/summary";
import { copyToShareCache, writeBase64ToShareCache } from "@/share/prepareShareUri";
import {
  formatDistanceValue,
  formatVolumeValue,
  litersPer100KmToMpg,
} from "@/utils/units";
import { formatMoneyMinor } from "@/utils/money";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pdfFileName(vehicleName: string): string {
  const safe = vehicleName.replace(/[^\w\u0400-\u04FF-]+/gi, "_").slice(0, 40);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `carlog-report-${safe || "vehicle"}-${stamp}.pdf`;
}

export async function exportVehiclePdfReport(
  db: SQLiteDatabase,
  vehicleId: string,
): Promise<void> {
  const settings = await getSettings(db);
  const vehicle = await getVehicleById(db, vehicleId);
  if (!vehicle) {
    throw new Error("no_vehicle");
  }

  const language = settings.language;
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const dateLocale = language === "ru" ? ru : enUS;
  const distanceUnit = settings.distanceUnit;
  const volumeUnit = settings.volumeUnit;
  const distLabel = distanceUnit === "mi" ? "mi" : "km";
  const volLabel = volumeUnit === "gal" ? "gal" : "L";

  const [fuelLogs, expenses] = await Promise.all([
    listFuelLogsByVehicle(db, vehicleId),
    listExpensesByVehicle(db, vehicleId),
  ]);

  const summary = computePeriodSummary(fuelLogs, expenses);
  const odometerKm = await getCurrentOdometer(
    db,
    vehicleId,
    vehicle.initialOdometer,
  );
  const monthly = buildMonthlySpendSeries(fuelLogs, expenses, 6, undefined, language);
  const categories = expensesByCategory(expenses, 365);
  const intervals = computeConsumptionIntervals(fuelLogs);
  const lastConsumption = intervals.at(-1)?.litersPer100km ?? null;

  let consumptionLine = "—";
  if (lastConsumption != null) {
    if (distanceUnit === "mi" && volumeUnit === "gal") {
      consumptionLine = `${litersPer100KmToMpg(lastConsumption).toFixed(1)} mpg`;
    } else {
      consumptionLine = `${lastConsumption.toFixed(1)} L/100 km`;
    }
  }

  const odometerDisplay = `${formatDistanceValue(odometerKm, distanceUnit)} ${distLabel}`;

  const rows = monthly
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.label)}</td><td>${formatMoneyMinor(m.totalMinor, locale)}</td></tr>`,
    )
    .join("");

  const catRows = categories
    .slice(0, 8)
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.category)}</td><td>${formatMoneyMinor(c.amountMinor, locale)}</td></tr>`,
    )
    .join("");

  const title = language === "ru" ? "Отчёт CarLog" : "CarLog report";
  const generated = format(Date.now(), "PPP", { locale: dateLocale });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 22px; }
  h2 { font-size: 16px; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td, th { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
  .meta { color: #555; font-size: 14px; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(vehicle.name)} · ${escapeHtml(generated)}</p>
  <p><strong>${language === "ru" ? "Пробег" : "Odometer"}:</strong> ${odometerDisplay}</p>
  <p><strong>${language === "ru" ? "Расход топлива" : "Fuel consumption"}:</strong> ${consumptionLine}</p>
  <p><strong>${language === "ru" ? "За месяц" : "This month"}:</strong> ${formatMoneyMinor(summary.monthCostMinor, locale)}</p>
  <p><strong>${language === "ru" ? "Заправок (объём)" : "Fuel volume"}:</strong> ${
    fuelLogs.length
  } · ${formatVolumeValue(
    fuelLogs.reduce((s, l) => s + l.volume, 0),
    volumeUnit,
  )} ${volLabel}</p>
  <h2>${language === "ru" ? "По месяцам" : "Monthly spend"}</h2>
  <table><thead><tr><th>${language === "ru" ? "Месяц" : "Month"}</th><th>${settings.currency}</th></tr></thead><tbody>${rows || `<tr><td colspan="2">—</td></tr>`}</tbody></table>
  <h2>${language === "ru" ? "Категории (12 мес.)" : "Categories (12 mo.)"}</h2>
  <table><thead><tr><th>${language === "ru" ? "Категория" : "Category"}</th><th>${settings.currency}</th></tr></thead><tbody>${catRows || `<tr><td colspan="2">—</td></tr>`}</tbody></table>
</body>
</html>`;

  const fileName = pdfFileName(vehicle.name);
  const printResult = await Print.printToFileAsync({ html, base64: true });

  if (Platform.OS === "web") {
    window.open(printResult.uri, "_blank");
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("sharing_unavailable");
  }

  const shareUri = printResult.base64
    ? await writeBase64ToShareCache(printResult.base64, fileName)
    : await copyToShareCache(printResult.uri, fileName);
  const dialogTitle = `${vehicle.name} — CarLog`;

  await Sharing.shareAsync(shareUri, {
    mimeType: "application/pdf",
    dialogTitle,
    UTI: "com.adobe.pdf",
  });
}
