import { formatLocalDateKey, getLocalDateKeyFromValue } from "./utils.ts";
import {
  getBreastfeedContextHistorySummary,
  getBreastfeedContextHistoryTitle,
} from "./breastfeed-insights.ts";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "./feeding.ts";
import type {
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
  UnitSystem,
} from "./types.ts";

export type TimelineEvent =
  | { kind: "diaper"; entry: DiaperEntry }
  | { kind: "poop"; entry: PoopEntry }
  | { kind: "meal"; entry: FeedingEntry }
  | { kind: "sleep"; entry: SleepEntry }
  | { kind: "symptom"; entry: SymptomEntry }
  | { kind: "growth"; entry: GrowthEntry }
  | { kind: "milestone"; entry: MilestoneEntry }
  | { kind: "episode"; entry: Episode }
  | { kind: "episode_event"; entry: EpisodeEvent };

export const HISTORY_RANGE_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
] as const;

export type TimelineEventSummary = {
  feeds: number;
  poops: number;
  sleep: number;
  diapers: number;
  other: number;
  total: number;
};

export type HistoryFeedingPresentation = {
  kind: "feed" | "breastfeed";
  title: string;
  subtitle: string | null;
  tagLabel: string;
};

export function isHistoryBreastfeedEntry(entry: FeedingEntry): boolean {
  return entry.food_type === "breast_milk"
    && (entry.breast_side === "left" || entry.breast_side === "right" || entry.breast_side === "both");
}

export function getHistoryFeedingPresentation(entry: FeedingEntry, unitSystem: UnitSystem): HistoryFeedingPresentation {
  if (isHistoryBreastfeedEntry(entry)) {
    return {
      kind: "breastfeed",
      title: getBreastfeedContextHistoryTitle(entry),
      subtitle: getBreastfeedContextHistorySummary(entry, unitSystem),
      tagLabel: "breastfeed",
    };
  }

  const detailText = getFeedingEntryDetailParts(entry, unitSystem).join(" · ");
  const secondaryText = [detailText, getFeedingEntrySecondaryText(entry)].filter(Boolean).join(" · ");

  return {
    kind: "feed",
    title: getFeedingEntryPrimaryLabel(entry),
    subtitle: secondaryText || null,
    tagLabel: "feed",
  };
}

export function formatHistoryTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatHistoryDayHeader(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatHistoryDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatHistorySleepDuration(entry: SleepEntry): string {
  const minutes = Math.max(0, Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  return formatLocalDateKey(next);
}

export function getEventTimestamp(event: TimelineEvent): string {
  switch (event.kind) {
    case "diaper":
    case "poop":
    case "meal":
    case "symptom":
    case "milestone":
    case "episode_event":
      return event.entry.logged_at;
    case "sleep":
      return event.entry.started_at;
    case "growth":
      return event.entry.measured_at;
    case "episode":
      return event.entry.started_at;
  }
}

export function summarizeTimelineEvents(events: TimelineEvent[]): TimelineEventSummary {
  return events.reduce<TimelineEventSummary>((summary, event) => {
    summary.total += 1;

    switch (event.kind) {
      case "meal":
        summary.feeds += 1;
        break;
      case "sleep":
        summary.sleep += 1;
        break;
      case "diaper":
        summary.diapers += 1;
        if (event.entry.diaper_type === "dirty" || event.entry.diaper_type === "mixed") {
          summary.poops += 1;
        }
        break;
      case "poop":
        if (event.entry.is_no_poop === 1) {
          summary.other += 1;
        } else {
          summary.poops += 1;
        }
        break;
      case "symptom":
      case "growth":
      case "milestone":
      case "episode":
      case "episode_event":
        summary.other += 1;
        break;
    }

    return summary;
  }, {
    feeds: 0,
    poops: 0,
    sleep: 0,
    diapers: 0,
    other: 0,
    total: 0,
  });
}

export function getVisiblePoopLogs(diaperLogs: DiaperEntry[], poopLogs: PoopEntry[]): PoopEntry[] {
  const linkedPoopIds = new Set(
    diaperLogs
      .map((log) => log.linked_poop_log_id)
      .filter((id): id is string => Boolean(id)),
  );
  return poopLogs.filter((log) => !linkedPoopIds.has(log.id));
}

function getVisibleEpisodeEvents(symptomLogs: SymptomEntry[], episodeEvents: EpisodeEvent[]): EpisodeEvent[] {
  const linkedSymptomKeys = new Set(
    symptomLogs
      .filter((symptom) => symptom.episode_id)
      .map((symptom) => `${symptom.episode_id}:${symptom.logged_at}`),
  );

  return episodeEvents.filter((event) => {
    if (event.event_type !== "symptom") return true;
    if (event.source_kind === "symptom") return false;
    return !linkedSymptomKeys.has(`${event.episode_id}:${event.logged_at}`);
  });
}

export function groupTimelineByDay({
  diaperLogs,
  poopLogs,
  feedingLogs,
  sleepLogs,
  symptomLogs,
  growthLogs,
  milestoneLogs,
  episodes,
  episodeEvents,
  timeZoneOffsetMinutes = new Date().getTimezoneOffset(),
}: {
  diaperLogs: DiaperEntry[];
  poopLogs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  milestoneLogs: MilestoneEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  timeZoneOffsetMinutes?: number;
}): Map<string, TimelineEvent[]> {
  const all: TimelineEvent[] = [
    ...diaperLogs.map((entry) => ({ kind: "diaper" as const, entry })),
    ...poopLogs.map((entry) => ({ kind: "poop" as const, entry })),
    ...feedingLogs.map((entry) => ({ kind: "meal" as const, entry })),
    ...sleepLogs.map((entry) => ({ kind: "sleep" as const, entry })),
    ...symptomLogs.map((entry) => ({ kind: "symptom" as const, entry })),
    ...growthLogs.map((entry) => ({ kind: "growth" as const, entry })),
    ...milestoneLogs.map((entry) => ({ kind: "milestone" as const, entry })),
    ...episodes.map((entry) => ({ kind: "episode" as const, entry })),
    ...getVisibleEpisodeEvents(symptomLogs, episodeEvents).map((entry) => ({ kind: "episode_event" as const, entry })),
  ];

  const grouped = new Map<string, TimelineEvent[]>();

  for (const item of all) {
    const day = getLocalDateKeyFromValue(getEventTimestamp(item), timeZoneOffsetMinutes);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)?.push(item);
  }

  for (const events of grouped.values()) {
    events.sort((left, right) => new Date(getEventTimestamp(left)).getTime() - new Date(getEventTimestamp(right)).getTime());
  }

  return new Map([...grouped.entries()].sort((left, right) => right[0].localeCompare(left[0])));
}

export function getHistoryRange(today: string, quickRangeDays: number, searchDate: string | null) {
  const rangeEnd = searchDate ?? today;
  const rangeStart = searchDate ?? addDaysToDateKey(today, -(quickRangeDays - 1));
  return { rangeStart, rangeEnd };
}

export function getHistoryDisplayDays(grouped: Map<string, TimelineEvent[]>, searchDate: string | null) {
  if (!searchDate) return [...grouped.entries()];
  const filtered = grouped.get(searchDate);
  if (filtered) return [[searchDate, filtered]] as [string, TimelineEvent[]][];
  return [];
}

export function hasHistoryEntries(input: {
  diaperLogs: DiaperEntry[];
  poopLogs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  milestoneLogs: MilestoneEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
}) {
  return input.diaperLogs.length > 0
    || input.poopLogs.length > 0
    || input.feedingLogs.length > 0
    || input.sleepLogs.length > 0
    || input.symptomLogs.length > 0
    || input.growthLogs.length > 0
    || input.milestoneLogs.length > 0
    || input.episodes.length > 0
    || input.episodeEvents.length > 0;
}

export function getEarliestHistoryDate(grouped: Map<string, TimelineEvent[]>, today: string) {
  const allDates = [...grouped.keys()];
  return allDates.length > 0 ? allDates[allDates.length - 1] : today;
}
