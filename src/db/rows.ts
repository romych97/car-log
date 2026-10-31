import type { AppThemeMode } from "@/theme/colors";
import type {
  AppLanguage,
  DistanceUnit,
  FuelLog,
  FuelType,
  Expense,
  ExpenseCategory,
  Settings,
  Vehicle,
  VolumeUnit,
  Reminder,
} from "@/types/models";

export type VehicleRow = {
  id: string;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  fuel_type: string;
  tank_capacity: number | null;
  initial_odometer: number;
  archived: number;
};

export type SettingsRow = {
  id: number;
  distance_unit: string;
  volume_unit: string;
  currency: string;
  language: string;
  theme?: string | null;
  is_premium: number;
  selected_vehicle_id: string | null;
};

function parseThemeMode(raw: string | null | undefined): AppThemeMode {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

export type ReminderRow = {
  id: string;
  vehicle_id: string;
  title: string;
  every_km: number | null;
  every_months: number | null;
  last_odometer: number;
  last_date: number;
  notification_ids: string;
};

function parseNotificationIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    title: row.title,
    everyKm: row.every_km ?? undefined,
    everyMonths: row.every_months ?? undefined,
    lastOdometer: row.last_odometer,
    lastDate: row.last_date,
    notificationIds: parseNotificationIds(row.notification_ids),
  };
}

export type FuelLogRow = {
  id: string;
  vehicle_id: string;
  date: number;
  odometer: number;
  volume: number;
  price_per_unit: number;
  total_cost: number;
  full_tank: number;
  note: string | null;
};

export function rowToFuelLog(row: FuelLogRow): FuelLog {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    odometer: row.odometer,
    volume: row.volume,
    pricePerUnit: row.price_per_unit,
    totalCost: row.total_cost,
    fullTank: row.full_tank !== 0,
    note: row.note ?? undefined,
  };
}

export type ExpenseRow = {
  id: string;
  vehicle_id: string;
  date: number;
  odometer: number | null;
  category: string;
  title: string;
  amount: number;
  note: string | null;
};

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    odometer: row.odometer ?? undefined,
    category: row.category as ExpenseCategory,
    title: row.title,
    amount: row.amount,
    note: row.note ?? undefined,
  };
}

export function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    make: row.make ?? undefined,
    model: row.model ?? undefined,
    year: row.year ?? undefined,
    fuelType: row.fuel_type as FuelType,
    tankCapacity: row.tank_capacity ?? undefined,
    initialOdometer: row.initial_odometer,
    archived: row.archived !== 0,
  };
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    distanceUnit: row.distance_unit as DistanceUnit,
    volumeUnit: row.volume_unit as VolumeUnit,
    currency: row.currency,
    language: row.language as AppLanguage,
    themeMode: parseThemeMode(row.theme),
    isPremium: row.is_premium !== 0,
    selectedVehicleId: row.selected_vehicle_id,
  };
}
