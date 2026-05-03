import type { SleepType } from "./types";

export interface SleepTimerSession {
  sleepType: SleepType;
  startedAt: string;
  notes: string;
}

export function getSleepTimerSettingKey(childId: string): string {
  return `sleep_timer:session:${childId}`;
}

export function parseSleepTimerSession(raw: string | null): SleepTimerSession | null {
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SleepTimerSession>;
    if (!parsed.startedAt || (parsed.sleepType !== "nap" && parsed.sleepType !== "night")) {
      return null;
    }

    return {
      sleepType: parsed.sleepType,
      startedAt: parsed.startedAt,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return null;
  }
}

export function formatSleepTimerClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatSleepTimerSummary(totalMs: number): string {
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatSleepTimerInsightElapsed(totalMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

export function getSleepTimerElapsedMs(session: SleepTimerSession, now = Date.now()): number {
  return Math.max(0, now - new Date(session.startedAt).getTime());
}

export function getLocalTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
