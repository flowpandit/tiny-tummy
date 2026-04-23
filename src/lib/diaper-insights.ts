import { BITSS_TYPES, STOOL_COLORS } from "./constants";
import { getRelativeDayLabel } from "./date-labels";
import {
  diaperIncludesStool,
  diaperIncludesWet,
  getChildAgeDays,
  getDiaperTypeLabel,
  getUrineColorLabel,
} from "./diaper";
import { formatLocalDateKey, isOnLocalDay, timeSince } from "./utils";
import type { DiaperEntry } from "./types";

export interface DiaperPrediction {
  title: string;
  detail: string;
}

export interface DiaperRingDisplay {
  value: string;
  unit: string;
  label: string;
  gradient: string;
}

export interface HydrationStatus {
  tone: "healthy" | "info" | "cta";
  title: string;
  description: string;
}

export interface DiaperPatternTone {
  bg: string;
  border: string;
  text: string;
}

export function getValidDiaperTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getDayKey(date: Date = new Date()): string {
  return formatLocalDateKey(date);
}

export function getRecentHistoryDayLabel(dateStr: string): string {
  if (getValidDiaperTimestamp(dateStr) === null) {
    return "Logged";
  }
  return getRelativeDayLabel(dateStr);
}

export function getRelevantLogs(logs: DiaperEntry[], type: "wet" | "dirty") {
  return logs.filter((log) => (
    type === "wet"
      ? diaperIncludesWet(log.diaper_type)
      : diaperIncludesStool(log.diaper_type)
  ));
}

export function getTodayDiaperCounts(logs: DiaperEntry[], dayKey = getDayKey()) {
  const todayLogs = logs.filter((log) => isOnLocalDay(log.logged_at, dayKey));

  return {
    todayLogs,
    wetCount: todayLogs.filter((log) => diaperIncludesWet(log.diaper_type)).length,
    dirtyCount: todayLogs.filter((log) => diaperIncludesStool(log.diaper_type)).length,
    mixedCount: todayLogs.filter((log) => log.diaper_type === "mixed").length,
  };
}

function formatRange(hours: number[]) {
  const [start, end] = hours;
  if (end < 24) return `${Math.round(start)}-${Math.round(end)}h`;
  return `${(start / 24).toFixed(1)}-${(end / 24).toFixed(1)}d`;
}

export function getPrediction(
  logs: DiaperEntry[],
  dateOfBirth: string,
  type: "wet" | "dirty",
): DiaperPrediction {
  const relevant = getRelevantLogs(logs, type).slice(0, 8);
  const ageDays = getChildAgeDays(dateOfBirth);
  const baseline = type === "wet"
    ? ageDays < 14 ? [2, 4] : ageDays < 180 ? [2, 5] : ageDays < 365 ? [3, 6] : [4, 8]
    : ageDays < 14 ? [4, 12] : ageDays < 56 ? [4, 18] : ageDays < 180 ? [8, 48] : ageDays < 365 ? [12, 36] : [18, 48];

  if (relevant.length < 2) {
    return {
      title: type === "wet" ? "Wet rhythm baseline" : "Dirty rhythm baseline",
      detail: `Expect a usual range around ${formatRange(baseline)} until more logs personalise it.`,
    };
  }

  const intervals: number[] = [];
  for (let index = 0; index < relevant.length - 1; index += 1) {
    const current = getValidDiaperTimestamp(relevant[index].logged_at);
    const next = getValidDiaperTimestamp(relevant[index + 1].logged_at);
    if (current === null || next === null) {
      continue;
    }
    const intervalHours = (current - next) / 3600000;
    if (intervalHours > 0 && intervalHours < 72) {
      intervals.push(intervalHours);
    }
  }

  if (intervals.length === 0) {
    return {
      title: type === "wet" ? "Wet rhythm baseline" : "Dirty rhythm baseline",
      detail: `Expect a usual range around ${formatRange(baseline)} until the pattern settles.`,
    };
  }

  const averageHours = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const earliest = Math.max(1, averageHours * 0.7);
  const latest = averageHours * 1.3;

  return {
    title: type === "wet" ? "Next wet diaper" : "Next dirty diaper",
    detail: `Recent logs suggest roughly every ${Math.round(averageHours)}h, usually landing in a ${formatRange([earliest, latest])} window.`,
  };
}

export function getHydrationStatus(logs: DiaperEntry[], symptomType?: string): HydrationStatus {
  const wetLogs = getRelevantLogs(logs, "wet");
  const lastValidWetTimestamp = wetLogs.reduce<number | null>((latest, log) => {
    const timestamp = getValidDiaperTimestamp(log.logged_at);
    if (timestamp === null) return latest;
    return latest === null ? timestamp : Math.max(latest, timestamp);
  }, null);
  const todayWetCount = wetLogs.filter((log) => isOnLocalDay(log.logged_at, getDayKey())).length;
  const recentDarkUrine = wetLogs.some((log) => {
    const timestamp = getValidDiaperTimestamp(log.logged_at);
    return timestamp !== null
      && log.urine_color === "dark"
      && Date.now() - timestamp < 24 * 3600000;
  });
  const hoursSinceWet = lastValidWetTimestamp !== null
    ? (Date.now() - lastValidWetTimestamp) / 3600000
    : null;

  if (symptomType === "dehydration_concern" || recentDarkUrine || (hoursSinceWet !== null && hoursSinceWet >= 8)) {
    return {
      tone: "cta",
      title: "Hydration needs a check",
      description: "Wet output is light, late, or darker than usual. Recheck feeding and hydration context.",
    };
  }

  if (todayWetCount < 4 || (hoursSinceWet !== null && hoursSinceWet >= 5)) {
    return {
      tone: "info",
      title: "Watch wet output",
      description: "Keep logging wet diapers so hydration changes are easier to spot early.",
    };
  }

  return {
    tone: "healthy",
    title: "Wet output looks steady",
    description: "Recent wet diapers suggest hydration is staying in a normal-looking rhythm.",
  };
}

export function getPredictionRingDisplay(prediction: DiaperPrediction): DiaperRingDisplay {
  const match = prediction.detail.match(/every (\d+)h/);
  const hours = match?.[1] ?? "--";

  return {
    value: hours,
    unit: "hrs",
    label: "Typical gap",
    gradient: "conic-gradient(from 210deg, var(--color-cta) 0deg, var(--color-gold) 170deg, var(--color-apricot) 360deg)",
  };
}

export function getHydrationRingDisplay(
  status: HydrationStatus,
  todayWetCount: number,
): DiaperRingDisplay {
  return {
    value: `${todayWetCount}`,
    unit: "today",
    label: status.tone === "cta" ? "Needs watch" : status.tone === "info" ? "Keep logging" : "Hydration",
    gradient: status.tone === "cta"
      ? "conic-gradient(from 210deg, #f59b7a 0deg, #d86a50 200deg, #f0c6b6 360deg)"
      : status.tone === "info"
        ? "conic-gradient(from 210deg, var(--color-info) 0deg, #8aa7ea 180deg, #c1d4ff 360deg)"
        : "conic-gradient(from 210deg, var(--color-healthy) 0deg, #9dcf9d 180deg, #d8edd6 360deg)",
  };
}

export function getHydrationAccentColor(tone: HydrationStatus["tone"]): string {
  if (tone === "cta") return "var(--color-alert)";
  if (tone === "info") return "var(--color-info)";
  return "var(--color-healthy)";
}

export function getHydrationBadgeLabel(tone: HydrationStatus["tone"]): string {
  if (tone === "cta") return "Watch";
  if (tone === "info") return "Monitor";
  return "Stable";
}

export function getHydrationBadgeClassName(tone: HydrationStatus["tone"]): string {
  if (tone === "cta") return "bg-[var(--color-alert-bg)] text-[var(--color-alert)]";
  if (tone === "info") return "bg-[var(--color-info-bg)] text-[var(--color-info)]";
  return "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]";
}

export function getStoolShortLabel(stoolType?: number | null): string | null {
  if (!stoolType) return null;
  const stoolLabel = BITSS_TYPES.find((item) => item.type === stoolType)?.label;
  return stoolLabel?.split(" ")[0] ?? null;
}

export function getDiaperSummary(log: DiaperEntry): string {
  const stoolLabel = getStoolShortLabel(log.stool_type);
  const urineLabel = getUrineColorLabel(log.urine_color);
  return [
    getDiaperTypeLabel(log.diaper_type),
    urineLabel,
    stoolLabel,
  ].filter(Boolean).join(" · ");
}

export function getRecentHistoryDiaperIcon(
  diaperType: DiaperEntry["diaper_type"],
  icons: Record<DiaperEntry["diaper_type"], string>,
): string {
  return icons[diaperType];
}

export function getDiaperPatternTone(diaperType: DiaperEntry["diaper_type"]): DiaperPatternTone {
  if (diaperType === "wet") {
    return {
      bg: "color-mix(in srgb, var(--color-info) 32%, transparent)",
      border: "color-mix(in srgb, var(--color-info) 52%, transparent)",
      text: "var(--color-info)",
    };
  }
  if (diaperType === "mixed") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 34%, transparent) 0%, color-mix(in srgb, #c08937 34%, transparent) 100%)",
      border: "color-mix(in srgb, #9f8dbd 48%, transparent)",
      text: "var(--color-primary)",
    };
  }
  return {
    bg: "color-mix(in srgb, #c08937 32%, transparent)",
    border: "color-mix(in srgb, #c08937 54%, transparent)",
    text: "#9a6b2f",
  };
}

export function getDirtyDiaperMeta(log: DiaperEntry | null) {
  if (!log) return null;
  const loggedAt = getValidDiaperTimestamp(log.logged_at);

  return {
    timeSinceLabel: loggedAt === null ? "Recently logged" : timeSince(log.logged_at),
    stoolLabel: getStoolShortLabel(log.stool_type),
    stoolColorLabel: log.color
      ? STOOL_COLORS.find((item) => item.value === log.color)?.label ?? log.color
      : null,
  };
}
