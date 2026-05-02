import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { usePoopPageState } from "../hooks/usePoopPageState";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { fillDailyFrequencyDays } from "../lib/stats";
import { DAYS_IN_WEEK, getEarliestLoggedDate, getMaxWeekOffset, getWeekRange } from "../lib/tracker";
import { getChildStatus } from "../lib/tauri";
import { getCurrentLocalDate, getLocalDateKeyFromValue, isOnLocalDay } from "../lib/utils";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import { ScenicHero } from "../components/layout/ScenicHero";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { PoopPresetEditorSheet } from "../components/presets/QuickPresetEditorSheet";
import { LogForm } from "../components/logging/LogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { useToast } from "../components/ui/toast";
import { PoopHealthInsightCard } from "../components/poop/PoopHealthInsightCard";
import { PoopHeroMetricsCard } from "../components/poop/PoopHeroMetricsCard";
import { PoopQuickLogCard } from "../components/poop/PoopQuickLogCard";
import { PoopRecentHistorySection } from "../components/poop/PoopRecentHistorySection";
import { PoopTodaySummaryCard } from "../components/poop/PoopTodaySummaryCard";
import { PoopWeeklyPatternCard } from "../components/poop/PoopWeeklyPatternCard";
import type { HealthStatus, PoopEntry, PoopLogDraft } from "../lib/types";
import {
  buildPatternNarrative,
  getAgeBaseline,
  getBaselineComparison,
  getDueRisk,
  getHealthInsightContent,
  getPrediction,
  getRepeatablePoopEntry,
  getStatusBadge,
} from "../lib/poop-insights";

export function Poop() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeChild = useActiveChild();
  const { experience, isLoading: isEliminationPreferenceLoading } = useEliminationPreference(activeChild);
  const { showError, showSuccess } = useToast();
  const { logs, lastRealPoop, refresh } = usePoopLogs(activeChild?.id ?? null, 500);
  const { logs: feedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { logs: symptomLogs } = useSymptoms(activeChild?.id ?? null);
  const { activeEpisode } = useEpisodes(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { runPostLogActions } = useChildWorkflowActions(activeChild, refreshAlerts);
  const [weekOffset, setWeekOffset] = useState(0);
  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDescription, setNormalDescription] = useState("");
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [poopDraft, setPoopDraft] = useState<Partial<PoopLogDraft> | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [poopPresetSheetOpen, setPoopPresetSheetOpen] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const allowSettingsAlternate = location.state
    && typeof location.state === "object"
    && "allowSettingsAlternate" in location.state
    && (location.state as { allowSettingsAlternate?: boolean }).allowSettingsAlternate === true;

  useEffect(() => {
    if (!allowSettingsAlternate && !isEliminationPreferenceLoading && experience.mode === "diaper") {
      navigate("/diaper", { replace: true });
    }
  }, [allowSettingsAlternate, experience.mode, isEliminationPreferenceLoading, navigate]);

  useEffect(() => {
    if (!activeChild) {
      setStatus("healthy");
      setNormalDescription("");
      return;
    }

    let cancelled = false;
    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([nextStatus, nextDescription]) => {
      if (!cancelled) {
        setStatus(nextStatus);
        setNormalDescription(nextDescription);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild, lastRealPoop]);

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

  const { endDate } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const filledWeek = useMemo(() => {
    const emptyWeek = fillDailyFrequencyDays([], DAYS_IN_WEEK, endDate);
    const weekDates = new Set(emptyWeek.map((day) => day.date));
    const counts = new Map<string, number>();

    for (const log of logs) {
      if (log.is_no_poop === 1) continue;

      const key = getLocalDateKeyFromValue(log.logged_at);
      if (!weekDates.has(key)) continue;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return emptyWeek.map((day) => ({
      ...day,
      count: counts.get(day.date) ?? 0,
    }));
  }, [endDate, logs]);
  const baseline = useMemo(
    () => getAgeBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(
    () => getPrediction(logs, baseline, feedingLogs, symptomLogs, activeEpisode?.episode_type ?? null),
    [activeEpisode, baseline, feedingLogs, logs, symptomLogs],
  );
  const hoursSinceLastPoop = lastRealPoop
    ? (Date.now() - new Date(lastRealPoop.logged_at).getTime()) / 3600000
    : null;
  const baselineComparison = useMemo(
    () => getBaselineComparison(hoursSinceLastPoop, baseline),
    [baseline, hoursSinceLastPoop],
  );
  const dueRisk = useMemo(
    () => getDueRisk(
      hoursSinceLastPoop,
      baseline,
      prediction,
      alerts,
      symptomLogs,
      activeEpisode?.episode_type ?? null,
      feedingLogs,
      lastRealPoop?.logged_at ?? null,
    ),
    [activeEpisode, alerts, baseline, feedingLogs, hoursSinceLastPoop, lastRealPoop, prediction, symptomLogs],
  );
  const effectiveStatus = useMemo<HealthStatus>(() => {
    if (alerts.some((alert) => alert.severity === "urgent") || dueRisk.label === "High" || status === "alert") {
      return "alert";
    }
    if (alerts.some((alert) => alert.severity === "warning") || dueRisk.label === "Medium" || status === "caution") {
      return "caution";
    }
    return status;
  }, [alerts, dueRisk.label, status]);
  const statusBadge = getStatusBadge(effectiveStatus);
  const patternNarrative = useMemo(
    () => buildPatternNarrative({
      status: effectiveStatus,
      baseline,
      baselineComparison,
      dueRisk,
      prediction,
      alerts,
      symptomLogs,
      activeEpisodeType: activeEpisode?.episode_type ?? null,
    }),
    [activeEpisode, alerts, baseline, baselineComparison, dueRisk, effectiveStatus, prediction, symptomLogs],
  );
  const healthInsight = useMemo(
    () => getHealthInsightContent(effectiveStatus, normalDescription),
    [effectiveStatus, normalDescription],
  );
  const todayKey = getCurrentLocalDate();
  const todayPoopCount = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0 && isOnLocalDay(log.logged_at, todayKey)).length,
    [logs, todayKey],
  );
  const repeatablePoop = useMemo(() => getRepeatablePoopEntry(lastRealPoop), [lastRealPoop]);
  const recentHistory = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0).slice(0, 3),
    [logs],
  );

  const handleRefresh = async () => {
    await runPostLogActions({
      refresh: [refresh],
      alerts: true,
    });
  };
  const {
    quickPoopPresets,
    repeatLastPoop,
    logQuickPoopPreset,
    savePoopPresets,
  } = usePoopPageState({
    activeChild,
    onError: showError,
    onSuccess: showSuccess,
    refreshLogs: handleRefresh,
  });

  if (!activeChild) return null;
  if (isEliminationPreferenceLoading) return null;
  if (!allowSettingsAlternate && experience.mode === "diaper") return null;

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Poop"
        description="Track poop timing, texture, and patterns with calm next-step guidance."
        action={<Button variant="cta" size="sm" onClick={() => setLogFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="poop"
        showChildInfo={false}
      />

      <div className="px-4 md:px-10">
        <PoopHeroMetricsCard
          baseline={baseline}
          className="-mt-36 md:-mt-32"
          lastPoopTimestamp={lastRealPoop?.logged_at ?? null}
          prediction={prediction}
          todayPoopCount={todayPoopCount}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <PoopQuickLogCard
            quickPoopPresets={quickPoopPresets}
            repeatablePoop={repeatablePoop}
            onEditPresets={() => setPoopPresetSheetOpen(true)}
            onRepeatLastPoop={() => { void repeatLastPoop(repeatablePoop); }}
            onQuickPreset={(preset) => { void logQuickPoopPreset(preset); }}
          />

          <PoopHealthInsightCard
            baseline={baseline}
            baselineComparison={baselineComparison}
            dueRisk={dueRisk}
            healthInsight={healthInsight}
            patternNarrative={patternNarrative}
            prediction={prediction}
            statusBadge={statusBadge}
            statusExpanded={statusExpanded}
            onToggleExpanded={() => setStatusExpanded((current) => !current)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <PoopTodaySummaryCard
            baselineComparison={baselineComparison}
            dueRisk={dueRisk}
            lastRealPoop={lastRealPoop}
            todayPoopCount={todayPoopCount}
          />

          <PoopRecentHistorySection
            recentHistory={recentHistory}
            onEditPoop={(log) => setEditingPoop(log)}
          />
        </div>

        <PoopWeeklyPatternCard filledWeek={filledWeek} todayPoopCount={todayPoopCount} />

        <CareToolsSection className="px-0" palette="soft" />

        <LogForm
          open={logFormOpen}
          onClose={() => {
            setLogFormOpen(false);
            setPoopDraft(null);
          }}
          childId={activeChild.id}
          onLogged={handleRefresh}
          initialDraft={poopDraft}
        />

        {editingPoop && (
          <EditPoopSheet
            key={editingPoop.id}
            entry={editingPoop}
            open={!!editingPoop}
            onClose={() => setEditingPoop(null)}
            onSaved={() => { setEditingPoop(null); void handleRefresh(); }}
            onDeleted={() => { setEditingPoop(null); void handleRefresh(); }}
          />
        )}

        <PoopPresetEditorSheet
          open={poopPresetSheetOpen}
          onClose={() => setPoopPresetSheetOpen(false)}
          feedingType={activeChild.feeding_type}
          presets={quickPoopPresets}
          onSave={async (drafts) => {
            const saved = await savePoopPresets(drafts);
            if (saved) {
              setPoopPresetSheetOpen(false);
            }
          }}
        />
      </div>
    </PageBody>
  );
}
