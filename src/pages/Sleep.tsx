import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, formatHoursCompact, formatHoursLong, formatWeekLabel, startOfDay } from "../lib/tracker";
import { timeSince } from "../lib/utils";
import { formatSleepTimerClock, formatSleepTimerSummary, getSleepTimerElapsedMs, getSleepTimerSettingKey, parseSleepTimerSession, type SleepTimerSession } from "../lib/sleep-timer";
import * as db from "../lib/db";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/ui/page-intro";
import { EmptyState, InsetPanel, PageBody, SectionHeading } from "../components/ui/page-layout";
import {
  TrackerEntryRow,
  TrackerEntryTable,
  TrackerMetricPanel,
  TrackerMetricRing,
  TrackerWeekBarChart,
  TrackerWeekRangePill,
  TrackerWeekSwitcher,
} from "../components/tracking/TrackerPrimitives";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { SleepPatternTimeline } from "../components/sleep/SleepPatternTimeline";
import type { HealthStatus, SleepEntry } from "../lib/types";

type PredictionConfidence = "low" | "medium" | "high";

interface WakeBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

interface WakeComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface WakeRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface SleepAdjustment {
  label: string;
  direction: "earlier" | "later";
}

interface SleepPrediction {
  predictedAt: Date;
  earliestAt: Date;
  latestAt: Date;
  confidence: PredictionConfidence;
  intervalHours: number;
  intervalLabel: string;
  state: "upcoming" | "due" | "overdue";
  source: "history" | "baseline";
  adjustments: SleepAdjustment[];
}

function getDurationMinutes(entry: SleepEntry): number {
  return Math.max(0, Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000));
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getOverlapMinutesForDay(entry: SleepEntry, dayKey: string): number {
  const dayStart = new Date(`${dayKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const start = new Date(entry.started_at);
  const end = new Date(entry.ended_at);
  const overlapStart = Math.max(start.getTime(), dayStart.getTime());
  const overlapEnd = Math.min(end.getTime(), dayEnd.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.round((overlapEnd - overlapStart) / 60000);
}

function formatDurationRing(minutes: number): { value: string; unit: string } {
  if (minutes <= 0) return { value: "0", unit: "today" };
  if (minutes < 60) return { value: `${minutes}`, unit: "min today" };
  const hours = Math.round((minutes / 60) * 10) / 10;
  return { value: `${hours}`, unit: "h today" };
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function toDayKey(dateStr: string): string {
  return dateStr.split("T")[0];
}

function getSleepTypeLabel(value: SleepEntry["sleep_type"]): string {
  return value === "night" ? "Night" : "Nap";
}

function getAgeDays(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / 86400000));
}

function getLastNapDisplay(activeChildDob: string | null, logs: SleepEntry[]): {
  timestamp: string | null;
  label: string;
} {
  const latestNap = logs.find((log) => log.sleep_type === "nap") ?? null;
  const ageDays = activeChildDob ? getAgeDays(activeChildDob) : 0;
  const shouldUseLastSleep = ageDays >= 730 || !latestNap;

  if (shouldUseLastSleep) {
    return {
      timestamp: logs[0]?.ended_at ?? null,
      label: "Last sleep",
    };
  }

  return {
    timestamp: latestNap.ended_at,
    label: "Last nap",
  };
}

function getWakeBaseline(dateOfBirth: string): WakeBaseline {
  const ageDays = getAgeDays(dateOfBirth);

  if (ageDays < 56) {
    return {
      label: "Newborn wake window",
      lowerHours: 0.75,
      upperHours: 1.5,
      description: "In the newborn stretch, the next sleep often comes quickly after waking.",
    };
  }

  if (ageDays < 120) {
    return {
      label: "Early infant wake window",
      lowerHours: 1,
      upperHours: 2,
      description: "Through the first months, wake windows usually start to lengthen but still stay fairly short.",
    };
  }

  if (ageDays < 240) {
    return {
      label: "Later infant wake window",
      lowerHours: 1.5,
      upperHours: 3,
      description: "As naps settle, many babies can stay awake longer before the next sleep block.",
    };
  }

  if (ageDays < 365) {
    return {
      label: "Older baby wake window",
      lowerHours: 2,
      upperHours: 4,
      description: "Older babies often move toward fewer naps and wider wake windows through the day.",
    };
  }

  return {
    label: "Toddler-like wake window",
    lowerHours: 3,
    upperHours: 5,
    description: "By toddler-like rhythms, the day often stretches into one or two bigger sleep windows.",
  };
}

function lowerConfidence(confidence: PredictionConfidence): PredictionConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

function getSleepPrediction(logs: SleepEntry[], baseline: WakeBaseline): SleepPrediction | null {
  const relevantLogs = logs.slice(0, 8);
  const lastSleep = relevantLogs[0] ?? null;
  if (!lastSleep) return null;

  const wakeWindowsMs: number[] = [];
  for (let index = 0; index < relevantLogs.length - 1; index += 1) {
    const newerStart = new Date(relevantLogs[index].started_at).getTime();
    const olderEnd = new Date(relevantLogs[index + 1].ended_at).getTime();
    const diff = newerStart - olderEnd;
    if (diff > 0) {
      wakeWindowsMs.push(diff);
    }
  }

  const hasHistory = wakeWindowsMs.length > 0;
  const sortedWindows = hasHistory ? [...wakeWindowsMs].sort((left, right) => left - right) : [];
  const middle = Math.floor(sortedWindows.length / 2);
  const baselineIntervalMs = ((baseline.lowerHours + baseline.upperHours) / 2) * 3600000;
  const medianMs = !hasHistory
    ? baselineIntervalMs
    : sortedWindows.length % 2 === 0
      ? (sortedWindows[middle - 1] + sortedWindows[middle]) / 2
      : sortedWindows[middle];

  const adjustments: SleepAdjustment[] = [];
  let intervalFactor = 1;
  const lastDurationMinutes = getDurationMinutes(lastSleep);

  if (lastDurationMinutes >= 120) {
    intervalFactor *= 1.12;
    adjustments.push({ label: "A longer last sleep can stretch the next wake window", direction: "later" });
  }

  if (lastDurationMinutes <= 45) {
    intervalFactor *= 0.86;
    adjustments.push({ label: "A shorter last sleep can bring the next rest forward", direction: "earlier" });
  }

  if (lastSleep.sleep_type === "night") {
    intervalFactor *= 1.15;
    adjustments.push({ label: "After night sleep, the next rest usually lands later than a nap cycle", direction: "later" });
  }

  intervalFactor = Math.max(0.72, Math.min(1.3, intervalFactor));
  const adjustedIntervalMs = medianMs * intervalFactor;
  const averageDeviationMs = hasHistory
    ? sortedWindows.reduce((sum, value) => sum + Math.abs(value - medianMs), 0) / sortedWindows.length
    : ((baseline.upperHours - baseline.lowerHours) / 2) * 3600000;
  const bufferMs = Math.max(45 * 60 * 1000, averageDeviationMs);
  const lastWakeAt = new Date(lastSleep.ended_at);
  const predictedAt = new Date(lastWakeAt.getTime() + adjustedIntervalMs);
  const earliestAt = new Date(predictedAt.getTime() - bufferMs);
  const latestAt = new Date(predictedAt.getTime() + bufferMs);
  const now = Date.now();
  const state = now > latestAt.getTime() ? "overdue" : now >= earliestAt.getTime() ? "due" : "upcoming";

  let confidence: PredictionConfidence = hasHistory
    ? sortedWindows.length >= 5 ? "high" : sortedWindows.length >= 3 ? "medium" : "low"
    : "low";

  if (!hasHistory || adjustments.length >= 2) {
    confidence = lowerConfidence(confidence);
  }

  return {
    predictedAt,
    earliestAt,
    latestAt,
    confidence,
    intervalHours: adjustedIntervalMs / 3600000,
    intervalLabel: formatHoursLong(adjustedIntervalMs / 3600000),
    state,
    source: hasHistory ? "history" : "baseline",
    adjustments,
  };
}

function formatBaselineRange(baseline: WakeBaseline): string {
  return `${formatHoursCompact(baseline.lowerHours)} - ${formatHoursCompact(baseline.upperHours)}`;
}

function getPredictionEstimateParts(prediction: SleepPrediction | null): { value: string; unit: string } {
  if (!prediction) {
    return { value: "No", unit: "data" };
  }

  const now = Date.now();
  const deltaMs = prediction.state === "overdue"
    ? now - prediction.latestAt.getTime()
    : prediction.state === "due"
      ? prediction.latestAt.getTime() - now
      : prediction.predictedAt.getTime() - now;
  const deltaHours = Math.abs(deltaMs) / 3600000;

  if (deltaHours < 1) {
    return {
      value: `${Math.max(1, Math.round((Math.abs(deltaMs) / 60000)))}`,
      unit: prediction.state === "overdue" ? "min late" : "min left",
    };
  }
  if (deltaHours < 36) {
    return {
      value: `${Math.round(deltaHours)}`,
      unit: prediction.state === "overdue" ? "hr late" : "hr left",
    };
  }
  return {
    value: `${Math.round((deltaHours / 24) * 10) / 10}`,
    unit: prediction.state === "overdue" ? "days late" : "days left",
  };
}

function getPredictionHeadline(prediction: SleepPrediction | null): string {
  if (!prediction) return "Not enough data";
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRelative(prediction: SleepPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRange(prediction: SleepPrediction): string {
  const sameDay = prediction.earliestAt.toDateString() === prediction.latestAt.toDateString();
  const startTime = prediction.earliestAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = prediction.latestAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (sameDay) {
    const dayLabel = prediction.earliestAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${dayLabel}, ${startTime} - ${endTime}`;
  }

  const startLabel = prediction.earliestAt.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const endLabel = prediction.latestAt.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${startLabel} - ${endLabel}`;
}

function getPredictionDescription(prediction: SleepPrediction): string {
  if (prediction.state === "overdue") {
    return prediction.source === "history"
      ? "The recent wake rhythm suggests another sleep window may already be running late."
      : "The age-based wake-window baseline suggests another sleep window may already be running late.";
  }
  if (prediction.state === "due") {
    return prediction.source === "history"
      ? "The recent wake rhythm suggests the next sleep window is open now."
      : "The age-based wake-window baseline suggests the next sleep window is open now.";
  }
  return prediction.source === "history"
    ? "This is the most likely next sleep window from the recent wake rhythm."
    : "This is the most likely next sleep window from the age-based wake-window baseline.";
}

function getWakeComparison(hoursSinceWake: number | null, baseline: WakeBaseline): WakeComparison {
  if (hoursSinceWake === null) {
    return {
      label: "No comparison yet",
      description: "Add a few sleep logs and this page will compare the current wake stretch to the usual window for this age.",
      tone: "info",
    };
  }

  if (hoursSinceWake < baseline.lowerHours * 0.85) {
    return {
      label: "Still early",
      description: "The current wake stretch is still on the early side for this age, so there is no sleep pressure signal yet.",
      tone: "healthy",
    };
  }

  if (hoursSinceWake <= baseline.upperHours) {
    return {
      label: "Within usual window",
      description: "The current wake stretch is still inside the usual range for this age.",
      tone: "healthy",
    };
  }

  if (hoursSinceWake <= baseline.upperHours * 1.2) {
    return {
      label: "Upper edge",
      description: "The wake stretch is brushing the upper edge of the usual range, so the next rest is worth planning for.",
      tone: "info",
    };
  }

  return {
    label: "Past the usual window",
    description: "The wake stretch is now beyond the usual range for this age, so the next sleep window matters more than the exact clock time.",
    tone: "cta",
  };
}

function getWakeRisk(hoursSinceWake: number | null, baseline: WakeBaseline, prediction: SleepPrediction | null): WakeRisk {
  if (hoursSinceWake === null) {
    return {
      label: "Low",
      score: 0,
      description: "No timing risk yet because there is not enough recent sleep data.",
      tone: "healthy",
    };
  }

  let score = 8;
  if (hoursSinceWake > baseline.upperHours) {
    score += Math.min(40, ((hoursSinceWake - baseline.upperHours) / baseline.upperHours) * 48);
  }
  if (prediction?.state === "due") score += 12;
  if (prediction?.state === "overdue") score += 24;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 60) {
    return {
      label: "High",
      score,
      description: "The wake stretch is past the usual range enough that the next sleep deserves priority now.",
      tone: "cta",
    };
  }

  if (score >= 30) {
    return {
      label: "Medium",
      score,
      description: "The next sleep window is coming into view and is worth setting up for.",
      tone: "info",
    };
  }

  return {
    label: "Low",
    score,
    description: "The current wake stretch still looks comfortably inside a normal range.",
    tone: "healthy",
  };
}

function buildSleepNarrative({
  baseline,
  wakeComparison,
  wakeRisk,
  prediction,
}: {
  baseline: WakeBaseline;
  wakeComparison: WakeComparison;
  wakeRisk: WakeRisk;
  prediction: SleepPrediction | null;
}) {
  if (wakeRisk.label === "High") {
    return `The current wake stretch is beyond the usual ${formatBaselineRange(baseline)} range, so the next rest matters more than the exact predicted minute.`;
  }

  if (wakeRisk.label === "Medium") {
    return `The rhythm is leaning toward the upper edge of the usual ${formatBaselineRange(baseline)} wake window. ${prediction ? `The next likely window is ${formatPredictionRange(prediction).toLowerCase()}.` : ""}`;
  }

  return `Right now the wake rhythm still looks broadly normal for this age, where a stretch around ${formatBaselineRange(baseline)} is still commonly seen. ${wakeComparison.description}`;
}

function getPredictionRingDisplay(prediction: SleepPrediction | null): { value: string; unit: string; gradient: string } {
  if (!prediction) {
    return { value: "No", unit: "data", gradient: "var(--gradient-status-unknown)" };
  }

  const estimate = getPredictionEstimateParts(prediction);
  if (prediction.state === "overdue") {
    return { value: estimate.value, unit: estimate.unit, gradient: "var(--gradient-status-alert)" };
  }
  if (prediction.state === "due") {
    return { value: estimate.value, unit: estimate.unit, gradient: "var(--gradient-status-caution)" };
  }
  return {
    value: estimate.value,
    unit: estimate.unit,
    gradient: prediction.confidence === "high" ? "var(--gradient-status-healthy)" : "var(--gradient-status-caution)",
  };
}

function getWakeStatusTone(wakeRisk: WakeRisk, prediction: SleepPrediction | null): HealthStatus {
  if (wakeRisk.label === "High" || prediction?.state === "overdue") return "alert";
  if (wakeRisk.label === "Medium" || prediction?.state === "due") return "caution";
  return "healthy";
}

function SleepLogList({ logs }: { logs: SleepEntry[] }) {
  if (logs.length === 0) {
    return (
      <InsetPanel>
        <p className="text-sm text-[var(--color-text-secondary)]">No sleep entries in this week.</p>
      </InsetPanel>
    );
  }

  return (
    <TrackerEntryTable mainHeader="Sleep block">
      {logs.map((log) => (
        <TrackerEntryRow key={log.id}>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {new Date(log.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
              {new Date(log.started_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.started_at)}</p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {getSleepTypeLabel(log.sleep_type)} · {formatDuration(getDurationMinutes(log))}
              </p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                {getSleepTypeLabel(log.sleep_type)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
              {new Date(log.started_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - {new Date(log.ended_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            {log.notes && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{log.notes}</p>
            )}
          </div>
        </TrackerEntryRow>
      ))}
    </TrackerEntryTable>
  );
}

export function Sleep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeChild } = useChildContext();
  const { logs, refresh } = useSleepLogs(activeChild?.id ?? null, 200);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());

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
    () => getWakeBaseline(activeChild?.date_of_birth ?? new Date().toISOString().split("T")[0]),
    [activeChild],
  );
  const prediction = useMemo(() => getSleepPrediction(logs, baseline), [baseline, logs]);
  const hoursSinceWake = latestLog ? (Date.now() - new Date(latestLog.ended_at).getTime()) / 3600000 : null;
  const wakeComparison = useMemo(() => getWakeComparison(hoursSinceWake, baseline), [baseline, hoursSinceWake]);
  const wakeRisk = useMemo(() => getWakeRisk(hoursSinceWake, baseline, prediction), [baseline, hoursSinceWake, prediction]);
  const narrative = useMemo(
    () => buildSleepNarrative({ baseline, wakeComparison, wakeRisk, prediction }),
    [baseline, wakeComparison, wakeRisk, prediction],
  );
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const todayDurationRing = useMemo(() => formatDurationRing(totalTodayMinutes), [totalTodayMinutes]);
  const statusTone = useMemo(() => getWakeStatusTone(wakeRisk, prediction), [wakeRisk, prediction]);

  if (!activeChild) return null;

  const weekSummaryBits = [
    weekLogs.length === 0 ? "No sleep blocks logged in this week" : `${weekLogs.length} sleep block${weekLogs.length === 1 ? "" : "s"} in this week`,
    totalTodayMinutes > 0 ? `Today total ${formatDuration(totalTodayMinutes)}` : null,
  ].filter(Boolean);

  const handleLogged = async () => {
    await refresh();
  };

  return (
    <PageBody className="space-y-4">
      <PageIntro
        eyebrow="Tracking"
        title="Sleep"
        description="Wake windows, next likely rest, and the week in one place."
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
        className="pb-3"
      />

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

      <Card>
        <CardContent className="p-4">
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

      <Card>
        <CardContent className="p-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current sleep status</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${
                wakeRisk.label === "High"
                  ? "bg-[var(--color-alert-bg)] text-[var(--color-alert)]"
                  : wakeRisk.label === "Medium"
                    ? "bg-[var(--color-caution-bg)] text-[var(--color-caution)]"
                    : "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]"
              }`}>
                {wakeRisk.label === "High" ? "Watch now" : wakeRisk.label === "Medium" ? "Soon" : "Normal"}
              </span>
            </div>
            <p className="mt-1.5 text-[1.4rem] font-semibold tracking-[-0.035em] text-[var(--color-text)]">
              {wakeRisk.label === "High" ? "Next sleep needs attention" : wakeRisk.label === "Medium" ? "Next rest is approaching" : "Wake rhythm looks settled"}
            </p>
            <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{baseline.description}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <TrackerMetricPanel
              eyebrow="Wake baseline"
              value={formatBaselineRange(baseline)}
              description={wakeComparison.label}
              tone={wakeComparison.tone}
            />
            <TrackerMetricPanel
              eyebrow="Due risk"
              value={wakeRisk.label}
              description={wakeRisk.description}
              tone={wakeRisk.tone}
            />
            <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely sleep</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                    {getPredictionHeadline(prediction)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    {prediction ? getPredictionDescription(prediction) : "Needs at least two sleep logs to estimate a rhythm."}
                  </p>
                </div>
                {prediction && (
                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    {prediction.confidence}
                  </span>
                )}
              </div>
              {prediction && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                    Typical wake: {prediction.intervalLabel}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                    {formatPredictionRelative(prediction)}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                    Source: {prediction.source === "history" ? "recent rhythm" : "age baseline"}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                    Window: {formatPredictionRange(prediction)}
                  </span>
                  {prediction.adjustments.slice(0, 2).map((adjustment) => (
                    <span
                      key={adjustment.label}
                      className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
                    >
                      {adjustment.direction === "earlier" ? "Earlier" : "Later"}: {adjustment.label}
                    </span>
                  ))}
                </div>
              )}
            </InsetPanel>
            <InsetPanel className="col-span-2 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">What this means</p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{narrative}</p>
            </InsetPanel>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <SectionHeading
            title="Weekly pattern"
            description="Seven-day sleep totals with week-by-week browsing."
            action={(
              <TrackerWeekSwitcher
                weekOffset={weekOffset}
                maxWeekOffset={maxWeekOffset}
                onOlder={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
                onNewer={() => setWeekOffset((current) => Math.max(0, current - 1))}
              />
            )}
          />
        </CardHeader>
        <CardContent>
          <TrackerWeekBarChart
            data={filledWeek.map((day) => ({ ...day, value: day.count }))}
            title={weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}
            summary={weekSummaryBits.join(" • ")}
            gradient="linear-gradient(180deg, var(--color-info) 0%, var(--color-primary) 100%)"
            valueLabel={(value) => `${value} hours`}
          />
        </CardContent>
      </Card>

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
                Every sleep block for the selected week, in a compact read-only view for now.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <SleepLogList logs={weekLogs} />
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
    </PageBody>
  );
}
