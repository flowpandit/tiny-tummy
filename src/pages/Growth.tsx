import { useMemo, useState } from "react";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { GrowthHealthInsightCard } from "../components/growth/GrowthHealthInsightCard";
import { GrowthHeroMetricsCard, type GrowthHeroMetric } from "../components/growth/GrowthHeroMetricsCard";
import { GrowthLatestCheckInCard } from "../components/growth/GrowthLatestCheckInCard";
import { GrowthLogSheet } from "../components/growth/GrowthLogSheet";
import { GrowthMeasurementHistoryCard } from "../components/growth/GrowthMeasurementHistoryCard";
import { GrowthTrendPanel } from "../components/growth/GrowthTrendPanel";
import { ScenicHero } from "../components/layout/ScenicHero";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useGrowthLogs } from "../hooks/useGrowthLogs";
import { getGrowthPercentile, type GrowthPercentileResult } from "../lib/growth-percentiles";
import { GROWTH_METRIC_OPTIONS, type GrowthTrendMetricKey } from "../lib/growth-metrics";
import { detectGrowthCountryCode, getGrowthReferenceForAge } from "../lib/growth-reference";
import { countGrowthMeasures, type GrowthMetricKey } from "../lib/growth-view";
import type { GrowthEntry } from "../lib/types";
import { formatGrowthValue, getGrowthUnitLabel } from "../lib/units";

function getAgeInYears(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();

  if (diffMs <= 0) return 0;

  return diffMs / (1000 * 60 * 60 * 24 * 365.2425);
}

function formatShortPercentile(meta: GrowthPercentileResult | null): string {
  return meta?.percentileLabel.replace(" percentile", "") ?? "—";
}

function getMetricValue(metric: GrowthMetricKey, value: number | null, unitSystem: "metric" | "imperial"): string {
  return value !== null ? formatGrowthValue(metric, value, unitSystem) : "Not logged";
}

export function Growth() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const { logs, latest, refresh } = useGrowthLogs(activeChild?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<GrowthEntry | null>(null);
  const [activeMetric, setActiveMetric] = useState<GrowthTrendMetricKey>("weight_kg");
  const [statusExpanded, setStatusExpanded] = useState(false);

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
  const metricMeta = GROWTH_METRIC_OPTIONS.find((item) => item.key === activeMetric)!;
  const activeMetricLogs = sortedLogs.filter((log) => log[activeMetric] !== null);
  const activeMetricLatest = activeMetricLogs[0] ?? null;
  const oldestLog = sortedLogs[sortedLogs.length - 1] ?? null;
  const totalMeasurementsLogged = sortedLogs.reduce((sum, log) => sum + countGrowthMeasures(log), 0);
  const sexMissing = !activeChild.sex;

  const getPercentileMeta = (log: GrowthEntry | null, metric: GrowthMetricKey) => {
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
  const growthMetrics: GrowthHeroMetric[] = [
    {
      id: "weight",
      label: "Weight",
      percentile: formatShortPercentile(latestWeightPercentile),
      value: getMetricValue("weight_kg", latestWeight, unitSystem),
    },
    {
      id: "length",
      label: "Length",
      percentile: formatShortPercentile(latestHeightPercentile),
      value: getMetricValue("height_cm", latestHeight, unitSystem),
    },
    {
      id: "head",
      label: "Head",
      percentile: formatShortPercentile(latestHeadPercentile),
      value: getMetricValue("head_circumference_cm", latestHead, unitSystem),
    },
  ];

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
    <div className="flex h-[112px] items-center justify-center rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] text-sm text-[var(--color-text-secondary)] md:h-[180px]">
      Loading trend chart...
    </div>
  );

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Growth"
        description="Track measurements and percentiles over time."
        action={<Button variant="cta" size="sm" onClick={openAddSheet}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="growth"
        showChildInfo={false}
      />

      <div className="-mt-36 px-4 md:-mt-32 md:px-10">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr] md:items-start md:gap-4">
          <GrowthHeroMetricsCard
            metrics={growthMetrics}
          />
          <GrowthLatestCheckInCard
            childName={activeChild.name}
            growthReference={growthReference}
            latest={latest}
            sexMissing={sexMissing}
            unitSystem={unitSystem}
            onAdd={openAddSheet}
            onEdit={openEditSheet}
          />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <GrowthTrendPanel
          activeMetric={activeMetric}
          chartFallback={chartFallback}
          childDateOfBirth={activeChild.date_of_birth}
          countryCode={growthCountryCode}
          lineColor={metricMeta.color}
          sex={activeChild.sex}
          sortedLogs={sortedLogs}
          unit={getGrowthUnitLabel(activeMetric, unitSystem)}
          onMetricChange={setActiveMetric}
        />

        <GrowthHealthInsightCard
          activeMetricLabel={metricMeta.label}
          activeMetricPercentile={activeMetricPercentile}
          childName={activeChild.name}
          growthReference={growthReference}
          latest={latest}
          oldestLog={oldestLog}
          statusExpanded={statusExpanded}
          totalMeasurementsLogged={totalMeasurementsLogged}
          sexMissing={sexMissing}
          onToggleExpanded={() => setStatusExpanded((current) => !current)}
        />

        <GrowthMeasurementHistoryCard
          dateOfBirth={activeChild.date_of_birth}
          getPercentileMeta={getPercentileMeta}
          logs={sortedLogs}
          unitSystem={unitSystem}
          onAddMeasurement={openAddSheet}
          onEditLog={openEditSheet}
        />

        <CareToolsSection className="px-0" palette="soft" />
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
