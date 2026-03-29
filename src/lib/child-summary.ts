import * as db from "./db";
import { getCaregiverNoteSettingKey } from "./caregiver-note";
import type { Alert, Episode, EpisodeEvent, FeedingEntry, PoopEntry, SymptomEntry } from "./types";

export interface ChildDailySummary {
  lastFeed: FeedingEntry | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  latestSymptom: SymptomEntry | null;
  todayPoops: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  visibleAlerts: Alert[];
  recentSymptoms: SymptomEntry[];
  activeEpisode: Episode | null;
}

export interface ChildSummarySnapshot extends ChildDailySummary {
  lastPoop: PoopEntry | null;
  alerts: Alert[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  handoffNote: string | null;
}

export function getTodayKey(now: Date = new Date()): string {
  return now.toISOString().split("T")[0];
}

export function buildChildDailySummary(input: {
  poopLogs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  alerts: Alert[];
  activeEpisode: Episode | null;
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  dayKey?: string;
}): ChildDailySummary {
  const dayKey = input.dayKey ?? getTodayKey();

  return {
    lastFeed: input.feedingLogs[0] ?? null,
    latestEpisodeUpdate: input.episodeEvents[0] ?? null,
    latestSymptom: input.symptomLogs[0] ?? null,
    todayPoops: input.poopLogs.filter((log) => log.logged_at.startsWith(dayKey) && log.is_no_poop === 0).length,
    todayFeeds: input.feedingLogs.filter((log) => log.logged_at.startsWith(dayKey)).length,
    hasNoPoopDay: input.poopLogs.some((log) => log.logged_at.startsWith(dayKey) && log.is_no_poop === 1),
    visibleAlerts: input.alerts.slice(0, 3),
    recentSymptoms: input.symptomLogs.slice(0, 3),
    activeEpisode: input.activeEpisode,
  };
}

export async function getChildSummarySnapshot(
  childId: string,
  options: {
    poopLimit?: number;
    feedingLimit?: number;
    symptomLimit?: number;
    dayKey?: string;
  } = {},
): Promise<ChildSummarySnapshot> {
  const poopLimit = options.poopLimit ?? 100;
  const feedingLimit = options.feedingLimit ?? 100;
  const symptomLimit = options.symptomLimit ?? 10;

  const [poopLogs, lastPoop, feedingLogs, alerts, activeEpisode, symptomLogs, handoffNote] = await Promise.all([
    db.getPoopLogs(childId, poopLimit),
    db.getLastRealPoop(childId),
    db.getFeedingLogs(childId, feedingLimit),
    db.getActiveAlerts(childId),
    db.getActiveEpisode(childId),
    db.getSymptoms(childId, symptomLimit),
    db.getSetting(getCaregiverNoteSettingKey(childId)),
  ]);

  const episodeEvents = activeEpisode
    ? await db.getEpisodeEvents(activeEpisode.id)
    : [];

  const summary = buildChildDailySummary({
    poopLogs,
    feedingLogs,
    alerts,
    activeEpisode,
    episodeEvents,
    symptomLogs,
    dayKey: options.dayKey,
  });

  return {
    ...summary,
    lastPoop,
    alerts,
    episodeEvents,
    symptomLogs,
    handoffNote,
  };
}
