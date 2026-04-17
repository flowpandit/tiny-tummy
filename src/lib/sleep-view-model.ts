import { formatSleepDuration, getDurationMinutes } from "./sleep-insights";
import type { SleepEntry } from "./types";

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
