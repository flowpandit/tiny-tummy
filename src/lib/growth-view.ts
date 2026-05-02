import { getAgeInMonths } from "./growth-percentile-math";
import type { GrowthEntry, UnitSystem } from "./types";
import { formatGrowthValue } from "./units";

export type GrowthMetricKey = keyof Pick<GrowthEntry, "weight_kg" | "height_cm" | "head_circumference_cm">;

export function countGrowthMeasures(log: GrowthEntry | null): number {
  if (!log) return 0;

  return [log.weight_kg, log.height_cm, log.head_circumference_cm].filter((value) => value !== null).length;
}

export function formatCompactGrowthSummary(entry: GrowthEntry, unitSystem: UnitSystem): string {
  const parts = [
    entry.weight_kg !== null ? formatGrowthValue("weight_kg", entry.weight_kg, unitSystem) : null,
    entry.height_cm !== null ? formatGrowthValue("height_cm", entry.height_cm, unitSystem) : null,
    entry.head_circumference_cm !== null ? formatGrowthValue("head_circumference_cm", entry.head_circumference_cm, unitSystem) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Measurement logged";
}

export function formatGrowthAgeLabel(dateOfBirth: string, measuredAt: string): string {
  const ageMonths = getAgeInMonths(dateOfBirth, measuredAt);
  const roundedMonths = Math.round(ageMonths * 10) / 10;

  if (roundedMonths < 24) {
    const displayMonths = Number.isInteger(roundedMonths) ? roundedMonths.toFixed(0) : roundedMonths.toFixed(1);

    return `${displayMonths} months`;
  }

  const ageYears = ageMonths / 12;
  const roundedYears = Math.round(ageYears * 10) / 10;
  const displayYears = Number.isInteger(roundedYears) ? roundedYears.toFixed(0) : roundedYears.toFixed(1);

  return `${displayYears} years`;
}
