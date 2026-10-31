import { addDays, setHours, setMilliseconds, setMinutes, setSeconds } from "date-fns";
import * as Notifications from "expo-notifications";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import {
  listAllReminders,
  updateReminder,
} from "@/db/repositories/reminders";
import { getCurrentOdometer, getVehicleById } from "@/db/repositories/vehicles";
import {
  computeDailyKmAverage,
  evaluateReminder,
} from "@/domain/reminders/status";
import type { AppLanguage, Reminder } from "@/types/models";

import {
  ensureReminderNotificationChannel,
  reminderChannelIdForScheduling,
} from "./setup";

function atTenAm(dayMs: number): Date {
  const d = new Date(dayMs);
  return setMilliseconds(
    setSeconds(setMinutes(setHours(d, 10), 0), 0),
    0,
  );
}

export async function requestReminderPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    await ensureReminderNotificationChannel();
  } catch {
    // ensureReminderNotificationChannel already logs; permissions may still work.
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function cancelReminderNotifications(
  ids: string[],
): Promise<void> {
  if (Platform.OS === "web" || ids.length === 0) {
    return;
  }
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
}

type NotificationCopy = {
  soonTitle: string;
  soonBody: (title: string) => string;
  dueTitle: string;
  dueBody: (title: string) => string;
};

function notificationCopy(language: AppLanguage): NotificationCopy {
  if (language === "ru") {
    return {
      soonTitle: "Скоро ТО",
      soonBody: (title) => `Через неделю: ${title}`,
      dueTitle: "Напоминание ТО",
      dueBody: (title) => `Пора: ${title}`,
    };
  }
  return {
    soonTitle: "Service soon",
    soonBody: (title) => `In one week: ${title}`,
    dueTitle: "Service reminder",
    dueBody: (title) => `Due: ${title}`,
  };
}

export async function scheduleReminderNotifications(
  reminder: Reminder,
  dueAtMs: number | null,
  language: AppLanguage,
): Promise<string[]> {
  if (Platform.OS === "web" || dueAtMs == null) {
    return [];
  }
  try {
    await ensureReminderNotificationChannel();
  } catch {
    // continue with default channel
  }
  const copy = notificationCopy(language);
  const now = Date.now();
  const ids: string[] = [];
  const androidChannelId = reminderChannelIdForScheduling();

  const soonDate = atTenAm(addDays(new Date(dueAtMs), -7).getTime());
  const dueDate = atTenAm(dueAtMs);

  if (soonDate.getTime() > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.soonTitle,
        body: copy.soonBody(reminder.title),
        data: { reminderId: reminder.id, kind: "soon" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: soonDate,
      },
      ...(androidChannelId ? { channelId: androidChannelId } : {}),
    });
    ids.push(id);
  }

  if (dueDate.getTime() > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.dueTitle,
        body: copy.dueBody(reminder.title),
        data: { reminderId: reminder.id, kind: "due" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueDate,
      },
      ...(androidChannelId ? { channelId: androidChannelId } : {}),
    });
    ids.push(id);
  }

  return ids;
}

export async function syncReminderNotifications(
  db: SQLiteDatabase,
  reminder: Reminder,
  currentOdometer: number,
  dailyKm: number,
  dataSpanDays: number,
  language: AppLanguage,
): Promise<Reminder> {
  await cancelReminderNotifications(reminder.notificationIds);
  const evaluation = evaluateReminder(
    reminder,
    currentOdometer,
    dailyKm,
    dataSpanDays,
  );
  const newIds = await scheduleReminderNotifications(
    reminder,
    evaluation.dueAtMs,
    language,
  );
  const updated: Reminder = { ...reminder, notificationIds: newIds };
  await updateReminder(db, updated);
  return updated;
}

export async function syncVehicleReminderNotifications(
  db: SQLiteDatabase,
  vehicleId: string,
  reminders: Reminder[],
  language: AppLanguage,
): Promise<void> {
  const vehicle = await getVehicleById(db, vehicleId);
  if (!vehicle) {
    return;
  }
  const odometer = await getCurrentOdometer(
    db,
    vehicleId,
    vehicle.initialOdometer,
  );
  const [fuelLogs, expenses] = await Promise.all([
    listFuelLogsByVehicle(db, vehicleId),
    listExpensesByVehicle(db, vehicleId),
  ]);
  const { dailyKm, dataSpanDays } = computeDailyKmAverage(fuelLogs, expenses);

  for (const reminder of reminders) {
    await syncReminderNotifications(
      db,
      reminder,
      odometer,
      dailyKm,
      dataSpanDays,
      language,
    );
  }
}

export async function syncAllReminderNotifications(
  db: SQLiteDatabase,
  language: AppLanguage,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  const all = await listAllReminders(db);
  const byVehicle = new Map<string, Reminder[]>();
  for (const r of all) {
    const list = byVehicle.get(r.vehicleId) ?? [];
    list.push(r);
    byVehicle.set(r.vehicleId, list);
  }
  for (const [vehicleId, reminders] of byVehicle) {
    await syncVehicleReminderNotifications(db, vehicleId, reminders, language);
  }
}
