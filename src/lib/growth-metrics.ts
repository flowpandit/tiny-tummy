import type { GrowthMetricKey } from "./growth-view";

export const GROWTH_METRIC_OPTIONS = [
  { key: "weight_kg", label: "Weight", color: "var(--color-cta)", tone: "cta" as const },
  { key: "height_cm", label: "Length", color: "var(--color-healthy)", tone: "healthy" as const },
  { key: "head_circumference_cm", label: "Head", color: "var(--color-info)", tone: "info" as const },
] as const satisfies ReadonlyArray<{
  key: GrowthMetricKey;
  label: string;
  color: string;
  tone: "cta" | "healthy" | "info";
}>;

export type GrowthTrendMetricKey = (typeof GROWTH_METRIC_OPTIONS)[number]["key"];
