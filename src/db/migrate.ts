import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_VERSION = 2;

const SCHEMA_V1 = `
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  fuel_type TEXT NOT NULL,
  tank_capacity REAL,
  initial_odometer REAL NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fuel_logs (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  date INTEGER NOT NULL,
  odometer REAL NOT NULL,
  volume REAL NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_cost INTEGER NOT NULL,
  full_tank INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  date INTEGER NOT NULL,
  odometer REAL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  title TEXT NOT NULL,
  every_km REAL,
  every_months INTEGER,
  last_odometer REAL NOT NULL,
  last_date INTEGER NOT NULL,
  notification_ids TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  distance_unit TEXT NOT NULL DEFAULT 'km',
  volume_unit TEXT NOT NULL DEFAULT 'l',
  currency TEXT NOT NULL DEFAULT 'RUB',
  language TEXT NOT NULL DEFAULT 'ru',
  theme TEXT NOT NULL DEFAULT 'system',
  is_premium INTEGER NOT NULL DEFAULT 0,
  selected_vehicle_id TEXT
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_date ON fuel_logs (vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_date ON expenses (vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders (vehicle_id);
`;

async function appSettingsHasColumn(
  db: SQLiteDatabase,
  column: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(app_settings)",
  );
  return rows.some((row) => row.name === column);
}

/** Idempotent — fixes DBs where user_version was bumped without ALTER (dev builds). */
async function ensureAppSettingsThemeColumn(db: SQLiteDatabase): Promise<void> {
  if (await appSettingsHasColumn(db, "theme")) {
    return;
  }
  await db.execAsync(
    `ALTER TABLE app_settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'`,
  );
}

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion === 0) {
    await db.execAsync(SCHEMA_V1);
    currentVersion = 1;
  }

  await ensureAppSettingsThemeColumn(db);

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
