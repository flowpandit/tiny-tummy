import { lazy, Suspense, useState } from "react";
import { OverviewRhythmChart } from "../components/trends/OverviewRhythmChart";
import { TrendBarChart } from "../components/trends/TrendBarChart";
import { TrendNarrativeCard } from "../components/trends/TrendNarrativeCard";
import { TrendSegmentedControl } from "../components/trends/TrendSegmentedControl";
import { TrendSummaryTile } from "../components/trends/TrendSummaryTile";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CompactPageHeader, EmptyState, PageBody } from "../components/ui/page-layout";
import { useActiveChild } from "../contexts/ChildContext";
import { useTrendsOverview } from "../hooks/useTrendsOverview";
import type { TrendsTab } from "../lib/trends";

const FrequencyChart = lazy(() =>
  import("../components/dashboard/FrequencyChart").then((module) => ({ default: module.FrequencyChart })),
);
const ConsistencyTrend = lazy(() =>
  import("../components/dashboard/ConsistencyTrend").then((module) => ({ default: module.ConsistencyTrend })),
);
const ColorDistribution = lazy(() =>
  import("../components/dashboard/ColorDistribution").then((module) => ({ default: module.ColorDistribution })),
);

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

export function Dashboard() {
  const activeChild = useActiveChild();
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<TrendsTab>("overview");
  const { overview, poopStats } = useTrendsOverview(activeChild, days);

  if (!activeChild) return null;

  if (!overview?.hasAnyData) {
    return (
      <PageBody className="py-8">
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary)" className="h-8 w-8">
              <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75Zm3.75-1.5a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0V12Zm2.25-3a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-1.5 0V9.75a.75.75 0 0 1 .75-.75Zm3.75 1.5a.75.75 0 0 0-1.5 0v5.25a.75.75 0 0 0 1.5 0v-5.25Z" clipRule="evenodd" />
            </svg>
          )}
          title="A few logs will make the patterns page useful"
          description="Start with feeds, sleep, diapers, or poop logs. This page will turn them into one weekly rhythm once the data starts coming in."
        />
      </PageBody>
    );
  }

  const chartFallback = (
    <div className="flex h-52 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] text-sm text-[var(--color-text-secondary)]">
      Loading chart...
    </div>
  );

  const renderActivePanel = () => {
    if (activeTab === "overview") {
      return (
        <>
          <OverviewRhythmChart rows={overview.overviewRows} />
          <TrendNarrativeCard lines={overview.overviewNarrative} />
        </>
      );
    }

    if (activeTab === "feed") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Feed rhythm</CardTitle>
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Daily feed totals, keeping breastfeeding, bottles, and meals on one weekly line.
              </p>
            </CardHeader>
            <CardContent>
              <TrendBarChart data={overview.feedChart.data} series={overview.feedChart.series} />
            </CardContent>
          </Card>
          <TrendNarrativeCard title="Feed read" lines={[overview.feedNarrative]} />
        </>
      );
    }

    if (activeTab === "sleep") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sleep totals</CardTitle>
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Hours of sleep by day, so naps and nights read as one weekly rhythm.
              </p>
            </CardHeader>
            <CardContent>
              <TrendBarChart data={overview.sleepChart.data} series={overview.sleepChart.series} valueSuffix="h" />
            </CardContent>
          </Card>
          <TrendNarrativeCard title="Sleep read" lines={[overview.sleepNarrative]} />
        </>
      );
    }

    if (activeTab === "diaper") {
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Diaper output</CardTitle>
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Wet and dirty diaper counts by day, with enough context to spot steadier hydration patterns.
              </p>
            </CardHeader>
            <CardContent>
              <TrendBarChart data={overview.diaperChart.data} series={overview.diaperChart.series} />
            </CardContent>
          </Card>
          <TrendNarrativeCard title="Diaper read" lines={[overview.diaperNarrative]} />
        </>
      );
    }

    const showConsistency = poopStats.consistency.length > 1;
    const showFrequency = poopStats.frequency.length > 0;

    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>{showConsistency ? "Consistency trend" : "Poop frequency"}</CardTitle>
            <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {showConsistency
                ? "Types 3-5 are the expected range, so this view keeps the stool trend easy to read."
                : "Daily stool counts over the selected range."}
            </p>
          </CardHeader>
          <CardContent>
            {showConsistency ? (
              <Suspense fallback={chartFallback}>
                <ConsistencyTrend data={poopStats.consistency} />
              </Suspense>
            ) : showFrequency ? (
              <Suspense fallback={chartFallback}>
                <FrequencyChart data={poopStats.frequency} days={days} />
              </Suspense>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">No poop data for this period</p>
            )}
          </CardContent>
        </Card>
        {poopStats.colorDist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent stool colors</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-10" />}>
                <ColorDistribution data={poopStats.colorDist} />
              </Suspense>
            </CardContent>
          </Card>
        )}
        <TrendNarrativeCard title="Poop read" lines={[overview.poopNarrative]} />
      </>
    );
  };

  return (
    <PageBody className="mt-0 space-y-4 px-4 pb-5 pt-0 md:px-6 lg:px-8">
      <section className="border-b border-[var(--color-border)] pb-4">
        <CompactPageHeader
          eyebrow="Patterns"
          title="Trends"
          value={days}
          options={PERIOD_OPTIONS}
          onChange={setDays}
        />
      </section>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1" data-no-page-swipe="true">
        {overview.summaryTiles.map((tile) => (
          <TrendSummaryTile
            key={tile.id}
            tile={tile}
            isActive={activeTab === tile.id}
            onClick={() => setActiveTab(tile.id)}
          />
        ))}
      </div>

      <TrendSegmentedControl value={activeTab} onChange={setActiveTab} />

      <div className="flex flex-col gap-4">
        {renderActivePanel()}
      </div>
    </PageBody>
  );
}
