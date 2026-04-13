import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, formatWeekLabel, startOfDay } from "../lib/tracker";
import { timeSince } from "../lib/utils";
import { formatSleepTimerClock, formatSleepTimerSummary, getSleepTimerElapsedMs, getSleepTimerSettingKey, parseSleepTimerSession, type SleepTimerSession } from "../lib/sleep-timer";
import * as db from "../lib/db";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { EmptyState, InsetPanel, PageBody, SectionHeading } from "../components/ui/page-layout";
import {
  TrackerMetricRing,
  TrackerWeekRangePill,
} from "../components/tracking/TrackerPrimitives";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { CareToolsSection } from "../components/home/CareToolsSection";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { SleepLogList } from "../components/sleep/SleepLogList";
import { SleepPatternTimeline } from "../components/sleep/SleepPatternTimeline";
import { SleepStatusCard } from "../components/sleep/SleepStatusCard";
import { SleepWeeklyPatternCard } from "../components/sleep/SleepWeeklyPatternCard";
import type { SleepEntry } from "../lib/types";
import {
  formatDurationRing,
  formatSleepDuration,
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
  const { activeChild } = useChildContext();
  const { logs, refresh } = useSleepLogs(activeChild?.id ?? null, 200);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [statusExpanded, setStatusExpanded] = useState(false);

  const todayKey = getTodayKey();
  const todayLogs = useMemo(() => {
    const dayStart = new Date(`${todayKey}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return logs.filter((log) => {
      const startedAt = new Date(log.started_at).getTime();
      const endedAt = new Date(log.ended_at).getTime();
      return endedAt > dayStart && startedAt < dayEnd;
    });
  }, [logs, todayKey]);
  const totalTodayMinutes = useMemo(
    () => todayLogs.reduce((sum, log) => sum + getOverlapMinutesForDay(log, todayKey), 0),
    [todayKey, todayLogs],
  );
  const latestLog = logs[0] ?? null;
  const lastNapDisplay = useMemo(
    () => getLastNapDisplay(activeChild?.date_of_birth ?? null, logs),
    [activeChild, logs],
  );
  const patternDayKey = todayLogs.length > 0 ? todayKey : (latestLog ? toDayKey(latestLog.started_at) : todayKey);
  const patternLogs = logs.filter((log) => toDayKey(log.started_at) === patternDayKey);
  const patternLabel = patternDayKey === todayKey
    ? "Today"
    : `Latest logged day · ${new Date(`${patternDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  useEffect(() => {
    if (!activeChild) {
      setTimerSession(null);
      return;
    }

    let cancelled = false;
    const refreshTimerSession = () => {
      db.getSetting(getSleepTimerSettingKey(activeChild.id))
        .then((raw) => {
          if (!cancelled) {
            setTimerSession(parseSleepTimerSession(raw));
            setTick(Date.now());
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTimerSession(null);
            setTick(Date.now());
          }
        });
    };

    refreshTimerSession();
    window.addEventListener("focus", refreshTimerSession);
    document.addEventListener("visibilitychange", refreshTimerSession);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshTimerSession);
      document.removeEventListener("visibilitychange", refreshTimerSession);
    };
  }, [activeChild, sheetOpen]);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setSheetOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!timerSession) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerSession]);

  const earliestLoggedDate = useMemo(() => {
    if (logs.length === 0) return null;
    return startOfDay(new Date(logs[logs.length - 1].started_at));
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

  const weekLogs = useMemo(
    () => logs.filter((log) => log.started_at >= `${weekStartKey}T00:00:00` && log.started_at <= `${weekEndKey}T23:59:59`),
    [logs, weekEndKey, weekStartKey],
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
  const prediction = useMemo(() => getSleepPrediction(logs, baseline), [baseline, logs]);
  const hoursSinceWake = latestLog ? (Date.now() - new Date(latestLog.ended_at).getTime()) / 3600000 : null;
  const wakeComparison = useMemo(() => getWakeComparison(hoursSinceWake, baseline), [baseline, hoursSinceWake]);
  const wakeRisk = useMemo(() => getWakeRisk(hoursSinceWake, baseline, prediction), [baseline, hoursSinceWake, prediction]);
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const todayDurationRing = useMemo(() => formatDurationRing(totalTodayMinutes), [totalTodayMinutes]);
  const statusTone = useMemo(() => getWakeStatusTone(wakeRisk, prediction), [wakeRisk, prediction]);

  if (!activeChild) return null;

  const weekSummaryBits = [
    weekLogs.length === 0 ? "No sleep blocks logged in this week" : `${weekLogs.length} sleep block${weekLogs.length === 1 ? "" : "s"} in this week`,
    totalTodayMinutes > 0 ? `Today total ${formatSleepDuration(totalTodayMinutes)}` : null,
  ].filter(Boolean);

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
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator timestamp={lastNapDisplay.timestamp} status={statusTone} />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{lastNapDisplay.label}</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label="Next predicted"
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={todayDurationRing.value}
                unit={todayDurationRing.unit}
                label="Total sleep"
                gradient={totalTodayMinutes > 0 ? "var(--gradient-status-healthy)" : "var(--gradient-status-unknown)"}
              />
            </div>
          </CardContent>
        </Card>

        {timerSession && (
          <InsetPanel className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
                {timerSession.sleepType === "night" ? "Night timer running" : "Nap timer running"}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                {formatSleepTimerClock(getSleepTimerElapsedMs(timerSession, tick))}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Started {timeSince(timerSession.startedAt)} · {formatSleepTimerSummary(getSleepTimerElapsedMs(timerSession, tick))}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
              Open timer
            </Button>
          </InsetPanel>
        )}

        <SleepStatusCard
          baseline={baseline}
          prediction={prediction}
          statusExpanded={statusExpanded}
          wakeComparison={wakeComparison}
          wakeRisk={wakeRisk}
          onToggleExpanded={() => setStatusExpanded((current) => !current)}
        />

        <Card>
          <CardHeader>
            <SectionHeading
              title="Daily pattern"
              description="A simple timeline of the latest logged day so the day shape stays visible."
            />
          </CardHeader>
          <CardContent>
            <SleepPatternTimeline logs={patternLogs} dayLabel={patternLabel} />
          </CardContent>
        </Card>

        <SleepWeeklyPatternCard
          filledWeek={filledWeek}
          maxWeekOffset={maxWeekOffset}
          summary={weekSummaryBits.join(" • ")}
          title={weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}
          weekOffset={weekOffset}
          onOlder={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
          onNewer={() => setWeekOffset((current) => Math.max(0, current - 1))}
        />

        <CareToolsSection className="px-1" />

        {logs.length === 0 ? (
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
                  Every sleep block for the selected week, with tap-to-edit when the timing needs correcting.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <SleepLogList logs={weekLogs} onEdit={setEditingSleep} />
            </CardContent>
          </Card>
        )}

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
