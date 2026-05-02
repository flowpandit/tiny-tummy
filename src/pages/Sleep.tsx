import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { useSleepTimerPreview } from "../hooks/useSleepTimerPreview";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { formatLocalDateKey } from "../lib/stats";
import { timeSince } from "../lib/utils";
import { formatSleepTimerClock, formatSleepTimerSummary, getSleepTimerElapsedMs } from "../lib/sleep-timer";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { SleepOverviewBoard } from "../components/sleep/SleepOverviewBoard";
import type { SleepEntry, SleepType } from "../lib/types";
import {
  buildSleepAssistantCopy,
  buildSleepGlanceStats,
  getWakeWindowProgress,
} from "../lib/sleep-view-model";
import {
  getCompletedSleepLogs,
  formatWakeBaselineRange,
  getSleepPrediction,
  getTodayKey,
  getWakeBaseline,
  getWakeRisk,
} from "../lib/sleep-insights";

export function Sleep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeChild = useActiveChild();
  const { logs, refresh } = useSleepLogs(activeChild?.id ?? null, 200);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"manual" | "timer">("manual");
  const [sheetSleepType, setSheetSleepType] = useState<SleepType>("nap");
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const { timerSession, tick } = useSleepTimerPreview(activeChild, sheetOpen);
  const completedLogs = useMemo(() => getCompletedSleepLogs(logs), [logs]);

  const todayKey = getTodayKey();
  const todayLogs = useMemo(() => {
    const dayStart = new Date(`${todayKey}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return completedLogs.filter((log) => {
      const startedAt = new Date(log.started_at).getTime();
      const endedAt = new Date(log.ended_at).getTime();
      return endedAt > dayStart && startedAt < dayEnd;
    });
  }, [completedLogs, todayKey]);
  const latestLog = completedLogs[0] ?? null;

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setSheetMode("manual");
      setSheetSleepType("nap");
      setSheetOpen(true);
    }
  }, [searchParams]);

  const baseline = useMemo(
    () => getWakeBaseline(activeChild?.date_of_birth ?? formatLocalDateKey(new Date())),
    [activeChild],
  );
  const prediction = useMemo(() => getSleepPrediction(completedLogs, baseline), [baseline, completedLogs]);
  const hoursSinceWake = latestLog ? (Date.now() - new Date(latestLog.ended_at).getTime()) / 3600000 : null;
  const wakeRisk = useMemo(() => getWakeRisk(hoursSinceWake, baseline, prediction), [baseline, hoursSinceWake, prediction]);
  if (!activeChild) return null;

  const assistantCopy = buildSleepAssistantCopy({
    childName: activeChild.name,
    prediction,
    wakeRisk,
    hasTimerSession: Boolean(timerSession),
  });
  const glanceStats = buildSleepGlanceStats({
    todayLogs,
    completedLogs,
    dayKey: todayKey,
  });
  const wakeWindowProgress = getWakeWindowProgress(hoursSinceWake, baseline);

  const openTimerSheet = () => {
    setSheetMode("timer");
    setSheetSleepType("nap");
    setSheetOpen(true);
  };

  const openManualSheet = () => {
    setSheetMode("manual");
    setSheetSleepType("nap");
    setSheetOpen(true);
  };

  const handleLogged = async () => {
    await refresh();
  };

  return (
    <>
      <SleepOverviewBoard
        childName={activeChild.name}
        assistantCopy={assistantCopy}
        lastWakeTimestamp={latestLog?.ended_at ?? null}
        wakeBaseline={formatWakeBaselineRange(baseline)}
        wakeWindowProgress={wakeWindowProgress}
        timerSessionSummary={timerSession ? {
          label: timerSession.sleepType === "night" ? "Night timer running" : "Nap timer running",
          clock: formatSleepTimerClock(getSleepTimerElapsedMs(timerSession, tick)),
          summary: `Started ${timeSince(timerSession.startedAt)} · ${formatSleepTimerSummary(getSleepTimerElapsedMs(timerSession, tick))}`,
        } : null}
        sleepLogs={completedLogs}
        glanceStats={glanceStats}
        onOpenTimerSheet={openTimerSheet}
        onOpenManualSheet={openManualSheet}
        onEditSleep={setEditingSleep}
      />

      <SleepLogSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          if (searchParams.get("add") === "1") {
            navigate("/sleep", { replace: true });
          }
        }}
        childId={activeChild.id}
        initialMode={sheetMode}
        initialSleepType={sheetSleepType}
        onLogged={handleLogged}
      />

      {editingSleep && (
        <EditSleepSheet
          key={editingSleep.id}
          entry={editingSleep}
          open={!!editingSleep}
          onClose={() => setEditingSleep(null)}
          onSaved={() => { void handleLogged(); }}
          onDeleted={() => { void handleLogged(); }}
        />
      )}
    </>
  );
}
