export type ReminderTemplateId =
  | "oil"
  | "airFilter"
  | "brakeFluid"
  | "antifreeze"
  | "timing"
  | "tires"
  | "insurance"
  | "inspection";

export type ReminderTemplate = {
  id: ReminderTemplateId;
  everyKm?: number;
  everyMonths?: number;
};

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  { id: "oil", everyKm: 10_000, everyMonths: 12 },
  { id: "airFilter", everyKm: 15_000, everyMonths: 12 },
  { id: "brakeFluid", everyMonths: 24 },
  { id: "antifreeze", everyKm: 60_000, everyMonths: 36 },
  { id: "timing", everyKm: 60_000, everyMonths: 60 },
  { id: "tires", everyMonths: 6 },
  { id: "insurance", everyMonths: 12 },
  { id: "inspection", everyMonths: 12 },
];

export const FREE_REMINDER_LIMIT = 3;
