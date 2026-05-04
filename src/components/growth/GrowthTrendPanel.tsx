import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { GROWTH_METRIC_OPTIONS, type GrowthTrendMetricKey } from "../../lib/growth-metrics";
import type { ChildSex, GrowthEntry } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

const GrowthTrendChart = lazy(() =>
  import("./GrowthTrendChart").then((module) => ({ default: module.GrowthTrendChart })),
);

export function GrowthTrendPanel({
  activeMetric,
  chartFallback,
  childDateOfBirth,
  countryCode,
  lineColor,
  sex,
  sortedLogs,
  unit,
  onMetricChange,
}: {
  activeMetric: GrowthTrendMetricKey;
  chartFallback: ReactNode;
  childDateOfBirth: string;
  countryCode: string | null;
  lineColor: string;
  sex: ChildSex | null;
  sortedLogs: GrowthEntry[];
  unit: string;
  onMetricChange: (metric: GrowthTrendMetricKey) => void;
}) {
  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[20px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4">
        <div className="min-w-0">
          <p className="text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1.12rem]">
            The trend line
          </p>
          <p className="mt-1 max-w-[48ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.78rem]">
            Track how growth is trending over time.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {GROWTH_METRIC_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onMetricChange(item.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[0.72rem] font-semibold leading-none transition-colors md:px-4",
                activeMetric === item.key
                  ? "border-[var(--color-home-card-border)] bg-[var(--color-surface-tint)] text-[var(--color-primary)]"
                  : "border-[var(--color-home-card-border)] bg-[var(--color-tracker-chip-surface)] text-[var(--color-tracker-chip-text)] hover:bg-[var(--color-tracker-pill-surface-hover)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Suspense fallback={chartFallback}>
            <GrowthTrendChart
              logs={sortedLogs}
              metric={activeMetric}
              unit={unit}
              lineColor={lineColor}
              dateOfBirth={childDateOfBirth}
              sex={sex}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
