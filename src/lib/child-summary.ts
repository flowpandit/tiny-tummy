import type { Alert, DietEntry, Episode, EpisodeEvent, PoopEntry, SymptomEntry } from "./types";

export interface ChildDailySummary {
  lastFeed: DietEntry | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  latestSymptom: SymptomEntry | null;
  todayPoops: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  visibleAlerts: Alert[];
  recentSymptoms: SymptomEntry[];
  activeEpisode: Episode | null;
}

export function getTodayKey(now: Date = new Date()): string {
  return now.toISOString().split("T")[0];
}

export function buildChildDailySummary(input: {
  poopLogs: PoopEntry[];
  dietLogs: DietEntry[];
  alerts: Alert[];
  activeEpisode: Episode | null;
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  dayKey?: string;
}): ChildDailySummary {
  const dayKey = input.dayKey ?? getTodayKey();

  return {
    lastFeed: input.dietLogs[0] ?? null,
    latestEpisodeUpdate: input.episodeEvents[0] ?? null,
    latestSymptom: input.symptomLogs[0] ?? null,
    todayPoops: input.poopLogs.filter((log) => log.logged_at.startsWith(dayKey) && log.is_no_poop === 0).length,
    todayFeeds: input.dietLogs.filter((log) => log.logged_at.startsWith(dayKey)).length,
    hasNoPoopDay: input.poopLogs.some((log) => log.logged_at.startsWith(dayKey) && log.is_no_poop === 1),
    visibleAlerts: input.alerts.slice(0, 3),
    recentSymptoms: input.symptomLogs.slice(0, 3),
    activeEpisode: input.activeEpisode,
  };
}
