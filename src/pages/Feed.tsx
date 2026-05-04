import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useFeedPageState } from "../hooks/useFeedPageState";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { fillDailyFrequencyDays } from "../lib/stats";
import { DAYS_IN_WEEK, formatWeekLabel, getEarliestLoggedDate, getMaxWeekOffset, getWeekRange } from "../lib/tracker";
import { getCurrentLocalDate, getLocalDateKeyFromValue, isOnLocalDay } from "../lib/utils";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { PageBody } from "../components/ui/page-layout";
import { FeedPresetEditorSheet } from "../components/presets/QuickPresetEditorSheet";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { FeedHeroMetricsCard } from "../components/feed/FeedHeroMetricsCard";
import { FeedQuickStartCard } from "../components/feed/FeedQuickStartCard";
import { FeedRecentHistorySection } from "../components/feed/FeedRecentHistorySection";
import { FeedStatusCard } from "../components/feed/FeedStatusCard";
import { FeedTodaySummaryCard } from "../components/feed/FeedTodaySummaryCard";
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
  getTodayIntakeRingDisplay,
  getTrackedMl,
  getUnifiedFeedTimeline,
} from "../lib/feed-insights";


export function Feed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeChild = useActiveChild();
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

  const feedTimeline = useMemo(() => getUnifiedFeedTimeline(logs), [logs]);
  const lastFeed = feedTimeline[0] ?? null;
  const todayKey = getCurrentLocalDate();
  const todayLogs = useMemo(
    () => logs.filter((log) => isOnLocalDay(log.logged_at, todayKey)),
    [logs, todayKey],
  );
  const todayFeedTimeline = useMemo(
    () => feedTimeline.filter((log) => isOnLocalDay(log.logged_at, todayKey)),
    [feedTimeline, todayKey],
  );
  const todayFeedCount = useMemo(
    () => todayFeedTimeline.length,
    [todayFeedTimeline],
  );
  const todayTrackedMl = useMemo(
    () => getTrackedMl(todayLogs),
    [todayLogs],
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
  const emptyWeek = useMemo(() => fillDailyFrequencyDays([], DAYS_IN_WEEK, endDate), [endDate]);
  const weekDateKeys = useMemo(() => new Set(emptyWeek.map((day) => day.date)), [emptyWeek]);

  const weekLogs = useMemo(
    () => logs.filter((log) => weekDateKeys.has(getLocalDateKeyFromValue(log.logged_at))),
    [logs, weekDateKeys],
  );
  const weeklyFeedTimeline = useMemo(
    () => getUnifiedFeedTimeline(weekLogs),
    [weekLogs],
  );

  const filledWeek = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weeklyFeedTimeline) {
      const key = getLocalDateKeyFromValue(log.logged_at);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return emptyWeek.map((day) => ({
      ...day,
      count: counts.get(day.date) ?? 0,
    }));
  }, [emptyWeek, weeklyFeedTimeline]);

  const baseline = useMemo(
    () => getFeedBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(() => getFeedPrediction(feedTimeline, baseline), [baseline, feedTimeline]);
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
  const feedMix = useMemo(() => getFeedMixSnapshot(weekLogs), [weekLogs]);
  const todayFeedMix = useMemo(() => getFeedMixSnapshot(todayFeedTimeline), [todayFeedTimeline]);
  const weekTrackedMl = useMemo(() => getTrackedMl(weekLogs), [weekLogs]);
  const recentHistory = useMemo(() => logs.slice(0, 3), [logs]);

  if (!activeChild) return null;

  const showBreastfeedAction = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";
  const weekSummary = buildFeedWeekSummary(weeklyFeedTimeline, unitSystem, weekTrackedMl);

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Feed"
        description="Feeds, meals, and the next likely window in one place."
        action={<Button variant="cta" size="sm" onClick={() => setFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="feed"
        showChildInfo={false}
      />

      <div className="px-4 md:px-10">
        <FeedHeroMetricsCard
          className="-mt-36 md:-mt-32"
          lastFeedTimestamp={lastFeed?.logged_at ?? null}
          nextFeed={predictionRing}
          todayIntake={todayIntakeRing}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
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
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <FeedTodaySummaryCard
            dueRisk={dueRisk}
            todayFeedCount={todayFeedCount}
            todayIntake={todayIntakeRing}
            todayTopFeedLabel={todayFeedMix.dominantLabel}
          />

          <FeedRecentHistorySection
            logs={recentHistory}
            unitSystem={unitSystem}
            onEditFeed={(log) => setEditingMeal(log)}
          />
        </div>

        <FeedWeeklyPatternCard
          filledWeek={filledWeek}
          maxWeekOffset={maxWeekOffset}
          summary={weekSummary}
          title={weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}
          weekOffset={weekOffset}
          onOlder={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
          onNewer={() => setWeekOffset((current) => Math.max(0, current - 1))}
        />

        <CareToolsSection className="px-0" palette="soft" />

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
            onSaved={() => { setEditingMeal(null); void handleRefresh(); }}
            onDeleted={() => { setEditingMeal(null); void handleRefresh(); }}
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
