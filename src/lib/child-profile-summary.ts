import type { Child, GrowthEntry, UnitSystem } from "./types";
import { formatGrowthValue } from "./units";
import { parseLocalDate } from "./utils";

type GrowthMeasurementKey = keyof Pick<GrowthEntry, "weight_kg" | "height_cm">;

function getCalendarMonthCount(start: Date, end: Date): number {
  let totalMonths = ((end.getFullYear() - start.getFullYear()) * 12) + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) totalMonths -= 1;
  return Math.max(0, totalMonths);
}

export function getChildProfileAgeLabel(dateOfBirth: string, referenceDate = new Date()): string {
  const birth = parseLocalDate(dateOfBirth);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (birth.getTime() > today.getTime()) return "";

  const months = getCalendarMonthCount(birth, today);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} old`;
  }

  const years = Math.max(1, Math.floor(months / 12));
  return `${years} year${years === 1 ? "" : "s"} old`;
}

function getLatestMeasurement(logs: GrowthEntry[], key: GrowthMeasurementKey): number | null {
  return logs.find((log) => log[key] !== null)?.[key] ?? null;
}

export function buildChildProfileSubtitleParts({
  child,
  growthLogs = [],
  unitSystem = "metric",
  referenceDate = new Date(),
}: {
  child: Child;
  growthLogs?: GrowthEntry[];
  unitSystem?: UnitSystem;
  referenceDate?: Date;
}): string[] {
  const ageLabel = getChildProfileAgeLabel(child.date_of_birth, referenceDate);
  const parts = ageLabel ? [ageLabel] : [];

  const latestWeightKg = getLatestMeasurement(growthLogs, "weight_kg");
  const latestHeightCm = getLatestMeasurement(growthLogs, "height_cm");

  if (latestWeightKg !== null) {
    parts.push(formatGrowthValue("weight_kg", latestWeightKg, unitSystem, { maximumFractionDigits: 1 }));
  }

  if (latestHeightCm !== null) {
    parts.push(formatGrowthValue("height_cm", latestHeightCm, unitSystem, { maximumFractionDigits: 1 }));
  }

  return parts;
}
