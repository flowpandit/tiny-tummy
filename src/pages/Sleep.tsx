import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveChild } from "../contexts/ChildContext";
import { useSleepTimerPreview } from "../hooks/useSleepTimerPreview";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, formatWeekLabel, getEarliestLoggedDate, getMaxWeekOffset, getWeekRange } from "../lib/tracker";
import { timeSince } from "../lib/utils";
import { formatSleepTimerClock, formatSleepTimerSummary, getSleepTimerElapsedMs } from "../lib/sleep-timer";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EmptyState, PageBody } from "../components/ui/page-layout";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { SleepOverviewBoard } from "../components/sleep/SleepOverviewBoard";
import { SleepRecentHistorySection } from "../components/sleep/SleepRecentHistorySection";
import type { SleepEntry } from "../lib/types";
import {
  buildSleepWeekSummary,
  getCompletedSleepLogs,
  formatDurationRing,
  formatWakeBaselineRange,
  getDurationMinutes,
  getLastNapDisplay,
  getOverlapMinutesForDay,
  getPredictionRingDisplay,
  getSleepPrediction,
  getTodayKey,
  getWakeBaseline,
  getWakeComparison,
  getWakeRisk,
  getWakeStatusTone,
  toDayKey,
} from "../lib/sleep-insights";

export function Sleep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeChild = useActiveChild();
  const { logs, refresh } = useSleepLogs(activeChild?.id ?? null, 200);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activePanel, setActivePanel] = useState<"rhythm" | "patterns">("rhythm");
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
  const totalTodayMinutes = useMemo(
    () => todayLogs.reduce((sum, log) => sum + getOverlapMinutesForDay(log, todayKey), 0),
    [todayKey, todayLogs],
  );
  const latestLog = completedLogs[0] ?? null;
  const lastNapDisplay = useMemo(
    () => getLastNapDisplay(activeChild?.date_of_birth ?? null, completedLogs),
    [activeChild, completedLogs],
  );
  const patternDayKey = todayLogs.length > 0 ? todayKey : (latestLog ? toDayKey(latestLog.started_at) : todayKey);
  const patternLogs = completedLogs.filter((log) => toDayKey(log.started_at) === patternDayKey);
  const patternLabel = patternDayKey === todayKey
    ? "Today"
    : `Latest logged day · ${new Date(`${patternDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setSheetOpen(true);
    }
  }, [searchParams]);

  const earliestLoggedDate = useMemo(() => {
    return getEarliestLoggedDate(completedLogs, (log) => log.started_at);
  }, [completedLogs]);

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
    () => completedLogs.filter((log) => log.started_at >= `${weekStartKey}T00:00:00` && log.started_at <= `${weekEndKey}T23:59:59`),
    [completedLogs, weekEndKey, weekStartKey],
  );

  const sleepByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weekLogs) {
      const key = log.started_at.split("T")[0];
      const hours = getDurationMinutes(log) / 60;
      counts.set(key, Math.round(((counts.get(key) ?? 0) + hours) * 10) / 10);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [weekLogs]);
  const filledWeek = useMemo(() => fillDailyFrequencyDays(sleepByDay, DAYS_IN_WEEK, endDate), [endDate, sleepByDay]);

  const baseline = useMemo(
    () => getWakeBaseline(activeChild?.date_of_birth ?? formatLocalDateKey(new Date())),
    [activeChild],
  );
  const prediction = useMemo(() => getSleepPrediction(completedLogs, baseline), [baseline, completedLogs]);
  const hoursSinceWake = latestLog ? (Date.now() - new Date(latestLog.ended_at).getTime()) / 3600000 : null;
  const wakeComparison = useMemo(() => getWakeComparison(hoursSinceWake, baseline), [baseline, hoursSinceWake]);
  const wakeRisk = useMemo(() => getWakeRisk(hoursSinceWake, baseline, prediction), [baseline, hoursSinceWake, prediction]);
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const todayDurationRing = useMemo(() => formatDurationRing(totalTodayMinutes), [totalTodayMinutes]);
  const statusTone = useMemo(() => getWakeStatusTone(wakeRisk, prediction), [wakeRisk, prediction]);
  if (!activeChild) return null;

  const weekSummary = buildSleepWeekSummary(weekLogs.length, totalTodayMinutes);
  const recentHistory = completedLogs.slice(0, 3);

  const handleLogged = async () => {
    await refresh();
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Sleep"
        description="Wake windows, next likely rest, and the week in one place."
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="sleep"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <SleepOverviewBoard
          lastNapTimestamp={lastNapDisplay.timestamp}
          lastNapLabel={lastNapDisplay.label}
          statusTone={statusTone}
          predictionRing={predictionRing}
          todayDurationRing={todayDurationRing}
          timerSessionSummary={timerSession ? {
            label: timerSession.sleepType === "night" ? "Night timer running" : "Nap timer running",
            clock: formatSleepTimerClock(getSleepTimerElapsedMs(timerSession, tick)),
            summary: `Started ${timeSince(timerSession.startedAt)} · ${formatSleepTimerSummary(getSleepTimerElapsedMs(timerSession, tick))}`,
          } : null}
          activePanel={activePanel}
          onChangePanel={setActivePanel}
          wakeBaseline={formatWakeBaselineRange(baseline)}
          wakeComparison={wakeComparison}
          wakeRisk={wakeRisk}
          patternLogs={patternLogs}
          patternLabel={patternLabel}
          filledWeek={filledWeek}
          weekTitle={weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}
          weekSummary={weekSummary}
          onOpenSleepSheet={() => setSheetOpen(true)}
        />

        {completedLogs.length === 0 ? (
          <EmptyState
            icon={(
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
              </svg>
            )}
            title="Start the sleep page with the first log"
            description="Once a few sleep blocks are in, this page starts surfacing wake windows, next likely rest, and the week pattern."
            action={<Button variant="primary" onClick={() => setSheetOpen(true)}>Add first sleep log</Button>}
          />
        ) : (
          <SleepRecentHistorySection logs={recentHistory} onEdit={setEditingSleep} />
        )}

        <CareToolsSection className="px-1" />

        <SleepLogSheet
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            if (searchParams.get("add") === "1") {
              navigate("/sleep", { replace: true });
            }
          }}
          childId={activeChild.id}
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
      </div>
    </PageBody>
  );
}
