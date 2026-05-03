import type { BreastSide } from "./types";

export type BreastTimerSide = Extract<BreastSide, "left" | "right">;

export interface BreastfeedingSessionState {
  durations: Record<"left" | "right", number>;
  activeSide: BreastTimerSide | null;
  activeStartedAt: number | null;
  lastUsedSide: BreastSide | null;
}

export function getBreastfeedingLastSideSettingKey(childId: string): string {
  return `breastfeeding:last_side:${childId}`;
}

export function getBreastfeedingSessionSettingKey(childId: string): string {
  return `breastfeeding:session:${childId}`;
}

export function formatBreastfeedingClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBreastfeedingSummary(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function getSuggestedBreastStartSide(lastUsedSide: BreastSide | null): BreastTimerSide | null {
  if (lastUsedSide === "left" || lastUsedSide === "right") return lastUsedSide;
  return null;
}

export function getBreastfeedingNextSideReason(lastUsedSide: BreastSide | null, activeSide: BreastTimerSide | null): string {
  if (getSuggestedBreastStartSide(lastUsedSide) && !activeSide) {
    return "Starting on the previously used side helps to keep milk supply balanced and prevent engorgement.";
  }

  return "Tiny Tummy will remember the last side after you save a session.";
}

export function getRoundedDurationMinutes(totalMs: number): number {
  return Math.max(1, Math.round(totalMs / 60000));
}

export function getEmptyBreastfeedingSession(lastUsedSide: BreastSide | null = null): BreastfeedingSessionState {
  return {
    durations: { left: 0, right: 0 },
    activeSide: null,
    activeStartedAt: null,
    lastUsedSide,
  };
}

export function parseBreastfeedingSession(raw: string | null): BreastfeedingSessionState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<BreastfeedingSessionState>;
    const left = typeof parsed.durations?.left === "number" ? parsed.durations.left : 0;
    const right = typeof parsed.durations?.right === "number" ? parsed.durations.right : 0;
    const activeSide = parsed.activeSide === "left" || parsed.activeSide === "right" ? parsed.activeSide : null;
    const activeStartedAt = typeof parsed.activeStartedAt === "number" ? parsed.activeStartedAt : null;
    const lastUsedSide = parsed.lastUsedSide === "left" || parsed.lastUsedSide === "right" ? parsed.lastUsedSide : null;

    return {
      durations: {
        left: Math.max(0, left),
        right: Math.max(0, right),
      },
      activeSide,
      activeStartedAt,
      lastUsedSide,
    };
  } catch {
    return null;
  }
}
