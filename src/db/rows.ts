import type {
  AppLanguage,
  DistanceUnit,
  FuelType,
  Settings,
  Vehicle,
  VolumeUnit,
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
  is_premium: number;
  selected_vehicle_id: string | null;
};

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
    isPremium: row.is_premium !== 0,
    selectedVehicleId: row.selected_vehicle_id,
  };
}
