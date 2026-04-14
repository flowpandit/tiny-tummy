import type { SleepEntry } from "./types";

export interface HomeSleepSummary {
  totalMs: number;
  hoursValue: number;
  label: string;
  napCount: number;
}

export function buildHomeSleepSummary(sleepLogs: SleepEntry[], now = Date.now()): HomeSleepSummary {
  const totalMs = sleepLogs
    .filter((entry) => now - new Date(entry.started_at).getTime() < 24 * 60 * 60 * 1000)
    .reduce((sum, entry) => {
      const end = entry.ended_at ? new Date(entry.ended_at).getTime() : now;
      const start = new Date(entry.started_at).getTime();
      return sum + Math.max(0, end - start);
    }, 0);

  const napCount = sleepLogs.filter((entry) => entry.sleep_type === "nap").length;
  const wholeHours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.round((totalMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    totalMs,
    hoursValue: totalMs / (1000 * 60 * 60),
    label: totalMs > 0 ? `${wholeHours}h ${minutes}m` : "0h",
    napCount,
  };
}
