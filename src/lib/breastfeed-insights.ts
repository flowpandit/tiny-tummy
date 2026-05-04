import { getRelativeDayLabel } from "./date-labels";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "./feeding";
import type { BreastSide, FeedingEntry, UnitSystem } from "./types";
import { getRoundedDurationMinutes } from "./breastfeeding";

export type BreastfeedPatternKind = BreastSide | "bottle" | "other";

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
      dot: "#c84c89",
    };
  }
  if (side === "right") {
    return {
      mirrored: true,
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 30%, transparent) 0%, color-mix(in srgb, #6f8df0 30%, transparent) 100%)",
      dot: "#6f8df0",
    };
  }
  return {
    mirrored: false,
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 26%, transparent) 0%, color-mix(in srgb, #84a7ff 26%, transparent) 100%)",
    dot: "#8f83c9",
  };
}

export function getBreastHistorySummary(log: FeedingEntry): string {
  const sideLabel = log.breast_side === "both" ? "Both sides" : log.breast_side === "right" ? "Right side" : "Left side";
  const durationLabel = log.duration_minutes ? `${log.duration_minutes} min` : "Logged";
  return `${sideLabel} · ${durationLabel}`;
}

export function getBreastfeedContextHistoryTitle(log: FeedingEntry): string {
  return getFeedingEntryPrimaryLabel(log);
}

export function getBreastfeedContextHistorySummary(log: FeedingEntry, unitSystem: UnitSystem): string {
  if (log.food_type === "breast_milk" && log.breast_side) {
    return getBreastHistorySummary(log);
  }

  const detailLabel = getFeedingEntryDetailParts(log, unitSystem).join(" · ");
  return detailLabel || getFeedingEntrySecondaryText(log) || "Logged";
}

export function getBreastPatternLabel(side: BreastSide | null) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "Both";
}

export function getBreastfeedPatternKind(log: FeedingEntry): BreastfeedPatternKind {
  if (
    log.food_type === "breast_milk"
    && (log.breast_side === "left" || log.breast_side === "right" || log.breast_side === "both")
  ) {
    return log.breast_side;
  }

  if (log.food_type === "bottle" || log.food_type === "formula" || log.food_type === "breast_milk") {
    return "bottle";
  }

  return "other";
}

export function getBreastfeedPatternLabel(kind: BreastfeedPatternKind) {
  if (kind === "bottle") return "Bottle";
  if (kind === "other") return "Other";
  return getBreastPatternLabel(kind);
}

export function getBreastfeedPatternTone(kind: BreastfeedPatternKind) {
  if (kind === "left") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 70%, white) 0%, color-mix(in srgb, #c84c89 76%, white) 100%)",
      border: "color-mix(in srgb, #c84c89 72%, white)",
      text: "color-mix(in srgb, #7a2453 88%, black)",
    };
  }
  if (kind === "right") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 72%, white) 0%, color-mix(in srgb, #6f8df0 78%, white) 100%)",
      border: "color-mix(in srgb, #6f8df0 72%, white)",
      text: "color-mix(in srgb, #28498c 88%, black)",
    };
  }
  if (kind === "bottle") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #73b891 72%, white) 0%, color-mix(in srgb, #4f9f72 78%, white) 100%)",
      border: "color-mix(in srgb, #4f9f72 72%, white)",
      text: "color-mix(in srgb, #2f704d 90%, black)",
    };
  }
  if (kind === "other") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #f2b66d 76%, white) 0%, color-mix(in srgb, #dc9251 82%, white) 100%)",
      border: "color-mix(in srgb, #dc9251 74%, white)",
      text: "color-mix(in srgb, #8a5529 92%, black)",
    };
  }
  return {
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 58%, white) 0%, color-mix(in srgb, #84a7ff 62%, white) 100%)",
    border: "color-mix(in srgb, #8f83c9 70%, white)",
    text: "color-mix(in srgb, #55487f 90%, black)",
  };
}

export function getBreastPatternTone(side: BreastSide | null) {
  return getBreastfeedPatternTone(side ?? "both");
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
