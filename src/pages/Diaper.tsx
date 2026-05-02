import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useSymptoms } from "../hooks/useSymptoms";
import { useAlerts } from "../hooks/useAlerts";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { diaperDirtyIcon, diaperMixedIcon, diaperWetIcon } from "../assets/icons";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { DiaperHeroMetricsCard } from "../components/diaper/DiaperHeroMetricsCard";
import { DiaperPatternCard } from "../components/diaper/DiaperPatternCard";
import { DiaperQuickLogCard } from "../components/diaper/DiaperQuickLogCard";
import { DiaperRecentHistorySection } from "../components/diaper/DiaperRecentHistorySection";
import { DiaperStatusCard } from "../components/diaper/DiaperStatusCard";
import { DiaperTodaySummaryCard } from "../components/diaper/DiaperTodaySummaryCard";
import { DiaperLogForm } from "../components/logging/DiaperLogForm";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { ScenicHero } from "../components/layout/ScenicHero";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import type { DiaperEntry, DiaperLogDraft } from "../lib/types";
import {
  getDayKey,
  getDiaperNextLikelyEstimate,
  getDirtyDiaperMeta,
  getHydrationStatus,
  getPrediction,
  getPredictionRingDisplay,
  getTodayDiaperCounts,
  getValidDiaperTimestamp,
} from "../lib/diaper-insights";

export function Diaper() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeChild = useActiveChild();
  const { experience, isLoading: isEliminationPreferenceLoading } = useEliminationPreference(activeChild);
  const { logs, lastDiaper, lastWetDiaper, lastDirtyDiaper, refresh } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: symptomLogs } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { runPostLogActions } = useChildWorkflowActions(activeChild, refreshAlerts);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DiaperLogDraft> | null>(null);
  const [editingLog, setEditingLog] = useState<DiaperEntry | null>(null);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [selectedPatternLogId, setSelectedPatternLogId] = useState<string | null>(null);
  const patternSectionRef = useRef<HTMLDivElement | null>(null);
  const diaperIcons = useMemo(
    () => ({
      wet: diaperWetIcon,
      dirty: diaperDirtyIcon,
      mixed: diaperMixedIcon,
    }),
    [],
  );
  const allowSettingsAlternate = location.state
    && typeof location.state === "object"
    && "allowSettingsAlternate" in location.state
    && (location.state as { allowSettingsAlternate?: boolean }).allowSettingsAlternate === true;

  useEffect(() => {
    if (!allowSettingsAlternate && !isEliminationPreferenceLoading && experience.mode === "poop") {
      navigate("/poop", { replace: true });
    }
  }, [allowSettingsAlternate, experience.mode, isEliminationPreferenceLoading, navigate]);

  const todayKey = getDayKey();
  const { todayLogs, wetCount: todayWetCount, dirtyCount: todayDirtyCount, mixedCount: todayMixedCount } = useMemo(
    () => getTodayDiaperCounts(logs, todayKey),
    [logs, todayKey],
  );
  const hydrationStatus = getHydrationStatus(logs, symptomLogs[0]?.symptom_type);
  const recentLogs = useMemo(() => logs.slice(0, 3), [logs]);
  const patternLogs = useMemo(
    () => [...todayLogs].sort((left, right) => {
      const leftTime = getValidDiaperTimestamp(left.logged_at) ?? Number.MAX_SAFE_INTEGER;
      const rightTime = getValidDiaperTimestamp(right.logged_at) ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    }),
    [todayLogs],
  );
  const selectedPatternLog = useMemo(
    () => patternLogs.find((log) => log.id === selectedPatternLogId) ?? null,
    [patternLogs, selectedPatternLogId],
  );

  useEffect(() => {
    if (!selectedPatternLogId) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!patternSectionRef.current?.contains(event.target as Node)) {
        setSelectedPatternLogId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [selectedPatternLogId]);

  if (!activeChild) return null;
  if (isEliminationPreferenceLoading) return null;
  if (!allowSettingsAlternate && experience.mode === "poop") return null;
  const child = activeChild;
  const wetPrediction = getPrediction(logs, child.date_of_birth, "wet");
  const dirtyPrediction = getPrediction(logs, child.date_of_birth, "dirty");
  const predictionRing = getPredictionRingDisplay(wetPrediction);
  const nextWetEstimate = getDiaperNextLikelyEstimate(logs, child.date_of_birth, "wet");
  const nextPoopEstimate = getDiaperNextLikelyEstimate(logs, child.date_of_birth, "dirty");
  const dirtyDiaperMeta = getDirtyDiaperMeta(lastDirtyDiaper);

  const handleLogged = async () => {
    await runPostLogActions({
      refresh: [refresh],
      alerts: true,
      reminders: true,
    });
  };

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={child}
        title="Diaper"
        description="Track wet, dirty, and mixed diapers fast while keeping stool detail when it matters."
        action={(
          <Button variant="cta" size="sm" onClick={() => setFormOpen(true)}>
            Add
          </Button>
        )}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="diaper"
        showChildInfo={false}
      />

      <div className="px-4 md:px-10">
        <DiaperHeroMetricsCard
          className="-mt-36 md:-mt-32"
          lastWetTimestamp={lastWetDiaper?.logged_at ?? null}
          typicalGap={predictionRing}
          todayWetCount={todayWetCount}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <DiaperQuickLogCard
            lastDiaper={lastDiaper}
            onPresetSelect={(nextDraft) => {
              setDraft(nextDraft);
              setFormOpen(true);
            }}
          />

          <DiaperStatusCard
            childName={child.name}
            dirtyDiaperMeta={dirtyDiaperMeta}
            dirtyPrediction={dirtyPrediction}
            hydrationStatus={hydrationStatus}
            nextPoopEstimate={nextPoopEstimate}
            nextWetEstimate={nextWetEstimate}
            statusExpanded={statusExpanded}
            todayDirtyCount={todayDirtyCount}
            todayMixedCount={todayMixedCount}
            todayWetCount={todayWetCount}
            onToggleExpanded={() => setStatusExpanded((current) => !current)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <DiaperTodaySummaryCard
            dirtyCount={todayDirtyCount}
            hydrationStatus={hydrationStatus}
            mixedCount={todayMixedCount}
            wetCount={todayWetCount}
          />

          <DiaperRecentHistorySection
            icons={diaperIcons}
            recentLogs={recentLogs}
            onEditLog={(log) => setEditingLog(log)}
          />
        </div>

        <div ref={patternSectionRef}>
          <DiaperPatternCard
            patternLogs={patternLogs}
            selectedPatternLog={selectedPatternLog}
            onToggleLog={(logId) => setSelectedPatternLogId((current) => (current === logId ? null : logId))}
          />
        </div>

        <CareToolsSection className="px-0" palette="soft" />

        <DiaperLogForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setDraft(null);
          }}
          childId={child.id}
          onLogged={handleLogged}
          initialDraft={draft}
        />

        {editingLog && (
          <EditDiaperSheet
            key={editingLog.id}
            entry={editingLog}
            open={!!editingLog}
            onClose={() => setEditingLog(null)}
            onSaved={() => { setEditingLog(null); void handleLogged(); }}
            onDeleted={() => { setEditingLog(null); void handleLogged(); }}
          />
        )}
      </div>
    </PageBody>
  );
}
