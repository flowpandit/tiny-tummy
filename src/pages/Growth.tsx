import { useMemo, useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useGrowthLogs } from "../hooks/useGrowthLogs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { GrowthLogSheet } from "../components/growth/GrowthLogSheet";
import { GrowthTrendChart } from "../components/growth/GrowthTrendChart";
import { cn } from "../lib/cn";
import { formatDate, getAgeLabelFromDob, timeSince } from "../lib/utils";
import type { GrowthEntry } from "../lib/types";

const METRIC_OPTIONS = [
  {
    key: "weight_kg",
    label: "Weight",
    unit: "kg",
    color: "var(--color-cta)",
    surface: "var(--color-surface-tint)",
    border: "var(--color-peach)",
  },
  {
    key: "height_cm",
    label: "Length",
    unit: "cm",
    color: "var(--color-healthy)",
    surface: "var(--color-healthy-bg)",
    border: "var(--color-mint)",
  },
  {
    key: "head_circumference_cm",
    label: "Head",
    unit: "cm",
    color: "var(--color-info)",
    surface: "var(--color-info-bg)",
    border: "color-mix(in srgb, var(--color-info) 18%, transparent)",
  },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} ${unit}`;
}

function getPreviousValue(logs: GrowthEntry[], metric: MetricKey): number | null {
  const matches = logs.filter((log) => log[metric] !== null);
  return matches[1]?.[metric] ?? null;
}

function formatDelta(current: number | null, previous: number | null, unit: string): string | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return `No change from the previous ${unit} check`;
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)} ${unit} since the previous measurement`;
}

function countLoggedMetrics(log: GrowthEntry | null): number {
  if (!log) return 0;
  return [log.weight_kg, log.height_cm, log.head_circumference_cm].filter((value) => value !== null).length;
}

export function Growth() {
  const { activeChild } = useChildContext();
  const { logs, latest, refresh } = useGrowthLogs(activeChild?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight_kg");

  const sortedLogs = useMemo(
    () => [...logs].sort((left, right) => new Date(right.measured_at).getTime() - new Date(left.measured_at).getTime()),
    [logs],
  );

  if (!activeChild) return null;

  const latestWeight = latest?.weight_kg ?? null;
  const latestHeight = latest?.height_cm ?? null;
  const latestHead = latest?.head_circumference_cm ?? null;
  const previousWeight = getPreviousValue(sortedLogs, "weight_kg");
  const previousHeight = getPreviousValue(sortedLogs, "height_cm");
  const previousHead = getPreviousValue(sortedLogs, "head_circumference_cm");
  const metricMeta = METRIC_OPTIONS.find((item) => item.key === activeMetric)!;
  const activeMetricLogs = sortedLogs.filter((log) => log[activeMetric] !== null);
  const activeMetricLatest = activeMetricLogs[0] ?? null;
  const activeMetricOldest = activeMetricLogs[activeMetricLogs.length - 1] ?? null;
  const latestMetricCount = countLoggedMetrics(latest);

  return (
    <div className="px-4 py-5">
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Measurements</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              Growth
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
              Keep weight, length, and head measurements in one calm place without turning Tiny Tummy into a full medical record system.
            </p>
          </div>
          <Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>
            Add
          </Button>
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-soft)]">
          {activeChild.name} · {getAgeLabelFromDob(activeChild.date_of_birth)}
          {latest ? ` · last logged ${timeSince(latest.measured_at)}` : ""}
        </p>
      </div>

      {sortedLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 20.25h9M9 3.75h6M10.5 20.25V6a1.5 1.5 0 0 1 3 0v14.25M7.5 8.25h9" />
              </svg>
            </div>
            <p className="mt-4 text-xl font-semibold text-[var(--color-text)]">Start with one simple measurement</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Add weight, length, head circumference, or any combination you have today.
            </p>
            <Button variant="primary" className="mt-5" onClick={() => setSheetOpen(true)}>
              Add first measurement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                key: "weight_kg",
                label: "Weight",
                value: formatMetricValue(latestWeight, "kg"),
                delta: formatDelta(latestWeight, previousWeight, "kg"),
              },
              {
                key: "height_cm",
                label: "Length / height",
                value: formatMetricValue(latestHeight, "cm"),
                delta: formatDelta(latestHeight, previousHeight, "cm"),
              },
              {
                key: "head_circumference_cm",
                label: "Head circumference",
                value: formatMetricValue(latestHead, "cm"),
                delta: formatDelta(latestHead, previousHead, "cm"),
              },
            ].map((item) => (
              <Card
                key={item.label}
                className="border"
                style={{
                  backgroundColor: METRIC_OPTIONS.find((option) => option.key === item.key)?.surface,
                  borderColor: METRIC_OPTIONS.find((option) => option.key === item.key)?.border,
                }}
              >
                <CardContent className="py-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{item.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    {item.delta ?? "Add another measurement to see change over time."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4 border-[var(--color-border)] bg-[var(--color-bg)]">
            <CardContent className="py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest check-in</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                    {latest ? formatDate(latest.measured_at) : "No measurements yet"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {latestMetricCount > 0
                      ? `${latestMetricCount} of 3 measurements were captured in the latest session.`
                      : "Add a measurement to start seeing gentle trend context."}
                  </p>
                </div>
                <div className="sm:max-w-[280px]">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                    Current trend focus
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">{metricMeta.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    {activeMetricLogs.length > 1 && activeMetricOldest
                      ? `${activeMetricLogs.length} points logged since ${formatDate(activeMetricOldest.measured_at)}.`
                      : "Add another point for this metric to make the trend more useful."}
                  </p>
                </div>
              </div>
              {latest?.notes && (
                <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest note</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{latest.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Growth trend</CardTitle>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    A light trend view for the measurements you have logged so far.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                  Add measurement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {METRIC_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveMetric(item.key)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                      activeMetric === item.key
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <GrowthTrendChart
                logs={sortedLogs}
                metric={activeMetric}
                unit={metricMeta.unit}
                lineColor={metricMeta.color}
              />
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Points logged</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{activeMetricLogs.length}</p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Latest value</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {formatMetricValue(activeMetricLatest?.[activeMetric] ?? null, metricMeta.unit)}
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Supportive note</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    This is a simple trend view, not a percentile or diagnosis tool.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent measurements</CardTitle>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Latest entries first, with notes when you added them.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {sortedLogs.map((log) => (
                  <div key={log.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{formatDate(log.measured_at)}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-soft)]">{timeSince(log.measured_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Weight</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.weight_kg, "kg")}</p>
                      </div>
                      <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Length</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.height_cm, "cm")}</p>
                      </div>
                      <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Head</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.head_circumference_cm, "cm")}</p>
                      </div>
                    </div>
                    {log.notes && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <GrowthLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childId={activeChild.id}
        onLogged={refresh}
      />
    </div>
  );
}
