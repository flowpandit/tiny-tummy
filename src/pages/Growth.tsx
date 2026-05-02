import { lazy, Suspense, useMemo, useState } from "react";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useGrowthLogs } from "../hooks/useGrowthLogs";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EmptyState, InsetPanel, PageBody, SectionHeading } from "../components/ui/page-layout";
import { GrowthLogSheet } from "../components/growth/GrowthLogSheet";
import { TrackerEntryRow, TrackerEntryTable, TrackerMetricPanel, TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
import { cn } from "../lib/cn";
import { getGrowthPercentile } from "../lib/growth-percentiles";
import { detectGrowthCountryCode, getGrowthReferenceForAge } from "../lib/growth-reference";
import { formatDate, timeSince } from "../lib/utils";
import { formatGrowthSummary, formatGrowthValue, getGrowthUnitLabel } from "../lib/units";
import type { GrowthEntry } from "../lib/types";

const GrowthTrendChart = lazy(() =>
  import("../components/growth/GrowthTrendChart").then((module) => ({ default: module.GrowthTrendChart })),
);

const METRIC_OPTIONS = [
  { key: "weight_kg", label: "Weight", color: "var(--color-cta)", tone: "cta" as const },
  { key: "height_cm", label: "Length", color: "var(--color-healthy)", tone: "healthy" as const },
  { key: "head_circumference_cm", label: "Head", color: "var(--color-info)", tone: "info" as const },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]["key"];

function countLoggedMetrics(log: GrowthEntry | null): number {
  if (!log) return 0;
  return [log.weight_kg, log.height_cm, log.head_circumference_cm].filter((value) => value !== null).length;
}

function getAgeInYears(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();

  if (diffMs <= 0) return 0;

  return diffMs / (1000 * 60 * 60 * 24 * 365.2425);
}

function getFilledMetricCount(log: GrowthEntry | null): number {
  if (!log) return 0;
  return [log.weight_kg, log.height_cm, log.head_circumference_cm].filter((value) => value !== null).length;
}

function getMeasurementRing(
  displayValue: string,
  displayUnit: string,
  percentileLabel: string | null,
  fallbackLabel: string,
  gradient: string,
): { value: string; unit: string; gradient: string; label: string; detail: string } {
  if (displayValue === "—") {
    return {
      value: "—",
      unit: "not logged",
      gradient,
      label: fallbackLabel,
      detail: "",
    };
  }

  return {
    value: displayValue,
    unit: displayUnit,
    gradient,
    label: fallbackLabel,
    detail: percentileLabel ?? "",
  };
}

export function Growth() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const { logs, latest, refresh } = useGrowthLogs(activeChild?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<GrowthEntry | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight_kg");

  const sortedLogs = useMemo(
    () => [...logs].sort((left, right) => new Date(right.measured_at).getTime() - new Date(left.measured_at).getTime()),
    [logs],
  );

  if (!activeChild) return null;

  const latestWeight = latest?.weight_kg ?? null;
  const latestHeight = latest?.height_cm ?? null;
  const latestHead = latest?.head_circumference_cm ?? null;
  const growthCountryCode = detectGrowthCountryCode();
  const growthReference = getGrowthReferenceForAge(growthCountryCode, getAgeInYears(activeChild.date_of_birth));
  const metricMeta = METRIC_OPTIONS.find((item) => item.key === activeMetric)!;
  const activeMetricLogs = sortedLogs.filter((log) => log[activeMetric] !== null);
  const activeMetricLatest = activeMetricLogs[0] ?? null;
  const activeMetricOldest = activeMetricLogs[activeMetricLogs.length - 1] ?? null;
  const latestMetricCount = countLoggedMetrics(latest);
  const oldestLog = sortedLogs[sortedLogs.length - 1] ?? null;
  const totalMeasurementsLogged = sortedLogs.reduce((sum, log) => sum + getFilledMetricCount(log), 0);
  const sexMissing = !activeChild.sex;

  const getPercentileMeta = (log: GrowthEntry | null, metric: MetricKey) => {
    if (!log) return null;

    return getGrowthPercentile({
      countryCode: growthCountryCode,
      sex: activeChild.sex,
      dateOfBirth: activeChild.date_of_birth,
      measuredAt: log.measured_at,
      metric,
      value: log[metric],
    });
  };

  const latestWeightPercentile = getPercentileMeta(latest, "weight_kg");
  const latestHeightPercentile = getPercentileMeta(latest, "height_cm");
  const latestHeadPercentile = getPercentileMeta(latest, "head_circumference_cm");
  const activeMetricPercentile = getPercentileMeta(activeMetricLatest, activeMetric);
  const weightRing = getMeasurementRing(
    formatGrowthValue("weight_kg", latestWeight, unitSystem, { includeUnit: false }),
    getGrowthUnitLabel("weight_kg", unitSystem),
    latestWeightPercentile?.percentileLabel ?? null,
    "Weight",
    "var(--gradient-status-caution)",
  );
  const heightRing = getMeasurementRing(
    formatGrowthValue("height_cm", latestHeight, unitSystem, { includeUnit: false }),
    getGrowthUnitLabel("height_cm", unitSystem),
    latestHeightPercentile?.percentileLabel ?? null,
    "Length",
    "var(--gradient-status-healthy)",
  );
  const headRing = getMeasurementRing(
    formatGrowthValue("head_circumference_cm", latestHead, unitSystem, { includeUnit: false }),
    getGrowthUnitLabel("head_circumference_cm", unitSystem),
    latestHeadPercentile?.percentileLabel ?? null,
    "Head",
    "var(--gradient-status-head)",
  );

  const growthStatusHeadline = sexMissing
    ? "Percentiles are waiting on one profile detail"
    : latest
      ? "Growth percentiles are now anchored to the latest check-in"
      : "Start with the first measurement set";
  const growthStatusDescription = sexMissing
    ? "Set the child sex in Settings so weight, length, and head size can be compared against the right growth chart."
    : latest
      ? "The latest measurements now show where this child sits on the selected official growth reference, while the trend card below keeps the raw history visible."
      : "Once a first growth entry is logged, this page will show the latest values, percentile context, and trend direction together.";
  const growthStoryHeadline = sexMissing
    ? `${activeChild.name}'s growth story needs one missing detail`
    : activeMetricPercentile
      ? `${activeChild.name}'s ${metricMeta.label.toLowerCase()} is following a ${activeMetricPercentile.percentileLabel.toLowerCase()} path`
      : `${activeChild.name}'s growth story is starting to take shape`;
  const growthStoryDescription = latest
    ? `The latest check-in from ${formatDate(latest.measured_at)} is grounded against ${growthReference}, while the chart keeps the raw measurement history visible.`
    : "Add the first growth check-in to start building a story across weight, length, and head circumference.";

  const openAddSheet = () => {
    setEditingLog(null);
    setSheetOpen(true);
  };

  const openEditSheet = (log: GrowthEntry) => {
    setEditingLog(log);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingLog(null);
  };

  const chartFallback = (
    <div className="flex h-72 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] text-sm text-[var(--color-text-secondary)]">
      Loading trend chart...
    </div>
  );

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Growth story"
        description="Track measurements and percentile context in one place."
        action={<Button variant="cta" size="sm" onClick={openAddSheet}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="growth"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
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
            <Button variant="primary" onClick={openAddSheet}>
              Add first measurement
            </Button>
          )}
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative overflow-hidden px-4 pb-4 pt-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(241,201,176,0.5)_0%,rgba(255,252,247,0)_100%)]" />
                <div className="relative flex items-start justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-soft)]">Narrative overview</p>
                    <p className="mt-2 max-w-[12ch] text-[2.1rem] font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--color-text)]">
                      {growthStoryHeadline}
                    </p>
                    <p className="mt-3 max-w-[40ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                      {growthStoryDescription}
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-[var(--shadow-soft)]",
                    sexMissing
                      ? "bg-[var(--color-caution-bg)] text-[var(--color-caution)]"
                      : "bg-[var(--color-surface-tint)] text-[var(--color-primary)]",
                  )}>
                    {sexMissing ? "Needs profile detail" : growthReference}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                <TrackerMetricRing
                  value={weightRing.value}
                  unit={weightRing.unit}
                  detail={weightRing.detail}
                  label="Weight"
                  gradient={weightRing.gradient}
                />
                <TrackerMetricRing
                  value={heightRing.value}
                  unit={heightRing.unit}
                  detail={heightRing.detail}
                  label="Length"
                  gradient={heightRing.gradient}
                />
                <TrackerMetricRing
                  value={headRing.value}
                  unit={headRing.unit}
                  detail={headRing.detail}
                  label="Head"
                  gradient={headRing.gradient}
                />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current growth read</p>
                  <p className="mt-2 text-[2rem] font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--color-text)]">
                    {growthStatusHeadline}
                  </p>
                  <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                    {growthStatusDescription}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold",
                  sexMissing
                    ? "bg-[var(--color-caution-bg)] text-[var(--color-caution)]"
                    : "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]",
                )}>
                  {sexMissing ? "Needs sex" : "On reference"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <TrackerMetricPanel
                  eyebrow="Weight percentile"
                  value={latestWeightPercentile?.percentileLabel ?? "Unavailable"}
                  description={latestWeight !== null ? formatGrowthValue("weight_kg", latestWeight, unitSystem) : "No latest weight logged."}
                  tone="cta"
                />
                <TrackerMetricPanel
                  eyebrow="Length percentile"
                  value={latestHeightPercentile?.percentileLabel ?? "Unavailable"}
                  description={latestHeight !== null ? formatGrowthValue("height_cm", latestHeight, unitSystem) : "No latest length logged."}
                  tone="healthy"
                />
                <TrackerMetricPanel
                  eyebrow="Head percentile"
                  value={latestHeadPercentile?.percentileLabel ?? "Unavailable"}
                  description={latestHead !== null ? formatGrowthValue("head_circumference_cm", latestHead, unitSystem) : "No latest head measurement logged."}
                  tone="info"
                />
                <TrackerMetricPanel
                  eyebrow="Measurement coverage"
                  value={`${latestMetricCount}/3`}
                  description={latest ? `Latest session on ${formatDate(latest.measured_at)}` : "Add a first growth check-in."}
                  tone={latestMetricCount === 3 ? "healthy" : "info"}
                />
                <InsetPanel className="col-span-2 border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-surface-tint)_0%,var(--color-surface-strong)_100%)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Latest growth read</p>
                      <p className="mt-2 text-[1.7rem] font-semibold leading-[1] tracking-[-0.03em] text-[var(--color-text)]">
                        {latest ? formatGrowthSummary(latest, unitSystem) : "No current growth read"}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {sexMissing
                          ? "Set the child sex in Settings so each logged measure can map to an official percentile."
                          : "Percentiles are shown against the selected reference, while the chart below keeps the raw measurements visible over time."}
                      </p>
                    </div>
                    {latest && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => openEditSheet(latest)}
                      >
                        Edit latest
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Reference: {growthReference}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Baseline: {oldestLog ? formatDate(oldestLog.measured_at) : "No baseline"}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Total measures: {totalMeasurementsLogged}
                    </span>
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Trend focus: {metricMeta.label}
                    </span>
                    {activeMetricPercentile && (
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                        Current {metricMeta.label.toLowerCase()}: {activeMetricPercentile.percentileLabel}
                      </span>
                    )}
                  </div>
                </InsetPanel>
                {latest?.notes && (
                  <InsetPanel className="col-span-2 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Latest note</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{latest.notes}</p>
                  </InsetPanel>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                title="The trend line"
                description="Raw measurements stay in the foreground, while percentile context stays close enough to make the story easier to read."
                action={(
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={openAddSheet}
                  >
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
                        ? "border-[var(--color-border-strong)] bg-[var(--color-surface-tint)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
                <Suspense fallback={chartFallback}>
                  <GrowthTrendChart
                    logs={sortedLogs}
                    metric={activeMetric}
                    unit={getGrowthUnitLabel(activeMetric, unitSystem)}
                    lineColor={metricMeta.color}
                    dateOfBirth={activeChild.date_of_birth}
                    sex={activeChild.sex}
                    countryCode={growthCountryCode}
                  />
                </Suspense>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Points logged</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{activeMetricLogs.length}</p>
                </InsetPanel>
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Latest value</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                    {formatGrowthValue(activeMetric, activeMetricLatest?.[activeMetric] ?? null, unitSystem)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {activeMetricPercentile ? `${activeMetricPercentile.percentileLabel} (${activeMetricPercentile.reference})` : sexMissing ? "Add child sex to calculate percentiles." : "Percentile unavailable for this age."}
                  </p>
                </InsetPanel>
                <InsetPanel className="bg-[var(--color-bg)] p-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-soft)]">Trend note</p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {activeMetricLogs.length > 1 && activeMetricOldest
                      ? `${activeMetricLogs.length} points logged since ${formatDate(activeMetricOldest.measured_at)}.`
                      : "Add another point for this metric to make the trend more useful."}
                  </p>
                </InsetPanel>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                    Measurement history
                  </h3>
                </div>
                <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Every saved growth check-in, with percentile context and quick editing when values need correcting.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <TrackerEntryTable mainHeader="Growth check">
                {sortedLogs.map((log) => (
                  <TrackerEntryRow
                    key={log.id}
                    onClick={() => openEditSheet(log)}
                    className="items-start"
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {new Date(log.measured_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
                        {new Date(log.measured_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.measured_at)}</p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[var(--color-text)]">
                          {formatGrowthSummary(log, unitSystem)}
                        </p>
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                          Edit
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                        {getFilledMetricCount(log)} measures captured
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {[
                          log.weight_kg !== null ? `Weight ${getPercentileMeta(log, "weight_kg")?.percentileLabel ?? "—"}` : null,
                          log.height_cm !== null ? `Length ${getPercentileMeta(log, "height_cm")?.percentileLabel ?? "—"}` : null,
                          log.head_circumference_cm !== null ? `Head ${getPercentileMeta(log, "head_circumference_cm")?.percentileLabel ?? "—"}` : null,
                        ].filter(Boolean).join(" • ")}
                      </p>
                      {log.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </TrackerEntryRow>
                ))}
              </TrackerEntryTable>
            </CardContent>
          </Card>
        </>
      )}
      </div>

      <GrowthLogSheet
        open={sheetOpen}
        onClose={closeSheet}
        childId={activeChild.id}
        onLogged={refresh}
        entry={editingLog}
        onDeleted={refresh}
      />
    </PageBody>
  );
}
