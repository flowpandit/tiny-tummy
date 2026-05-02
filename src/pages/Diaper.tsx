import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useSymptoms } from "../hooks/useSymptoms";
import { useAlerts } from "../hooks/useAlerts";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { diaperDirtyIcon, diaperMixedIcon, diaperWetIcon } from "../assets/icons";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { DiaperPatternCard } from "../components/diaper/DiaperPatternCard";
import { DiaperQuickLogCard } from "../components/diaper/DiaperQuickLogCard";
import { DiaperRecentHistorySection } from "../components/diaper/DiaperRecentHistorySection";
import { DiaperStatusCard } from "../components/diaper/DiaperStatusCard";
import { DiaperLogForm } from "../components/logging/DiaperLogForm";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { ScenicHero } from "../components/layout/ScenicHero";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { EmptyState, PageBody } from "../components/ui/page-layout";
import { TimeSinceIndicator } from "../components/tracking/TimeSinceIndicator";
import { TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
import type { DiaperEntry, DiaperLogDraft } from "../lib/types";
import {
  getDayKey,
  getDirtyDiaperMeta,
  getHydrationRingDisplay,
  getHydrationStatus,
  getPrediction,
  getPredictionRingDisplay,
  getTodayDiaperCounts,
  getValidDiaperTimestamp,
} from "../lib/diaper-insights";

export function Diaper() {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!isEliminationPreferenceLoading && experience.mode === "poop") {
      navigate("/poop", { replace: true });
    }
  }, [experience.mode, isEliminationPreferenceLoading, navigate]);

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
  if (experience.mode === "poop") return null;
  const child = activeChild;
  const wetPrediction = getPrediction(logs, child.date_of_birth, "wet");
  const dirtyPrediction = getPrediction(logs, child.date_of_birth, "dirty");
  const predictionRing = getPredictionRingDisplay(wetPrediction);
  const hydrationRing = getHydrationRingDisplay(hydrationStatus, todayWetCount);
  const dirtyDiaperMeta = getDirtyDiaperMeta(lastDirtyDiaper);

  const handleLogged = async () => {
    await runPostLogActions({
      refresh: [refresh],
      alerts: true,
      reminders: true,
    });
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
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
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator
                  timestamp={lastWetDiaper?.logged_at ?? null}
                  status={hydrationStatus.tone === "cta" ? "alert" : hydrationStatus.tone === "info" ? "caution" : "healthy"}
                />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last wet</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label={predictionRing.label}
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={hydrationRing.value}
                unit={hydrationRing.unit}
                label={hydrationRing.label}
                gradient={hydrationRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-5">
          <div className="min-w-0 space-y-4">
            <DiaperQuickLogCard
              lastDiaper={lastDiaper}
              onPresetSelect={(nextDraft) => {
                setDraft(nextDraft);
                setFormOpen(true);
              }}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <DiaperStatusCard
              dirtyDiaperMeta={dirtyDiaperMeta}
              dirtyPrediction={dirtyPrediction}
              hydrationStatus={hydrationStatus}
              statusExpanded={statusExpanded}
              todayDirtyCount={todayDirtyCount}
              todayMixedCount={todayMixedCount}
              todayWetCount={todayWetCount}
              wetPrediction={wetPrediction}
              onToggleExpanded={() => setStatusExpanded((current) => !current)}
            />

            {logs.length === 0 ? (
              <EmptyState
                icon={<span className="text-2xl text-[var(--color-primary)]">+</span>}
                title="Start the diaper page with the first log"
                description="Once wet, dirty, or mixed diapers are logged, this page can show hydration rhythm and diaper summaries."
                action={<Button variant="primary" onClick={() => setFormOpen(true)}>Add first diaper log</Button>}
              />
            ) : (
              <div className="space-y-4">
                <div ref={patternSectionRef}>
                  <DiaperRecentHistorySection
                    icons={diaperIcons}
                    recentLogs={recentLogs}
                    onEditLog={(log) => setEditingLog(log)}
                  />
                </div>
                <DiaperPatternCard
                  patternLogs={patternLogs}
                  selectedPatternLog={selectedPatternLog}
                  onToggleLog={(logId) => setSelectedPatternLogId((current) => (current === logId ? null : logId))}
                />
                <CareToolsSection className="px-0" />
              </div>
            )}
          </div>
        </div>

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
