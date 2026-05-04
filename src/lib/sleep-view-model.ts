import {
  formatSleepDuration,
  getDurationMinutes,
  getOverlapMinutesForDay,
  type SleepPrediction,
  type WakeBaseline,
  type WakeRisk,
} from "./sleep-insights";
import type { SleepEntry } from "./types";
import { getLocalDateKeyFromValue } from "./utils";

export interface SleepPatternPreviewSegment {
  id: string;
  left: string;
  width: string;
  color: string;
}

export interface SleepWeekPreviewBar {
  date: string;
  height: string;
  opacity: number;
  weekdayLabel: string;
}

export interface SleepAssistantCopy {
  heroTitle: string;
  heroDescription: string;
  heroBadgeLabel: string;
  heroBadgeValue: string;
  heroBadgeDetail: string;
  recommendationTitle: string;
  recommendationDetail: string;
  recommendationActionLabel: string;
  insightTitle: string;
  insightDetail: string;
}

export interface SleepTimelineItem {
  id: string;
  logId: string;
  timeLabel: string;
  title: string;
  detail: string;
  accent: "wake" | "nap" | "night";
}

export interface SleepGlanceStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: "total" | "naps" | "longest" | "night";
}

export interface WakeWindowProgress {
  thumbPercent: number;
  fillPercent: number;
  optimalStartPercent: number;
  optimalEndPercent: number;
}

function formatClock(value: string | Date): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDurationCompact(minutes: number): string {
  const roundedMinutes = Math.max(1, Math.round(minutes));
  if (roundedMinutes < 60) return `${roundedMinutes} min`;

  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function formatElapsedSince(value: string | null, now = Date.now()): string {
  if (!value) return "No wake yet";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "No wake yet";

  const diffMinutes = Math.max(0, Math.round((now - timestamp) / 60000));
  if (diffMinutes < 1) return "just now";
  return `${formatDurationCompact(diffMinutes)} ago`;
}

export function formatSleepPredictionRelative(prediction: SleepPrediction | null, now = Date.now()): string {
  if (!prediction) return "after a sleep log";
  if (prediction.state === "due") return "now";

  const targetTime = prediction.state === "overdue"
    ? prediction.latestAt.getTime()
    : prediction.predictedAt.getTime();
  const diffMinutes = Math.abs(Math.round((targetTime - now) / 60000));
  const formatted = formatDurationCompact(diffMinutes);

  if (prediction.state === "overdue") {
    return `${formatted} overdue`;
  }

  return `in ~${formatted}`;
}

export function formatSleepPredictionClock(prediction: SleepPrediction | null): string {
  if (!prediction) return "After the first sleep log";
  return `Around ${formatClock(prediction.predictedAt)}`;
}

export function buildSleepAssistantCopy({
  childName,
  prediction,
  wakeRisk,
  hasTimerSession,
  now = Date.now(),
}: {
  childName: string;
  prediction: SleepPrediction | null;
  wakeRisk: WakeRisk;
  hasTimerSession: boolean;
  now?: number;
}): SleepAssistantCopy {
  if (hasTimerSession) {
    return {
      heroTitle: "Sleep is in progress",
      heroDescription: `Keep the timer running while ${childName} rests, then save it when wake-up happens.`,
      heroBadgeLabel: "Current sleep",
      heroBadgeValue: "active",
      heroBadgeDetail: "Timer running",
      recommendationTitle: "End sleep when wake-up happens",
      recommendationDetail: "Save the timer once this sleep block is finished.",
      recommendationActionLabel: "Open timer",
      insightTitle: "Timer is tracking this sleep",
      insightDetail: "You can add a note now or save the session when it ends.",
    };
  }

  if (!prediction) {
    return {
      heroTitle: "Sleep timing needs a first log",
      heroDescription: `Add a nap or night sleep for ${childName} and the next wake window will appear here.`,
      heroBadgeLabel: "Ideal nap time is",
      heroBadgeValue: "waiting",
      heroBadgeDetail: "Add sleep data",
      recommendationTitle: "Log a sleep to unlock timing",
      recommendationDetail: "One completed sleep gives this page enough context to guide the next window.",
      recommendationActionLabel: "Log sleep",
      insightTitle: "Sleep insight will build here",
      insightDetail: "Once a few sleep blocks are logged, Tiny Tummy can summarize the rhythm.",
    };
  }

  if (prediction.state === "overdue") {
    return {
      heroTitle: "Sleep window may be overdue",
      heroDescription: `${childName}'s wake stretch is past the ideal window based on the last wake time.`,
      heroBadgeLabel: "Ideal nap time is",
      heroBadgeValue: formatSleepPredictionRelative(prediction, now),
      heroBadgeDetail: formatSleepPredictionClock(prediction),
      recommendationTitle: "Start sleep now",
      recommendationDetail: `${childName}'s sleep window is already open. Keep the routine calm and simple.`,
      recommendationActionLabel: "Start nap now",
      insightTitle: "Prioritize sleep now",
      insightDetail: wakeRisk.description,
    };
  }

  if (prediction.state === "due") {
    return {
      heroTitle: "Sleep window is open",
      heroDescription: `The ideal nap window is here based on ${childName}'s last wake time.`,
      heroBadgeLabel: "Ideal nap time is",
      heroBadgeValue: formatSleepPredictionRelative(prediction, now),
      heroBadgeDetail: formatSleepPredictionClock(prediction),
      recommendationTitle: "Start nap now",
      recommendationDetail: `${childName}'s ideal sleep window is open. Look for sleepy cues.`,
      recommendationActionLabel: "Start nap now",
      insightTitle: "Approaching ideal window",
      insightDetail: `${childName} is getting ready for sleep. Look for sleepy cues.`,
    };
  }

  return {
    heroTitle: "Sleep window is opening",
    heroDescription: `Ideal nap time is approaching based on ${childName}'s last wake time.`,
    heroBadgeLabel: "Ideal nap time is",
    heroBadgeValue: formatSleepPredictionRelative(prediction, now),
    heroBadgeDetail: formatSleepPredictionClock(prediction),
    recommendationTitle: `Prepare for nap ${formatSleepPredictionRelative(prediction, now)}`,
    recommendationDetail: `${childName}'s ideal sleep window is starting soon.`,
    recommendationActionLabel: "Start nap now",
    insightTitle: wakeRisk.label === "Low" ? "Great rhythm so far!" : "Approaching ideal window",
    insightDetail: wakeRisk.label === "Low"
      ? `${childName}'s wake windows are in a healthy range for this age. Consistency is key.`
      : `${childName} is getting ready for sleep. Look for sleepy cues.`,
  };
}

export function getWakeWindowProgress(hoursSinceWake: number | null, baseline: WakeBaseline): WakeWindowProgress {
  const maxHours = Math.max(baseline.upperHours * 1.25, baseline.upperHours + 0.25);
  const rawPercent = hoursSinceWake === null ? 0 : (hoursSinceWake / maxHours) * 100;
  const thumbPercent = Math.max(0, Math.min(100, Math.round(rawPercent)));

  return {
    thumbPercent,
    fillPercent: thumbPercent,
    optimalStartPercent: Math.max(0, Math.min(100, Math.round((baseline.lowerHours / maxHours) * 100))),
    optimalEndPercent: Math.max(0, Math.min(100, Math.round((baseline.upperHours / maxHours) * 100))),
  };
}

export function buildSleepTimelineItems(logs: SleepEntry[], dayKey: string, limit = 4): SleepTimelineItem[] {
  const events = logs.flatMap((log) => {
    const duration = formatSleepDuration(getDurationMinutes(log));
    const sleepTitle = log.sleep_type === "night" ? "Night sleep" : "Nap";
    const sleepAccent = log.sleep_type === "night" ? "night" : "nap";
    const items: Array<SleepTimelineItem & { sortTime: number }> = [];

    if (getLocalDateKeyFromValue(log.ended_at) === dayKey) {
      items.push({
        id: `${log.id}-wake`,
        logId: log.id,
        timeLabel: formatClock(log.ended_at),
        title: "Wake",
        detail: log.sleep_type === "night" ? "Good morning!" : "Awake again",
        accent: "wake",
        sortTime: new Date(log.ended_at).getTime(),
      });
    }

    if (getLocalDateKeyFromValue(log.started_at) === dayKey) {
      items.push({
        id: `${log.id}-sleep`,
        logId: log.id,
        timeLabel: formatClock(log.started_at),
        title: sleepTitle,
        detail: duration,
        accent: sleepAccent,
        sortTime: new Date(log.started_at).getTime(),
      });
    }

    return items;
  });

  return events
    .filter((item) => !Number.isNaN(item.sortTime))
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, limit)
    .map(({ sortTime: _sortTime, ...item }) => item);
}

export function buildSleepGlanceStats({
  todayLogs,
  completedLogs,
  dayKey,
}: {
  todayLogs: SleepEntry[];
  completedLogs: SleepEntry[];
  dayKey: string;
}): SleepGlanceStat[] {
  const totalTodayMinutes = todayLogs.reduce((sum, log) => sum + getOverlapMinutesForDay(log, dayKey), 0);
  const napLogs = todayLogs.filter((log) => log.sleep_type === "nap");
  const longestNapMinutes = Math.max(0, ...napLogs.map(getDurationMinutes));
  const latestNightSleep = completedLogs.find((log) => log.sleep_type === "night") ?? null;

  return [
    {
      id: "total-sleep",
      label: "Total sleep",
      value: formatSleepDuration(totalTodayMinutes),
      detail: "Today",
      accent: "total",
    },
    {
      id: "naps",
      label: "Naps",
      value: String(napLogs.length),
      detail: "Today",
      accent: "naps",
    },
    {
      id: "longest-nap",
      label: "Longest nap",
      value: longestNapMinutes > 0 ? formatSleepDuration(longestNapMinutes) : "0m",
      detail: "Today",
      accent: "longest",
    },
    {
      id: "night-sleep",
      label: "Night sleep",
      value: latestNightSleep ? formatSleepDuration(getDurationMinutes(latestNightSleep)) : "0m",
      detail: latestNightSleep ? "Last night" : "No night yet",
      accent: "night",
    },
  ];
}

export function buildSleepPatternPreviewSegments(logs: SleepEntry[]): SleepPatternPreviewSegment[] {
  return [...logs]
    .sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime())
    .map((log) => {
      const start = new Date(log.started_at);
      const end = new Date(log.ended_at);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = Math.max(startMinutes + 20, end.getHours() * 60 + end.getMinutes());
      return {
        id: log.id,
        left: `${(startMinutes / 1440) * 100}%`,
        width: `${Math.max(((endMinutes - startMinutes) / 1440) * 100, 8)}%`,
        color: log.sleep_type === "night" ? "var(--color-info)" : "var(--color-cta)",
      };
    });
}

export function buildSleepWeekPreviewBars(
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>,
): SleepWeekPreviewBar[] {
  const maxValue = Math.max(...filledWeek.map((day) => day.count), 0);

  return filledWeek.map((day) => ({
    date: day.date,
    height: `${day.count === 0 ? 4 : 8 + (day.count / Math.max(maxValue, 1)) * 24}px`,
    opacity: day.count === 0 ? 0.3 : 1,
    weekdayLabel: day.weekdayLabel,
  }));
}

export function getSleepRecentHistoryDayLabel(value: string): string {
  const target = new Date(value);
  const now = new Date();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((todayStart - targetStart) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getSleepRecentHistorySummary(log: SleepEntry): string {
  return `${log.sleep_type === "night" ? "Night" : "Nap"}, ${formatSleepDuration(getDurationMinutes(log))}`;
}
