import * as db from "./db";
import { diaperIncludesStool, diaperIncludesWet } from "./diaper";
import { formatLocalDateKey, isOnLocalDay } from "./utils";
import type { Alert, DiaperEntry, Episode, EpisodeEvent, FeedingEntry, PoopEntry, SymptomEntry } from "./types";

export interface ChildDailySummary {
  lastDiaper: DiaperEntry | null;
  lastFeed: FeedingEntry | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  latestSymptom: SymptomEntry | null;
  todayWetDiapers: number;
  todayDirtyDiapers: number;
  todayPoops: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  visibleAlerts: Alert[];
  recentSymptoms: SymptomEntry[];
  activeEpisode: Episode | null;
}

export interface ChildSummarySnapshot extends ChildDailySummary {
  diaperLogs: DiaperEntry[];
  lastPoop: PoopEntry | null;
  alerts: Alert[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
}

export function getTodayKey(now: Date = new Date()): string {
  return formatLocalDateKey(now);
}

export function buildChildDailySummary(input: {
  poopLogs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  alerts: Alert[];
  activeEpisode: Episode | null;
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  dayKey?: string;
}): ChildDailySummary {
  const dayKey = input.dayKey ?? getTodayKey();

  return {
    lastDiaper: input.diaperLogs[0] ?? null,
    lastFeed: input.feedingLogs[0] ?? null,
    latestEpisodeUpdate: input.episodeEvents[0] ?? null,
    latestSymptom: input.symptomLogs[0] ?? null,
    todayWetDiapers: input.diaperLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey) && diaperIncludesWet(log.diaper_type)).length,
    todayDirtyDiapers: input.diaperLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey) && diaperIncludesStool(log.diaper_type)).length,
    todayPoops: input.poopLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey) && log.is_no_poop === 0).length,
    todayFeeds: input.feedingLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey)).length,
    hasNoPoopDay: input.poopLogs.some((log) => isOnLocalDay(log.logged_at, dayKey) && log.is_no_poop === 1),
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

  const [diaperLogs, poopLogs, lastPoop, feedingLogs, alerts, activeEpisode, symptomLogs] = await Promise.all([
    db.getDiaperLogs(childId, poopLimit),
    db.getPoopLogs(childId, poopLimit),
    db.getLastRealPoop(childId),
    db.getFeedingLogs(childId, feedingLimit),
    db.getActiveAlerts(childId),
    db.getActiveEpisode(childId),
    db.getSymptoms(childId, symptomLimit),
  ]);

  const episodeEvents = activeEpisode
    ? await db.getEpisodeEvents(activeEpisode.id)
    : [];

  const summary = buildChildDailySummary({
    poopLogs,
    diaperLogs,
    feedingLogs,
    alerts,
    activeEpisode,
    episodeEvents,
    symptomLogs,
    dayKey: options.dayKey,
  });

  return {
    ...summary,
    diaperLogs,
    lastPoop,
    alerts,
    episodeEvents,
    symptomLogs,
  };
}
