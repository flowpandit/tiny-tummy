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
import { getChildSummarySnapshot } from "./child-summary";
import { checkColorAlert } from "./tauri";
import type { Child, Episode } from "./types";

const REMINDER_ID = 1;
const SETTING_KEY = "daily_reminder";
const SMART_REMINDER_KEYS = {
  noPoop: "smart_reminder_no_poop",
  redFlagFollowUp: "smart_reminder_red_flag_follow_up",
  episodeCheckIn: "smart_reminder_episode_check_in",
  solidsHydration: "smart_reminder_solids_hydration",
} as const;

const RULE_BASE_IDS = {
  noPoop: 100000,
  redFlagFollowUp: 200000,
  episodeCheckIn: 300000,
  solidsHydration: 400000,
} as const;

export interface SmartReminderSettings {
  noPoop: boolean;
  redFlagFollowUp: boolean;
  episodeCheckIn: boolean;
  solidsHydration: boolean;
}

type SmartReminderKey = keyof SmartReminderSettings;

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function reminderId(childId: string, rule: SmartReminderKey): number {
  return RULE_BASE_IDS[rule] + (hashString(`${rule}:${childId}`) % 50000);
}

async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  return granted;
}

async function cancelIfPending(id: number): Promise<void> {
  try {
    const pendingNotifs = await pending();
    if (pendingNotifs.some((notification) => notification.id === id)) {
      await cancel([id]);
    }
  } catch {
    // Ignore errors if no pending notifications
  }
}

async function scheduleOneOffNotification(input: {
  id: number;
  title: string;
  body: string;
  date: Date;
}): Promise<void> {
  if (input.date.getTime() <= Date.now()) return;

  sendNotification({
    id: input.id,
    title: input.title,
    body: input.body,
    schedule: Schedule.at(input.date, false, true),
  });
}

function getWarningThresholdDays(dateOfBirth: string, feedingType: string): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  const ageDays = Math.max(0, Math.floor((Date.now() - dob.getTime()) / 86400000));
  const ageWeeks = Math.floor(ageDays / 7);

  if (ageWeeks <= 5) {
    return feedingType === "breast" ? 2 : 3;
  }
  if (ageWeeks <= 25) {
    return feedingType === "breast" ? 8 : 4;
  }
  return 4;
}

function getEpisodeAnchorDate(episode: Episode, eventDates: string[], fallbackDates: string[]): Date {
  const dates = [episode.started_at, ...eventDates, ...fallbackDates]
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  return dates[0] ?? new Date(episode.started_at);
}

export async function getSmartReminderSettings(): Promise<SmartReminderSettings> {
  const [noPoop, redFlagFollowUp, episodeCheckIn, solidsHydration] = await Promise.all([
    db.getSetting(SMART_REMINDER_KEYS.noPoop),
    db.getSetting(SMART_REMINDER_KEYS.redFlagFollowUp),
    db.getSetting(SMART_REMINDER_KEYS.episodeCheckIn),
    db.getSetting(SMART_REMINDER_KEYS.solidsHydration),
  ]);

  return {
    noPoop: noPoop === "true",
    redFlagFollowUp: redFlagFollowUp === "true",
    episodeCheckIn: episodeCheckIn === "true",
    solidsHydration: solidsHydration === "true",
  };
}

export async function setSmartReminderEnabled(
  key: SmartReminderKey,
  enabled: boolean,
): Promise<boolean> {
  if (enabled) {
    const granted = await ensurePermission();
    if (!granted) return false;
  }

  await db.setSetting(SMART_REMINDER_KEYS[key], String(enabled));
  return true;
}

export async function isDailyReminderEnabled(): Promise<boolean> {
  const val = await db.getSetting(SETTING_KEY);
  return val === "true";
}

export async function enableDailyReminder(): Promise<boolean> {
  const granted = await ensurePermission();
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
  await cancelIfPending(REMINDER_ID);
  await db.setSetting(SETTING_KEY, "false");
}

export async function syncSmartRemindersForChild(child: Child): Promise<void> {
  const settings = await getSmartReminderSettings();
  const ids = {
    noPoop: reminderId(child.id, "noPoop"),
    redFlagFollowUp: reminderId(child.id, "redFlagFollowUp"),
    episodeCheckIn: reminderId(child.id, "episodeCheckIn"),
    solidsHydration: reminderId(child.id, "solidsHydration"),
  };

  await Promise.all([
    cancelIfPending(ids.noPoop),
    cancelIfPending(ids.redFlagFollowUp),
    cancelIfPending(ids.episodeCheckIn),
    cancelIfPending(ids.solidsHydration),
  ]);

  const permissionGranted = await isPermissionGranted();
  if (!permissionGranted) return;

  const summary = await getChildSummarySnapshot(child.id, {
    poopLimit: 30,
    feedingLimit: 1,
    symptomLimit: 3,
  });
  const lastPoop = summary.lastPoop;
  const latestFeedDates = summary.lastFeed ? [summary.lastFeed.logged_at] : [];
  const activeEpisode = summary.activeEpisode;
  const episodeEventsDates = summary.episodeEvents.map((event) => event.logged_at);

  if (settings.noPoop && lastPoop?.logged_at) {
    const thresholdDays = getWarningThresholdDays(child.date_of_birth, child.feeding_type);
    const reminderAt = new Date(new Date(lastPoop.logged_at).getTime() + thresholdDays * 86400000);

    await scheduleOneOffNotification({
      id: ids.noPoop,
      title: `Check ${child.name}'s poop pattern`,
      body: `It's about time to review whether ${child.name} is still within the usual range.`,
      date: reminderAt,
    });
  }

  if (settings.redFlagFollowUp && lastPoop?.color && lastPoop.logged_at) {
    const alert = await checkColorAlert(
      child.name,
      child.date_of_birth,
      child.feeding_type,
      lastPoop.color,
    );

    if (alert) {
      const reminderAt = new Date(new Date(lastPoop.logged_at).getTime() + 12 * 60 * 60 * 1000);
      await scheduleOneOffNotification({
        id: ids.redFlagFollowUp,
        title: `Follow up on ${child.name}'s stool`,
        body: "Recheck symptoms and decide if you need to contact your doctor.",
        date: reminderAt,
      });
    }
  }

  if (activeEpisode && settings.episodeCheckIn) {
    const anchor = getEpisodeAnchorDate(
      activeEpisode,
      episodeEventsDates,
      latestFeedDates,
    );
    const reminderAt = new Date(anchor.getTime() + 24 * 60 * 60 * 1000);

    await scheduleOneOffNotification({
      id: ids.episodeCheckIn,
      title: `Check in on ${child.name}'s ${activeEpisode.episode_type.replace("_", " ")}`,
      body: "Add a quick episode update so the story stays clear.",
      date: reminderAt,
    });
  }

  if (activeEpisode?.episode_type === "solids_transition" && settings.solidsHydration) {
    const anchor = getEpisodeAnchorDate(
      activeEpisode,
      episodeEventsDates,
      latestFeedDates,
    );
    const reminderAt = new Date(anchor.getTime() + 6 * 60 * 60 * 1000);

    await scheduleOneOffNotification({
      id: ids.solidsHydration,
      title: `Hydration check for ${child.name}`,
      body: "During solids transitions, a quick water and tummy check can help.",
      date: reminderAt,
    });
  }
}

export async function syncSmartRemindersForChildren(children: Child[]): Promise<void> {
  await Promise.all(children.map((child) => syncSmartRemindersForChild(child)));
}
