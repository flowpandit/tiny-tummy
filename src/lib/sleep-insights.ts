import { formatHoursCompact, formatHoursLong } from "./tracker";
import type { HealthStatus, SleepEntry, SleepType } from "./types";

export type PredictionConfidence = "low" | "medium" | "high";

const NIGHT_SLEEP_START_MINUTES = 18 * 60 + 30;
const NIGHT_SLEEP_END_MINUTES = 23 * 60;
const MIN_NIGHT_SLEEP_DURATION_MS = 3 * 60 * 60 * 1000;
const NIGHT_INTERRUPTION_GAP_MS = 60 * 60 * 1000;

export interface WakeBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

export interface WakeComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface WakeRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface SleepAdjustment {
  label: string;
  direction: "earlier" | "later";
}

export interface SleepPrediction {
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

function getValidTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getLocalMinutesSinceMidnight(value: string): number | null {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function isNightSleepStart(value: string): boolean {
  const minutes = getLocalMinutesSinceMidnight(value);
  return minutes !== null && minutes >= NIGHT_SLEEP_START_MINUTES && minutes <= NIGHT_SLEEP_END_MINUTES;
}

function getEntryDurationMs(entry: SleepEntry): number {
  if (typeof entry.merged_duration_minutes === "number") {
    return Math.max(0, entry.merged_duration_minutes * 60000);
  }

  const startedAt = getValidTimestamp(entry.started_at);
  const endedAt = getValidTimestamp(entry.ended_at);
  if (startedAt === null || endedAt === null || endedAt <= startedAt) {
    return 0;
  }

  return endedAt - startedAt;
}

function normalizeSleepLogType(log: SleepEntry): SleepEntry {
  return {
    ...log,
    sleep_type: classifySleepType(log.started_at, log.ended_at),
  };
}

function buildMergedNightSleep(logs: SleepEntry[], totalDurationMs: number): SleepEntry {
  const [first] = logs;
  const last = logs[logs.length - 1];

  return {
    ...first,
    sleep_type: "night",
    ended_at: last.ended_at,
    merged_duration_minutes: Math.round(totalDurationMs / 60000),
    merged_segments: logs.map((log) => ({
      started_at: log.started_at,
      ended_at: log.ended_at,
    })),
    source_log_ids: logs.map((log) => log.id),
  };
}

export function getCompletedSleepLogs(logs: SleepEntry[], now = Date.now()): SleepEntry[] {
  return logs.filter((log) => {
    const startedAt = getValidTimestamp(log.started_at);
    const endedAt = getValidTimestamp(log.ended_at);

    if (startedAt === null || endedAt === null) {
      return false;
    }

    return startedAt < endedAt && startedAt <= now && endedAt <= now;
  });
}

export function classifySleepType(startedAtValue: string, endedAtValue: string): SleepType {
  const startedAt = getValidTimestamp(startedAtValue);
  const endedAt = getValidTimestamp(endedAtValue);

  if (startedAt === null || endedAt === null || endedAt <= startedAt) {
    return "nap";
  }

  if (endedAt - startedAt < MIN_NIGHT_SLEEP_DURATION_MS) {
    return "nap";
  }

  return isNightSleepStart(startedAtValue) ? "night" : "nap";
}

export function getClassifiedSleepLogs(logs: SleepEntry[], now = Date.now()): SleepEntry[] {
  const completedLogs = getCompletedSleepLogs(logs, now)
    .sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime());
  const classifiedLogs: SleepEntry[] = [];

  for (let index = 0; index < completedLogs.length;) {
    const firstLog = completedLogs[index];
    const firstStart = getValidTimestamp(firstLog.started_at);
    const firstEnd = getValidTimestamp(firstLog.ended_at);

    if (firstStart === null || firstEnd === null || !isNightSleepStart(firstLog.started_at)) {
      classifiedLogs.push(normalizeSleepLogType(firstLog));
      index += 1;
      continue;
    }

    const group = [firstLog];
    let groupEnd = firstEnd;
    let totalDurationMs = getEntryDurationMs(firstLog);
    index += 1;

    while (index < completedLogs.length) {
      const nextLog = completedLogs[index];
      const nextStart = getValidTimestamp(nextLog.started_at);
      const nextEnd = getValidTimestamp(nextLog.ended_at);

      if (nextStart === null || nextEnd === null) break;

      const gapMs = nextStart - groupEnd;
      if (gapMs < 0 || gapMs > NIGHT_INTERRUPTION_GAP_MS) {
        break;
      }

      group.push(nextLog);
      groupEnd = nextEnd;
      totalDurationMs += getEntryDurationMs(nextLog);
      index += 1;
    }

    if (totalDurationMs >= MIN_NIGHT_SLEEP_DURATION_MS) {
      classifiedLogs.push(buildMergedNightSleep(group, totalDurationMs));
    } else {
      classifiedLogs.push(...group.map(normalizeSleepLogType));
    }
  }

  return classifiedLogs.sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime());
}

export function getDurationMinutes(entry: SleepEntry): number {
  if (typeof entry.merged_duration_minutes === "number") {
    return Math.max(0, Math.round(entry.merged_duration_minutes));
  }

  return Math.max(0, Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000));
}

export function formatSleepDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getOverlapMinutesForRange(startedAt: string, endedAt: string, dayKey: string): number {
  const dayStart = new Date(`${dayKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const overlapStart = Math.max(start.getTime(), dayStart.getTime());
  const overlapEnd = Math.min(end.getTime(), dayEnd.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.round((overlapEnd - overlapStart) / 60000);
}

export function getOverlapMinutesForDay(entry: SleepEntry, dayKey: string): number {
  if (entry.merged_segments?.length) {
    return entry.merged_segments.reduce(
      (sum, segment) => sum + getOverlapMinutesForRange(segment.started_at, segment.ended_at, dayKey),
      0,
    );
  }

  return getOverlapMinutesForRange(entry.started_at, entry.ended_at, dayKey);
}

export function formatDurationRing(minutes: number): { value: string; unit: string } {
  if (minutes <= 0) return { value: "0", unit: "today" };
  if (minutes < 60) return { value: `${minutes}`, unit: "min today" };
  const hours = Math.round((minutes / 60) * 10) / 10;
  return { value: `${hours}`, unit: "h today" };
}

export function buildSleepWeekSummary(weekLogCount: number, totalTodayMinutes: number) {
  return [
    weekLogCount === 0
      ? "No sleep blocks logged in this week"
      : `${weekLogCount} sleep block${weekLogCount === 1 ? "" : "s"} in this week`,
    totalTodayMinutes > 0 ? `Today total ${formatSleepDuration(totalTodayMinutes)}` : null,
  ].filter(Boolean).join(" • ");
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}

export function toDayKey(dateStr: string): string {
  return dateStr.split("T")[0];
}

export function getSleepTypeLabel(value: SleepEntry["sleep_type"]): string {
  return value === "night" ? "Night" : "Nap";
}

function getAgeDays(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(year, (month || 1) - 1, day || 1);
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / 86400000));
}

export function getLastNapDisplay(activeChildDob: string | null, logs: SleepEntry[]): {
  timestamp: string | null;
  label: string;
} {
  const completedLogs = getClassifiedSleepLogs(logs);
  const latestNap = completedLogs.find((log) => log.sleep_type === "nap") ?? null;
  const ageDays = activeChildDob ? getAgeDays(activeChildDob) : 0;
  const shouldUseLastSleep = ageDays >= 730 || !latestNap;

  if (shouldUseLastSleep) {
    return {
      timestamp: completedLogs[0]?.ended_at ?? null,
      label: "Last sleep",
    };
  }

  return {
    timestamp: latestNap.ended_at,
    label: "Last nap",
  };
}

export function getWakeBaseline(dateOfBirth: string): WakeBaseline {
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

export function getSleepPrediction(logs: SleepEntry[], baseline: WakeBaseline): SleepPrediction | null {
  const relevantLogs = getClassifiedSleepLogs(logs).slice(0, 8);
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

export function formatWakeBaselineRange(baseline: WakeBaseline): string {
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
      value: `${Math.max(1, Math.round(Math.abs(deltaMs) / 60000))}`,
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

export function getPredictionHeadline(prediction: SleepPrediction | null): string {
  if (!prediction) return "Not enough data";
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRelative(prediction: SleepPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRange(prediction: SleepPrediction): string {
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

export function getPredictionDescription(prediction: SleepPrediction): string {
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

export function getWakeComparison(hoursSinceWake: number | null, baseline: WakeBaseline): WakeComparison {
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

export function getWakeRisk(hoursSinceWake: number | null, baseline: WakeBaseline, prediction: SleepPrediction | null): WakeRisk {
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

export function buildSleepNarrative({
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
    return `The current wake stretch is beyond the usual ${formatWakeBaselineRange(baseline)} range, so the next rest matters more than the exact predicted minute.`;
  }

  if (wakeRisk.label === "Medium") {
    return `The rhythm is leaning toward the upper edge of the usual ${formatWakeBaselineRange(baseline)} wake window. ${prediction ? `The next likely window is ${formatPredictionRange(prediction).toLowerCase()}.` : ""}`;
  }

  return `Right now the wake rhythm still looks broadly normal for this age, where a stretch around ${formatWakeBaselineRange(baseline)} is still commonly seen. ${wakeComparison.description}`;
}

export function getPredictionRingDisplay(prediction: SleepPrediction | null): { value: string; unit: string; gradient: string } {
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

export function getWakeStatusTone(wakeRisk: WakeRisk, prediction: SleepPrediction | null): HealthStatus {
  if (wakeRisk.label === "High" || prediction?.state === "overdue") return "alert";
  if (wakeRisk.label === "Medium" || prediction?.state === "due") return "caution";
  return "healthy";
}

export function getSleepStatusAccentColor(wakeRisk: WakeRisk): string {
  if (wakeRisk.label === "High") return "var(--color-alert)";
  if (wakeRisk.label === "Medium") return "var(--color-caution)";
  return "var(--color-healthy)";
}
