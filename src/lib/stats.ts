import type { ColorCount, ConsistencyPoint, DailyFrequency, PoopEntry } from "./types";

export interface FilledFrequencyDay {
  date: string;
  count: number;
  weekdayLabel: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fillDailyFrequencyDays(data: DailyFrequency[], days: number): FilledFrequencyDay[] {
  const map = new Map(data.map((day) => [day.date, Number(day.count)]));
  const filled: FilledFrequencyDay[] = [];
  const now = new Date();

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = formatLocalDateKey(date);

    filled.push({
      date: key,
      count: map.get(key) ?? 0,
      weekdayLabel: date.toLocaleDateString(undefined, { weekday: "short" }),
    });
  }

  return filled;
}

export function getDominantStoolType(points: ConsistencyPoint[]): number | null {
  if (points.length === 0) return null;

  const counts = new Map<number, number>();
  for (const point of points) {
    counts.set(point.stool_type, (counts.get(point.stool_type) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function getDominantStoolColor(colors: ColorCount[]): string | null {
  return colors[0]?.color ?? null;
}

export function getRecentNoPoopDates(logs: PoopEntry[], days: number): Set<string> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return new Set(
    logs
      .filter((log) => log.is_no_poop === 1)
      .filter((log) => {
        const loggedAt = new Date(log.logged_at);
        return !Number.isNaN(loggedAt.getTime()) && loggedAt >= cutoff;
      })
      .map((log) => formatLocalDateKey(new Date(log.logged_at))),
  );
}
