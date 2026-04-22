import { BITSS_TYPES, STOOL_COLORS } from "./constants";
import { diaperIncludesStool, diaperIncludesWet } from "./diaper";
import { getFeedBaseline, getFeedPrediction, getPredictableFeedLogs } from "./feed-insights";
import { getFoodTypeLabel } from "./feeding";
import { getDurationMinutes, getOverlapMinutesForDay, getSleepPrediction, getWakeBaseline } from "./sleep-insights";
import { fillDailyFrequencyDays } from "./stats";
import type {
  Child,
  DiaperEntry,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
} from "./types";
import { formatLocalDateKey, isOnLocalDay, timeSince, timeSinceDetailed } from "./utils";

export type TrendsTab = "overview" | "feed" | "sleep" | "diaper" | "poop";
export type TrendTone = "default" | "info" | "healthy" | "cta";

export interface TrendSummaryTileModel {
  id: TrendsTab;
  label: string;
  value: string;
  unit: string;
  detail?: string;
  gradient: string;
  tone: TrendTone;
}

export interface TrendSeriesDefinition {
  key: string;
  label: string;
  color: string;
}

export interface TrendBarDatum {
  date: string;
  label: string;
  [key: string]: string | number;
}

export interface OverviewEvent {
  id: string;
  kind: "feed" | "sleep" | "diaper" | "poop";
  startHour: number;
  endHour?: number;
}

export interface OverviewRow {
  dayKey: string;
  label: string;
  events: OverviewEvent[];
}

export interface TrendsOverviewModel {
  hasAnyData: boolean;
  summaryTiles: TrendSummaryTileModel[];
  overviewRows: OverviewRow[];
  overviewNarrative: string[];
  feedNarrative: string;
  sleepNarrative: string;
  diaperNarrative: string;
  poopNarrative: string;
  feedChart: {
    data: TrendBarDatum[];
    series: TrendSeriesDefinition[];
  };
  sleepChart: {
    data: TrendBarDatum[];
    series: TrendSeriesDefinition[];
  };
  diaperChart: {
    data: TrendBarDatum[];
    series: TrendSeriesDefinition[];
  };
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getHourValue(value: string): number {
  const date = new Date(value);
  return date.getHours() + (date.getMinutes() / 60);
}

function formatShortDay(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function buildDayKeys(days: number, endDate: Date = new Date()): string[] {
  const keys: string[] = [];
  const finalDate = new Date(endDate);
  finalDate.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(finalDate);
    date.setDate(date.getDate() - offset);
    keys.push(formatLocalDateKey(date));
  }

  return keys;
}

function getTrendToneFromStatus(status: "upcoming" | "due" | "overdue" | null): TrendTone {
  if (status === "overdue") return "cta";
  if (status === "due") return "info";
  return "healthy";
}

function getPoopTone(lastRealPoop: PoopEntry | null): TrendTone {
  if (!lastRealPoop?.stool_type) return "default";
  if (lastRealPoop.stool_type >= 3 && lastRealPoop.stool_type <= 5) return "healthy";
  return "info";
}

function getSummaryGradient(id: TrendsTab, tone: TrendTone): string {
  if (id === "feed") {
    return "conic-gradient(from 210deg, var(--color-cta) 0deg, var(--color-gold) 170deg, var(--color-healthy) 360deg)";
  }
  if (id === "sleep") {
    return "conic-gradient(from 210deg, var(--color-info) 0deg, #8aa7ea 180deg, #c1d4ff 360deg)";
  }
  if (id === "diaper") {
    return "conic-gradient(from 210deg, var(--color-info) 0deg, #8ba8ff 180deg, #8f8cf0 360deg)";
  }
  if (id === "poop") {
    return "conic-gradient(from 210deg, var(--color-cta) 0deg, var(--color-chart-warm-end) 200deg, #d9d0a0 360deg)";
  }

  if (tone === "healthy") {
    return "conic-gradient(from 210deg, var(--color-healthy) 0deg, #9dcf9d 180deg, #d8edd6 360deg)";
  }
  if (tone === "info") {
    return "conic-gradient(from 210deg, var(--color-info) 0deg, #8aa7ea 180deg, #c1d4ff 360deg)";
  }
  if (tone === "cta") {
    return "conic-gradient(from 210deg, var(--color-cta) 0deg, #f0b66f 180deg, #ffd9b5 360deg)";
  }
  return "conic-gradient(from 210deg, #7b88a6 0deg, #8895b0 180deg, #9da9c1 360deg)";
}

function buildFeedTile(child: Child, feedingLogs: FeedingEntry[]): TrendSummaryTileModel {
  const predictableLogs = getPredictableFeedLogs(feedingLogs);
  const lastFeed = predictableLogs[0] ?? null;

  if (!lastFeed) {
    return {
      id: "feed",
      label: "Feed",
      value: "--",
      unit: "last",
      detail: "No feed yet",
      gradient: getSummaryGradient("feed", "default"),
      tone: "default",
    };
  }

  const baseline = getFeedBaseline(child.date_of_birth, child.feeding_type);
  const prediction = getFeedPrediction(feedingLogs, baseline);
  const since = timeSinceDetailed(lastFeed.logged_at);
  const tone = getTrendToneFromStatus(prediction?.state ?? null);

  return {
    id: "feed",
    label: "Feed",
    value: `${since.value}`,
    unit: since.unit,
    detail: prediction
      ? `Next likely ${formatClock(prediction.predictedAt)}`
      : getFoodTypeLabel(lastFeed.food_type),
    gradient: getSummaryGradient("feed", tone),
    tone,
  };
}

function buildSleepTile(child: Child, sleepLogs: SleepEntry[]): TrendSummaryTileModel {
  const lastSleep = sleepLogs[0] ?? null;

  if (!lastSleep) {
    return {
      id: "sleep",
      label: "Sleep",
      value: "--",
      unit: "last",
      detail: "No sleep yet",
      gradient: getSummaryGradient("sleep", "default"),
      tone: "default",
    };
  }

  const baseline = getWakeBaseline(child.date_of_birth);
  const prediction = getSleepPrediction(sleepLogs, baseline);
  const since = timeSinceDetailed(lastSleep.ended_at);
  const tone = getTrendToneFromStatus(prediction?.state ?? null);

  return {
    id: "sleep",
    label: "Sleep",
    value: `${since.value}`,
    unit: since.unit,
    detail: prediction
      ? `Next rest ${formatClock(prediction.predictedAt)}`
      : `${getDurationMinutes(lastSleep)} min`,
    gradient: getSummaryGradient("sleep", tone),
    tone,
  };
}

function buildDiaperTile(diaperLogs: DiaperEntry[]): TrendSummaryTileModel {
  if (diaperLogs.length === 0) {
    return {
      id: "diaper",
      label: "Diaper",
      value: "0",
      unit: "wet",
      detail: "No diaper data",
      gradient: getSummaryGradient("diaper", "default"),
      tone: "default",
    };
  }

  const todayKey = formatLocalDateKey(new Date());
  const todayWetCount = diaperLogs.filter((log) => isOnLocalDay(log.logged_at, todayKey) && diaperIncludesWet(log.diaper_type)).length;
  const todayDirtyCount = diaperLogs.filter((log) => isOnLocalDay(log.logged_at, todayKey) && diaperIncludesStool(log.diaper_type)).length;

  const tone = todayWetCount >= 4 ? "healthy" : "info";

  return {
    id: "diaper",
    label: "Diaper",
    value: `${todayWetCount}`,
    unit: "wet",
    detail: `${todayDirtyCount} dirty`,
    gradient: getSummaryGradient("diaper", tone),
    tone,
  };
}

function buildPoopTile(lastRealPoop: PoopEntry | null): TrendSummaryTileModel {
  if (!lastRealPoop) {
    return {
      id: "poop",
      label: "Poop",
      value: "--",
      unit: "type",
      detail: "No stool yet",
      gradient: getSummaryGradient("poop", "default"),
      tone: "default",
    };
  }

  const colorLabel = lastRealPoop.color
    ? STOOL_COLORS.find((item) => item.value === lastRealPoop.color)?.label ?? lastRealPoop.color
    : null;
  const tone = getPoopTone(lastRealPoop);

  return {
    id: "poop",
    label: "Poop",
    value: lastRealPoop.stool_type ? `${lastRealPoop.stool_type}` : "--",
    unit: "type",
    detail: colorLabel ?? timeSince(lastRealPoop.logged_at),
    gradient: getSummaryGradient("poop", tone),
    tone,
  };
}

function buildFeedChartData(logs: FeedingEntry[], days: number): TrendBarDatum[] {
  const predictableLogs = getPredictableFeedLogs(logs);
  const counts = new Map<string, number>();

  for (const log of predictableLogs) {
    const dayKey = log.logged_at.split("T")[0];
    counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
  }

  return fillDailyFrequencyDays(
    [...counts.entries()].map(([date, count]) => ({ date, count })),
    days,
  ).map((day) => ({
    date: day.date,
    label: day.weekdayLabel,
    feeds: day.count,
  }));
}

function buildSleepChartData(logs: SleepEntry[], days: number): TrendBarDatum[] {
  const dayKeys = buildDayKeys(days);

  return dayKeys.map((dayKey) => {
    const totalHours = Math.round((
      logs.reduce((sum, log) => sum + getOverlapMinutesForDay(log, dayKey), 0) / 60
    ) * 10) / 10;

    return {
      date: dayKey,
      label: formatShortDay(dayKey),
      hours: totalHours,
    };
  });
}

function buildDiaperChartData(logs: DiaperEntry[], days: number): TrendBarDatum[] {
  const dayKeys = buildDayKeys(days);

  return dayKeys.map((dayKey) => ({
    date: dayKey,
    label: formatShortDay(dayKey),
    wet: logs.filter((log) => isOnLocalDay(log.logged_at, dayKey) && diaperIncludesWet(log.diaper_type)).length,
    dirty: logs.filter((log) => isOnLocalDay(log.logged_at, dayKey) && diaperIncludesStool(log.diaper_type)).length,
  }));
}

function buildOverviewRows({
  feedingLogs,
  sleepLogs,
  diaperLogs,
  poopLogs,
  days,
}: {
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  diaperLogs: DiaperEntry[];
  poopLogs: PoopEntry[];
  days: number;
}): OverviewRow[] {
  const overviewDays = Math.min(days, 7);
  const dayKeys = buildDayKeys(overviewDays);

  return dayKeys.map((dayKey) => {
    const events: OverviewEvent[] = [];

    for (const log of getPredictableFeedLogs(feedingLogs)) {
      if (!isOnLocalDay(log.logged_at, dayKey)) continue;
      events.push({
        id: `feed-${log.id}`,
        kind: "feed",
        startHour: getHourValue(log.logged_at),
      });
    }

    for (const log of diaperLogs) {
      if (!isOnLocalDay(log.logged_at, dayKey)) continue;
      events.push({
        id: `diaper-${log.id}`,
        kind: "diaper",
        startHour: getHourValue(log.logged_at),
      });
    }

    for (const log of poopLogs) {
      if (log.is_no_poop === 1 || !isOnLocalDay(log.logged_at, dayKey)) continue;
      events.push({
        id: `poop-${log.id}`,
        kind: "poop",
        startHour: getHourValue(log.logged_at),
      });
    }

    for (const log of sleepLogs) {
      const dayStart = new Date(`${dayKey}T00:00:00`).getTime();
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      const startedAt = new Date(log.started_at).getTime();
      const endedAt = new Date(log.ended_at).getTime();
      const overlapStart = Math.max(dayStart, startedAt);
      const overlapEnd = Math.min(dayEnd, endedAt);

      if (overlapEnd <= overlapStart) continue;

      const startDate = new Date(overlapStart);
      const endDate = new Date(overlapEnd);

      events.push({
        id: `sleep-${log.id}-${dayKey}`,
        kind: "sleep",
        startHour: startDate.getHours() + (startDate.getMinutes() / 60),
        endHour: endDate.getHours() + (endDate.getMinutes() / 60),
      });
    }

    events.sort((left, right) => left.startHour - right.startHour);

    return {
      dayKey,
      label: formatShortDay(dayKey),
      events,
    };
  });
}

function getDominantFeedType(logs: FeedingEntry[]): string | null {
  const counts = new Map<string, number>();

  for (const log of getPredictableFeedLogs(logs)) {
    counts.set(log.food_type, (counts.get(log.food_type) ?? 0) + 1);
  }

  const dominant = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  return dominant ? getFoodTypeLabel(dominant as FeedingEntry["food_type"]).toLowerCase() : null;
}

function buildOverviewNarrative({
  child,
  feedingLogs,
  sleepLogs,
  diaperLogs,
  lastRealPoop,
}: {
  child: Child;
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  diaperLogs: DiaperEntry[];
  lastRealPoop: PoopEntry | null;
}): {
  overview: string[];
  feed: string;
  sleep: string;
  diaper: string;
  poop: string;
} {
  const feedPrediction = getFeedPrediction(feedingLogs, getFeedBaseline(child.date_of_birth, child.feeding_type));
  const sleepPrediction = getSleepPrediction(sleepLogs, getWakeBaseline(child.date_of_birth));
  const todayKey = formatLocalDateKey(new Date());
  const todayWetCount = diaperLogs.filter((log) => isOnLocalDay(log.logged_at, todayKey) && diaperIncludesWet(log.diaper_type)).length;
  const dominantFeedType = getDominantFeedType(feedingLogs);
  const lastSleep = sleepLogs[0] ?? null;
  const lastDiaper = diaperLogs[0] ?? null;
  const poopTypeLabel = lastRealPoop?.stool_type
    ? BITSS_TYPES.find((item) => item.type === lastRealPoop.stool_type)?.label ?? `Type ${lastRealPoop.stool_type}`
    : null;

  const overview = [
    feedPrediction
      ? `Feeds are currently pointing to the next likely window around ${formatClock(feedPrediction.predictedAt)}.`
      : dominantFeedType
        ? `Most recent feed logs are led by ${dominantFeedType}, which is shaping the current rhythm.`
        : "Feed rhythm will sharpen once a few more entries are logged.",
    sleepPrediction
      ? `Sleep rhythm suggests the next rest is likely around ${formatClock(sleepPrediction.predictedAt)}.`
      : lastSleep
        ? `Recent sleep blocks are logged, but the wake pattern needs another day or two to settle.`
        : "Sleep rhythm will get clearer after the first few naps or nights are logged.",
    todayWetCount >= 4
      ? "Wet diaper output looks steady today."
      : lastDiaper
        ? "Diaper output is still readable, but a few more wet logs would make the day easier to judge."
        : "Diaper output will read more clearly after the first wet and dirty logs.",
  ];

  return {
    overview,
    feed: feedPrediction
      ? `Most feeds are landing in a repeatable rhythm, with the next one likely around ${formatClock(feedPrediction.predictedAt)}.`
      : dominantFeedType
        ? `Recent logs are mostly ${dominantFeedType}, but there still is not enough history to forecast confidently.`
        : "This feed chart is still in setup mode until a few more feeds are logged.",
    sleep: sleepPrediction
      ? `The wake-window pattern is settled enough to point to a likely next rest around ${formatClock(sleepPrediction.predictedAt)}.`
      : lastSleep
        ? "Sleep blocks are coming through, but the wake rhythm still needs more history before it becomes predictive."
        : "Once the first few naps or nights are logged, this panel will start surfacing a clearer rhythm.",
    diaper: todayWetCount >= 4
      ? "Wet output has enough volume today to read as steady, with dirty counts available alongside it."
      : "Use this chart to spot whether wet diapers are building into a reassuring daily rhythm.",
    poop: poopTypeLabel
      ? lastRealPoop?.stool_type && lastRealPoop.stool_type >= 3 && lastRealPoop.stool_type <= 5
        ? `The latest stool was ${poopTypeLabel.toLowerCase()}, which sits inside the expected range.`
        : `The latest stool was ${poopTypeLabel.toLowerCase()}, so this panel stays focused on how that trend is moving.`
      : "Poop trends will become more useful after a few real stool logs are in.",
  };
}

export function buildTrendsOverviewModel({
  child,
  days,
  poopLogs,
  lastRealPoop,
  feedingLogs,
  sleepLogs,
  diaperLogs,
}: {
  child: Child;
  days: number;
  poopLogs: PoopEntry[];
  lastRealPoop: PoopEntry | null;
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  diaperLogs: DiaperEntry[];
}): TrendsOverviewModel {
  const narratives = buildOverviewNarrative({
    child,
    feedingLogs,
    sleepLogs,
    diaperLogs,
    lastRealPoop,
  });

  return {
    hasAnyData: poopLogs.length > 0 || feedingLogs.length > 0 || sleepLogs.length > 0 || diaperLogs.length > 0,
    summaryTiles: [
      buildFeedTile(child, feedingLogs),
      buildSleepTile(child, sleepLogs),
      buildDiaperTile(diaperLogs),
      buildPoopTile(lastRealPoop),
    ],
    overviewRows: buildOverviewRows({
      feedingLogs,
      sleepLogs,
      diaperLogs,
      poopLogs,
      days,
    }),
    overviewNarrative: narratives.overview,
    feedNarrative: narratives.feed,
    sleepNarrative: narratives.sleep,
    diaperNarrative: narratives.diaper,
    poopNarrative: narratives.poop,
    feedChart: {
      data: buildFeedChartData(feedingLogs, days),
      series: [{ key: "feeds", label: "Feeds", color: "var(--color-chart-warm-end)" }],
    },
    sleepChart: {
      data: buildSleepChartData(sleepLogs, days),
      series: [{ key: "hours", label: "Sleep hours", color: "var(--color-info)" }],
    },
    diaperChart: {
      data: buildDiaperChartData(diaperLogs, days),
      series: [
        { key: "wet", label: "Wet", color: "var(--color-info)" },
        { key: "dirty", label: "Dirty", color: "var(--color-chart-warm-end)" },
      ],
    },
  };
}
