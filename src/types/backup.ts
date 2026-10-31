import type { Expense, FuelLog, Reminder, Settings, Vehicle } from "@/types/models";

export type CarLogBackup = {
  schemaVersion: number;
  exportedAt: number;
  app: "carlog";
  settings: Omit<Settings, "selectedVehicleId"> & {
    selectedVehicleId?: string | null;
  };
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  expenses: Expense[];
  reminders: Reminder[];
};
