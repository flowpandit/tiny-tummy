import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  Schedule,
  ScheduleEvery,
  cancel,
  pending,
} from "@tauri-apps/plugin-notification";
import * as db from "./db";

const REMINDER_ID = 1;
const SETTING_KEY = "daily_reminder";

export async function isDailyReminderEnabled(): Promise<boolean> {
  const val = await db.getSetting(SETTING_KEY);
  return val === "true";
}

export async function enableDailyReminder(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }

  if (!granted) return false;

  // Cancel any existing reminder first
  await cancelDailyReminder();

  // Schedule daily notification
  sendNotification({
    title: "Tiny Tummy",
    body: "Time for a quick check-in! How's your little one doing today?",
    id: REMINDER_ID,
    schedule: Schedule.every(ScheduleEvery.Day, 1, true),
  });

  await db.setSetting(SETTING_KEY, "true");
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    const pendingNotifs = await pending();
    const existing = pendingNotifs.find((n) => n.id === REMINDER_ID);
    if (existing) {
      await cancel([REMINDER_ID]);
    }
  } catch {
    // Ignore errors if no pending notifications
  }
  await db.setSetting(SETTING_KEY, "false");
}
