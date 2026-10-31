export type FuelType = "petrol" | "diesel" | "lpg" | "other";

export interface Vehicle {
  id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  fuelType: FuelType;
  tankCapacity?: number;
  initialOdometer: number;
  archived: boolean;
}

export type ExpenseCategory =
  | "service"
  | "insurance"
  | "tax"
  | "fine"
  | "parking"
  | "wash"
  | "parts"
  | "other";

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: number;
  odometer: number;
  volume: number;
  pricePerUnit: number;
  totalCost: number;
  fullTank: boolean;
  note?: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  date: number;
  odometer?: number;
  category: ExpenseCategory;
  title: string;
  amount: number;
  note?: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  title: string;
  everyKm?: number;
  everyMonths?: number;
  lastOdometer: number;
  lastDate: number;
  notificationIds: string[];
}

export type DistanceUnit = "km" | "mi";
export type VolumeUnit = "l" | "gal";
export type AppLanguage = "ru" | "en";

export interface Settings {
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  currency: string;
  language: AppLanguage;
  isPremium: boolean;
  selectedVehicleId: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  distanceUnit: "km",
  volumeUnit: "l",
  currency: "RUB",
  language: "ru",
  isPremium: false,
  selectedVehicleId: null,
};

/** Schema version stored in backup JSON (future). */
export const DATA_SCHEMA_VERSION = 1;
