import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REMINDER_CHANNEL_ID = "carlog-reminders";

let handlerConfigured = false;

/** Avoid repeated native channel calls after a known failure (Expo Go / serializer bugs). */
let channelSetupState: "pending" | "ready" | "unavailable" = "pending";

export function configureNotificationHandler(): void {
  if (handlerConfigured || Platform.OS === "web") {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

export function reminderChannelIdForScheduling(): string | undefined {
  if (Platform.OS !== "android") {
    return undefined;
  }
  return channelSetupState === "ready" ? REMINDER_CHANNEL_ID : undefined;
}

export async function ensureReminderNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  if (channelSetupState === "ready" || channelSetupState === "unavailable") {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Maintenance reminders",
      importance: AndroidImportance.DEFAULT,
    });
    channelSetupState = "ready";
  } catch (error) {
    channelSetupState = "unavailable";
    console.warn(
      "[carlog] Notification channel setup failed; using system default channel.",
      error,
    );
  }
}
