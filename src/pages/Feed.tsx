import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useFeedPageState } from "../hooks/useFeedPageState";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, formatWeekLabel, getEarliestLoggedDate, getMaxWeekOffset, getWeekRange } from "../lib/tracker";
import { getCurrentLocalDate, isOnLocalDay } from "../lib/utils";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EmptyState, PageBody } from "../components/ui/page-layout";
import {
  TrackerMetricRing,
  TrackerWeekRangePill,
} from "../components/tracking/TrackerPrimitives";
import { FeedPresetEditorSheet } from "../components/presets/QuickPresetEditorSheet";
import { TimeSinceIndicator } from "../components/tracking/TimeSinceIndicator";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { FeedLogList } from "../components/feed/FeedLogList";
import { FeedQuickStartCard } from "../components/feed/FeedQuickStartCard";
import { FeedStatusCard } from "../components/feed/FeedStatusCard";
import { FeedWeeklyPatternCard } from "../components/feed/FeedWeeklyPatternCard";
import { useToast } from "../components/ui/toast";
import type { FeedingEntry, FeedingLogDraft } from "../lib/types";
import {
  buildFeedWeekSummary,
  buildFeedPatternNarrative,
  getBaselineComparison,
  getDueRisk,
  getFeedBaseline,
  getFeedMixSnapshot,
  getFeedPrediction,
  getPredictionRingDisplay,
  getPredictableFeedLogs,
  getTimeSinceStatus,
  getTodayIntakeRingDisplay,
  getTrackedMl,
} from "../lib/feed-insights";


export function Feed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeChild } = useChildContext();
  const { unitSystem } = useUnits();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  const { logs, refresh } = useFeedingLogs(activeChild?.id ?? null, 500);
  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [feedDraft, setFeedDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [feedPresetSheetOpen, setFeedPresetSheetOpen] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const navigateWithOrigin = (path: string) => navigate(path, { state: { origin: location.pathname } });
  const {
    activeBreastfeedingSide,
    quickFeedPresets,
    logQuickFeedPreset,
    repeatLastFeed,
    saveFeedPresets,
  } = useFeedPageState({
    activeChild,
    unitSystem,
    onError: showError,
    onSuccess: showSuccess,
    refreshLogs: refresh,
  });

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setFormOpen(true);
    }
  }, [searchParams]);

  const predictableLogs = useMemo(() => getPredictableFeedLogs(logs), [logs]);
  const lastFeed = predictableLogs[0] ?? null;
  const todayKey = formatLocalDateKey(new Date());
  const todayFeedCount = useMemo(
    () => predictableLogs.filter((log) => isOnLocalDay(log.logged_at, todayKey)).length,
    [predictableLogs, todayKey],
  );
  const todayTrackedMl = useMemo(
    () => getTrackedMl(logs.filter((log) => isOnLocalDay(log.logged_at, todayKey))),
    [logs, todayKey],
  );

  const earliestLoggedDate = useMemo(() => {
    return getEarliestLoggedDate(logs, (log) => log.logged_at);
  }, [logs]);

  const maxWeekOffset = useMemo(() => {
    return getMaxWeekOffset(earliestLoggedDate);
  }, [earliestLoggedDate]);

  useEffect(() => {
    if (weekOffset > maxWeekOffset) {
      setWeekOffset(maxWeekOffset);
    }
  }, [maxWeekOffset, weekOffset]);

  const { startDate, endDate } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekStartKey = formatLocalDateKey(startDate);
  const weekEndKey = formatLocalDateKey(endDate);

  const weekLogs = useMemo(
    () => logs.filter((log) => log.logged_at >= `${weekStartKey}T00:00:00` && log.logged_at <= `${weekEndKey}T23:59:59`),
    [logs, weekEndKey, weekStartKey],
  );
  const weeklyPredictableLogs = useMemo(
    () => getPredictableFeedLogs(weekLogs),
    [weekLogs],
  );

  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weeklyPredictableLogs) {
      const key = log.logged_at.split("T")[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [weeklyPredictableLogs]);
  const filledWeek = useMemo(() => fillDailyFrequencyDays(frequencyData, DAYS_IN_WEEK, endDate), [endDate, frequencyData]);

  const baseline = useMemo(
    () => getFeedBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(() => getFeedPrediction(logs, baseline), [baseline, logs]);
  const hoursSinceLastFeed = lastFeed ? (Date.now() - new Date(lastFeed.logged_at).getTime()) / 3600000 : null;
  const baselineComparison = useMemo(() => getBaselineComparison(hoursSinceLastFeed, baseline), [baseline, hoursSinceLastFeed]);
  const dueRisk = useMemo(
    () => getDueRisk(hoursSinceLastFeed, baseline, prediction, todayFeedCount),
    [baseline, hoursSinceLastFeed, prediction, todayFeedCount],
  );
  const narrative = useMemo(
    () => buildFeedPatternNarrative({ baseline, baselineComparison, dueRisk, prediction }),
    [baseline, baselineComparison, dueRisk, prediction],
  );
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const todayIntakeRing = useMemo(
    () => getTodayIntakeRingDisplay(todayTrackedMl, todayFeedCount, unitSystem),
    [todayFeedCount, todayTrackedMl, unitSystem],
  );
  const statusTone = useMemo(() => getTimeSinceStatus(dueRisk, prediction), [dueRisk, prediction]);
  const feedMix = useMemo(() => getFeedMixSnapshot(weekLogs), [weekLogs]);
  const weekTrackedMl = useMemo(() => getTrackedMl(weekLogs), [weekLogs]);

  if (!activeChild) return null;

  const showBreastfeedAction = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";
  const weekSummary = buildFeedWeekSummary(weeklyPredictableLogs, unitSystem, weekTrackedMl);

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Feed"
        description="Feeds, meals, and the next likely window in one place."
        action={<Button variant="cta" size="sm" onClick={() => setFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="feed"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator timestamp={lastFeed?.logged_at ?? null} status={statusTone} />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last feed</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label="Next predicted"
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={todayIntakeRing.value}
                unit={todayIntakeRing.unit}
                label={todayIntakeRing.label}
                gradient={todayIntakeRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <FeedQuickStartCard
          activeBreastfeedingSide={activeBreastfeedingSide}
          lastFeed={lastFeed}
          quickFeedPresets={quickFeedPresets}
          showBreastfeedAction={showBreastfeedAction}
          unitSystem={unitSystem}
          onEditTiles={() => setFeedPresetSheetOpen(true)}
          onNavigateToBreastfeed={() => navigateWithOrigin("/breastfeed")}
          onQuickPreset={(preset) => { void logQuickFeedPreset(preset); }}
          onRepeatLastFeed={() => { void repeatLastFeed(lastFeed); }}
        />

        <FeedStatusCard
          baseline={baseline}
          baselineComparison={baselineComparison}
          dueRisk={dueRisk}
          feedMix={feedMix}
          narrative={narrative}
          prediction={prediction}
          statusExpanded={statusExpanded}
          unitSystem={unitSystem}
          weekTrackedMl={weekTrackedMl}
          onToggleExpanded={() => setStatusExpanded((current) => !current)}
        />

        <FeedWeeklyPatternCard
          filledWeek={filledWeek}
          maxWeekOffset={maxWeekOffset}
          summary={weekSummary}
          title={weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}
          weekOffset={weekOffset}
          onOlder={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
          onNewer={() => setWeekOffset((current) => Math.max(0, current - 1))}
        />

        {logs.length === 0 ? (
          <EmptyState
            icon={(
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5v7.125a2.625 2.625 0 0 0 5.25 0V4.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 4.5V21" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75v17.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5h2.25a1.5 1.5 0 0 0 1.5-1.5V3.75" />
              </svg>
            )}
            title="Start the feed page with the first log"
            description="Once a few feeds are in, this page starts surfacing rhythm, next likely window, and the week pattern."
            action={<Button variant="primary" onClick={() => setFormOpen(true)}>Add first feed</Button>}
          />
        ) : (
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                    Week entries
                  </h3>
                  <TrackerWeekRangePill label={formatWeekLabel(startDate, endDate)} animateKey={weekOffset} />
                </div>
                <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Every feed or meal for the selected week, with quick editing when details need correcting.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <FeedLogList logs={weekLogs} onEdit={setEditingMeal} unitSystem={unitSystem} />
            </CardContent>
          </Card>
        )}

        <CareToolsSection className="px-1" />

        <DietLogForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setFeedDraft(null);
            if (searchParams.get("add") === "1") {
              navigate("/feed", { replace: true });
            }
          }}
          childId={activeChild.id}
          onLogged={handleRefresh}
          initialDraft={feedDraft}
        />

        {editingMeal && (
          <EditMealSheet
            key={editingMeal.id}
            entry={editingMeal}
            open={!!editingMeal}
            onClose={() => setEditingMeal(null)}
            onSaved={() => { void handleRefresh(); }}
            onDeleted={() => { void handleRefresh(); }}
          />
        )}

        <FeedPresetEditorSheet
          open={feedPresetSheetOpen}
          onClose={() => setFeedPresetSheetOpen(false)}
          feedingType={activeChild.feeding_type}
          presets={quickFeedPresets}
          onSave={(drafts) => {
            void saveFeedPresets(drafts).then((didSave) => {
              if (didSave) setFeedPresetSheetOpen(false);
            });
          }}
        />
      </div>
    </PageBody>
  );
}
