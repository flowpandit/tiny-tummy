import { useMemo, useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useGrowthLogs } from "../hooks/useGrowthLogs";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/ui/page-intro";
import { EmptyState, InsetPanel, PageBody, SectionHeading, StatGrid, StatTile } from "../components/ui/page-layout";
import { GrowthLogSheet } from "../components/growth/GrowthLogSheet";
import { GrowthTrendChart } from "../components/growth/GrowthTrendChart";
import { cn } from "../lib/cn";
import { formatDate, getAgeLabelFromDob, timeSince } from "../lib/utils";
import type { GrowthEntry } from "../lib/types";

const METRIC_OPTIONS = [
  { key: "weight_kg", label: "Weight", unit: "kg", color: "var(--color-cta)", tone: "cta" as const },
  { key: "height_cm", label: "Length", unit: "cm", color: "var(--color-healthy)", tone: "healthy" as const },
  { key: "head_circumference_cm", label: "Head", unit: "cm", color: "var(--color-info)", tone: "info" as const },
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
    <PageBody>
      <PageIntro
        eyebrow="Measurements"
        title="Growth"
        description="Keep weight, length, and head measurements in one calm place without turning Tiny Tummy into a full medical record system."
        meta={`${activeChild.name} · ${getAgeLabelFromDob(activeChild.date_of_birth)}${latest ? ` · last logged ${timeSince(latest.measured_at)}` : ""}`}
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
      />

      {sortedLogs.length === 0 ? (
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 20.25h9M9 3.75h6M10.5 20.25V6a1.5 1.5 0 0 1 3 0v14.25M7.5 8.25h9" />
            </svg>
          )}
          title="Start with one simple measurement"
          description="Add weight, length, head circumference, or any combination you have today."
          action={(
            <Button variant="primary" onClick={() => setSheetOpen(true)}>
              Add first measurement
            </Button>
          )}
        />
      ) : (
        <>
          <StatGrid>
            <StatTile
              eyebrow="Weight"
              value={formatMetricValue(latestWeight, "kg")}
              description={formatDelta(latestWeight, previousWeight, "kg") ?? "Add another measurement to see change over time."}
              tone="cta"
            />
            <StatTile
              eyebrow="Length / height"
              value={formatMetricValue(latestHeight, "cm")}
              description={formatDelta(latestHeight, previousHeight, "cm") ?? "Add another measurement to see change over time."}
              tone="healthy"
            />
            <StatTile
              eyebrow="Head circumference"
              value={formatMetricValue(latestHead, "cm")}
              description={formatDelta(latestHead, previousHead, "cm") ?? "Add another measurement to see change over time."}
              tone="info"
            />
          </StatGrid>

          <InsetPanel className="space-y-4">
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
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Current trend focus</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">{metricMeta.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {activeMetricLogs.length > 1 && activeMetricOldest
                    ? `${activeMetricLogs.length} points logged since ${formatDate(activeMetricOldest.measured_at)}.`
                    : "Add another point for this metric to make the trend more useful."}
                </p>
              </div>
            </div>
            {latest?.notes && (
              <InsetPanel className="bg-[var(--color-surface)] p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest note</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{latest.notes}</p>
              </InsetPanel>
            )}
          </InsetPanel>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Growth trend"
                description="A light trend view for the measurements you have logged so far."
                action={(
                  <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                    Add measurement
                  </Button>
                )}
              />
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
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Points logged</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{activeMetricLogs.length}</p>
                </InsetPanel>
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Latest value</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {formatMetricValue(activeMetricLatest?.[activeMetric] ?? null, metricMeta.unit)}
                  </p>
                </InsetPanel>
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Supportive note</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    This is a simple trend view, not a percentile or diagnosis tool.
                  </p>
                </InsetPanel>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Recent measurements"
                description="Latest entries first, with notes when you added them."
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {sortedLogs.map((log) => (
                  <InsetPanel key={log.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{formatDate(log.measured_at)}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-soft)]">{timeSince(log.measured_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <InsetPanel className="bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Weight</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.weight_kg, "kg")}</p>
                      </InsetPanel>
                      <InsetPanel className="bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Length</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.height_cm, "cm")}</p>
                      </InsetPanel>
                      <InsetPanel className="bg-[var(--color-surface)] p-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Head</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{formatMetricValue(log.head_circumference_cm, "cm")}</p>
                      </InsetPanel>
                    </div>
                    {log.notes && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {log.notes}
                      </p>
                    )}
                  </InsetPanel>
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
    </PageBody>
  );
}
