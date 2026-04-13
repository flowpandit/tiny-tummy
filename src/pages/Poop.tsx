import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, startOfDay } from "../lib/tracker";
import { getChildStatus } from "../lib/tauri";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import {
  buildPoopPresetRecordInput,
  describePoopPresetDraft,
  getDefaultQuickPoopPresets,
  hydratePoopPresets,
  type QuickPoopPreset,
} from "../lib/quick-presets";
import * as db from "../lib/db";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import { ScenicHero } from "../components/layout/ScenicHero";
import {
  TrackerMetricRing,
} from "../components/tracking/TrackerPrimitives";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { PoopPresetEditorSheet } from "../components/home/QuickPresetCustomizerSheet";
import { LogForm } from "../components/logging/LogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { useToast } from "../components/ui/toast";
import { PoopHealthInsightCard } from "../components/poop/PoopHealthInsightCard";
import { PoopQuickLogCard } from "../components/poop/PoopQuickLogCard";
import { PoopRecentHistorySection } from "../components/poop/PoopRecentHistorySection";
import { PoopRelatedLinks } from "../components/poop/PoopRelatedLinks";
import { PoopWeeklyPatternCard } from "../components/poop/PoopWeeklyPatternCard";
import type { HealthStatus, PoopEntry, PoopLogDraft } from "../lib/types";
import {
  buildPatternNarrative,
  getAgeBaseline,
  getAlertRingDisplay,
  getBaselineComparison,
  getDueRisk,
  getHealthInsightContent,
  getPrediction,
  getPredictionRingDisplay,
  getRepeatablePoopEntry,
  getStatusBadge,
} from "../lib/poop-insights";

function getCurrentPoopTimestamp(): string {
  return combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime());
}

export function Poop() {
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
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
  const [quickPoopPresets, setQuickPoopPresets] = useState<QuickPoopPreset[]>([]);

  useEffect(() => {
    if (experience.mode === "diaper") {
      navigate("/diaper", { replace: true });
    }
  }, [experience.mode, navigate]);

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

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    db.getQuickPresets(activeChild.id, "poop")
      .then((rows) => {
        if (cancelled) return;
        const hydrated = hydratePoopPresets(rows);
        setQuickPoopPresets(
          hydrated.length > 0 ? hydrated : getDefaultQuickPoopPresets(activeChild.feeding_type),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setQuickPoopPresets(getDefaultQuickPoopPresets(activeChild.feeding_type));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

  const earliestLoggedDate = useMemo(() => {
    if (logs.length === 0) return null;
    return startOfDay(new Date(logs[logs.length - 1].logged_at));
  }, [logs]);

  const maxWeekOffset = useMemo(() => {
    if (!earliestLoggedDate) return 0;
    const today = startOfDay(new Date());
    const diffDays = Math.floor((today.getTime() - earliestLoggedDate.getTime()) / 86400000);
    return Math.max(0, Math.floor(diffDays / DAYS_IN_WEEK));
  }, [earliestLoggedDate]);

  useEffect(() => {
    if (weekOffset > maxWeekOffset) {
      setWeekOffset(maxWeekOffset);
    }
  }, [maxWeekOffset, weekOffset]);

  const endDate = useMemo(() => addDays(startOfDay(new Date()), -weekOffset * DAYS_IN_WEEK), [weekOffset]);
  const startDate = useMemo(() => addDays(endDate, -(DAYS_IN_WEEK - 1)), [endDate]);
  const weekStartKey = formatLocalDateKey(startDate);
  const weekEndKey = formatLocalDateKey(endDate);

  const weeklyRealLogs = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0 && log.logged_at >= `${weekStartKey}T00:00:00` && log.logged_at <= `${weekEndKey}T23:59:59`),
    [logs, weekEndKey, weekStartKey],
  );
  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weeklyRealLogs) {
      const key = log.logged_at.split("T")[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [weeklyRealLogs]);

  const filledWeek = useMemo(() => fillDailyFrequencyDays(frequencyData, DAYS_IN_WEEK, endDate), [endDate, frequencyData]);
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
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const alertRing = useMemo(() => getAlertRingDisplay(alerts), [alerts]);
  const repeatablePoop = useMemo(() => getRepeatablePoopEntry(lastRealPoop), [lastRealPoop]);
  const recentHistory = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0).slice(0, 3),
    [logs],
  );

  if (!activeChild) return null;
  if (experience.mode === "diaper") return null;

  const handleRefresh = async () => {
    await runPostLogActions({
      refresh: [refresh],
      alerts: true,
    });
  };

  const handleRepeatLastPoop = async () => {
    if (!repeatablePoop) return;

    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: repeatablePoop.stool_type,
        color: repeatablePoop.color,
        size: repeatablePoop.size,
        notes: null,
        photo_path: null,
      });
      await handleRefresh();
      showSuccess("Repeated the last normal poop pattern.");
    } catch {
      showError("Could not repeat the last poop pattern. Please try again.");
    }
  };

  const handleQuickPoopPreset = async (preset: QuickPoopPreset) => {
    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: preset.draft.stool_type ?? null,
        color: preset.draft.color ?? null,
        size: preset.draft.size ?? null,
        notes: null,
        photo_path: null,
      });
      await handleRefresh();
      showSuccess(`${preset.label} logged.`);
    } catch {
      showError("Could not log that poop. Please try again.");
    }
  };

  const savePoopPresets = async (drafts: Array<Partial<PoopLogDraft>>) => {
    const nextPresets = drafts.map((draft, index) => {
      const preview = describePoopPresetDraft(draft);
      return {
        id: `poop-preset-${index}`,
        label: preview.label,
        description: preview.description,
        draft,
      };
    });

    try {
      await db.replaceQuickPresets(activeChild.id, "poop", buildPoopPresetRecordInput(drafts));
      setQuickPoopPresets(nextPresets);
      setPoopPresetSheetOpen(false);
      showSuccess("Quick poop tiles updated.");
    } catch {
      showError("Could not save the quick poop tiles. Please try again.");
    }
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Poop"
        description="Pattern, timing, and alerts in one place."
        action={<Button variant="cta" size="sm" onClick={() => setLogFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="poop"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator
                  timestamp={lastRealPoop?.logged_at ?? null}
                  status={effectiveStatus === "alert" ? "alert" : effectiveStatus === "caution" ? "caution" : "healthy"}
                />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last poop</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label="Next predicted"
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={alertRing.value}
                unit={alertRing.unit}
                label="Alerts"
                gradient={alertRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <PoopQuickLogCard
          quickPoopPresets={quickPoopPresets}
          repeatablePoop={repeatablePoop}
          onEditPresets={() => setPoopPresetSheetOpen(true)}
          onRepeatLastPoop={() => { void handleRepeatLastPoop(); }}
          onQuickPreset={(preset) => { void handleQuickPoopPreset(preset); }}
        />

        <PoopWeeklyPatternCard filledWeek={filledWeek} />

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

        <PoopRecentHistorySection recentHistory={recentHistory} />

        <PoopRelatedLinks />

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
            onSaved={() => { void handleRefresh(); }}
            onDeleted={() => { void handleRefresh(); }}
          />
        )}

        <PoopPresetEditorSheet
          open={poopPresetSheetOpen}
          onClose={() => setPoopPresetSheetOpen(false)}
          feedingType={activeChild.feeding_type}
          presets={quickPoopPresets}
          onSave={(drafts) => { void savePoopPresets(drafts); }}
        />
      </div>
    </PageBody>
  );
}
