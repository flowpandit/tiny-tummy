import { getRelativeDayLabel } from "./date-labels";
import type { BreastSide, FeedingEntry } from "./types";
import { getRoundedDurationMinutes } from "./breastfeeding";

export interface DurationRingDisplay {
  value: string;
  unit: string;
  gradient: string;
}

export function getRecentHistoryDayLabel(dateStr: string): string {
  return getRelativeDayLabel(dateStr);
}

export function getBreastHistoryTone(side: BreastSide | null) {
  if (side === "left") {
    return {
      mirrored: false,
      bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 30%, transparent) 0%, color-mix(in srgb, #c84c89 30%, transparent) 100%)",
    };
  }
  if (side === "right") {
    return {
      mirrored: true,
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 30%, transparent) 0%, color-mix(in srgb, #6f8df0 30%, transparent) 100%)",
    };
  }
  return {
    mirrored: false,
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 26%, transparent) 0%, color-mix(in srgb, #84a7ff 26%, transparent) 100%)",
  };
}

export function getBreastHistorySummary(log: FeedingEntry): string {
  const sideLabel = log.breast_side === "both" ? "Both sides" : log.breast_side === "right" ? "Right side" : "Left side";
  const durationLabel = log.duration_minutes ? `${log.duration_minutes} min` : "Logged";
  return `${sideLabel} · ${durationLabel}`;
}

export function getBreastPatternLabel(side: BreastSide | null) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "Both";
}

export function getBreastPatternTone(side: BreastSide | null) {
  if (side === "left") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 70%, white) 0%, color-mix(in srgb, #c84c89 76%, white) 100%)",
      border: "color-mix(in srgb, #c84c89 72%, white)",
      text: "color-mix(in srgb, #7a2453 88%, black)",
    };
  }
  if (side === "right") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 72%, white) 0%, color-mix(in srgb, #6f8df0 78%, white) 100%)",
      border: "color-mix(in srgb, #6f8df0 72%, white)",
      text: "color-mix(in srgb, #28498c 88%, black)",
    };
  }
  return {
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 58%, white) 0%, color-mix(in srgb, #84a7ff 62%, white) 100%)",
    border: "color-mix(in srgb, #8f83c9 70%, white)",
    text: "color-mix(in srgb, #55487f 90%, black)",
  };
}

export function getDurationRingDisplay(durationMs: number, gradient: string): DurationRingDisplay {
  if (durationMs <= 0) {
    return { value: "0", unit: "mins", gradient };
  }

  const roundedMinutes = getRoundedDurationMinutes(durationMs);
  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    return { value: `${hours}`, unit: minutes > 0 ? `${minutes}m` : "hrs", gradient };
  }

  return { value: `${roundedMinutes}`, unit: "mins", gradient };
}
