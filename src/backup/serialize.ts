import type { CarLogBackup } from "@/types/backup";
import { DATA_SCHEMA_VERSION } from "@/types/models";

export function normalizeBackupRaw(raw: string): string {
  return raw.replace(/^\uFEFF/, "").trim();
}

export function parseBackupJson(raw: string): CarLogBackup {
  const parsed = JSON.parse(normalizeBackupRaw(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_json");
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.app !== "carlog") {
    throw new Error("wrong_app");
  }
  if (obj.schemaVersion !== DATA_SCHEMA_VERSION) {
    throw new Error("unsupported_schema");
  }
  if (
    !Array.isArray(obj.vehicles) ||
    !Array.isArray(obj.fuelLogs) ||
    !Array.isArray(obj.expenses) ||
    !Array.isArray(obj.reminders) ||
    !obj.settings ||
    typeof obj.settings !== "object"
  ) {
    throw new Error("invalid_shape");
  }
  return obj as CarLogBackup;
}
