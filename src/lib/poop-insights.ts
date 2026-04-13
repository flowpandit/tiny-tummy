import { STOOL_COLORS } from "./constants";
import { getRelativeDayLabel } from "./date-labels";
import { formatHoursCompact, formatHoursLong } from "./tracker";
import type { Alert, FeedingEntry, HealthStatus, PoopEntry, PoopLogDraft, SymptomEntry } from "./types";

export type PredictionConfidence = "low" | "medium" | "high";

export interface AgeBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

export interface BaselineComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface DueRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface PredictionAdjustment {
  label: string;
  direction: "earlier" | "later";
}

export interface PoopPrediction {
  predictedAt: Date;
  earliestAt: Date;
  latestAt: Date;
  confidence: PredictionConfidence;
  intervalHours: number;
  intervalLabel: string;
  state: "upcoming" | "due" | "overdue";
  source: "history" | "baseline";
  adjustments: PredictionAdjustment[];
}

function getAgeDays(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(year, (month || 1) - 1, day || 1);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
}

export function getRepeatablePoopEntry(lastPoop: PoopEntry | null): PoopEntry | null {
  if (
    !lastPoop
    || lastPoop.is_no_poop === 1
    || lastPoop.stool_type === null
    || !lastPoop.color
    || !lastPoop.size
  ) {
    return null;
  }

  if (lastPoop.stool_type < 3 || lastPoop.stool_type > 5) {
    return null;
  }

  const colorInfo = STOOL_COLORS.find((item) => item.value === lastPoop.color);
  if (colorInfo?.isRedFlag) {
    return null;
  }

  const ageMs = Date.now() - new Date(lastPoop.logged_at).getTime();
  if (ageMs > 72 * 60 * 60 * 1000) {
    return null;
  }

  return lastPoop;
}

export function getPoopColorHex(color: PoopEntry["color"] | Partial<PoopLogDraft>["color"]): string {
  return STOOL_COLORS.find((item) => item.value === color)?.hex ?? "#b58754";
}

export function getRecentHistoryDayLabel(dateStr: string): string {
  return getRelativeDayLabel(dateStr);
}

export function getAgeBaseline(dateOfBirth: string, feedingType: string): AgeBaseline {
  const ageDays = getAgeDays(dateOfBirth);

  if (ageDays < 14) {
    return {
      label: "Newborn rhythm",
      lowerHours: 4,
      upperHours: 12,
      description: "In the first two weeks, stools are often frequent while feeding settles in.",
    };
  }

  if (ageDays < 56) {
    return {
      label: "Early weeks",
      lowerHours: 4,
      upperHours: 18,
      description: "During the first weeks, a shorter gap is still common and day-to-day variation can be wide.",
    };
  }

  if (ageDays < 180) {
    if (feedingType === "breast") {
      return {
        label: "Breastfed infant range",
        lowerHours: 8,
        upperHours: 48,
        description: "Breastfed babies can vary a lot. Some still go often, while others stretch closer to two days.",
      };
    }

    if (feedingType === "formula") {
      return {
        label: "Formula-fed infant range",
        lowerHours: 8,
        upperHours: 30,
        description: "Formula-fed babies often settle into a steadier rhythm, usually with shorter gaps than breastfed babies.",
      };
    }

    return {
      label: "Mixed-feeding range",
      lowerHours: 8,
      upperHours: 36,
      description: "Mixed feeding usually lands between breast and formula rhythms, with some healthy variability.",
    };
  }

  if (ageDays < 365) {
    return {
      label: feedingType === "solids" ? "Solids transition range" : "Later infant range",
      lowerHours: 12,
      upperHours: 36,
      description: "Once solids are in the mix, the timing can slow a little and the pattern often becomes more meal-linked.",
    };
  }

  return {
    label: "Toddler-like range",
    lowerHours: 18,
    upperHours: 48,
    description: "Older babies and toddlers often settle into a once-or-twice-a-day rhythm, with some healthy spread around that.",
  };
}

export function formatBaselineRange(baseline: AgeBaseline): string {
  return `${formatHoursCompact(baseline.lowerHours)} - ${formatHoursCompact(baseline.upperHours)}`;
}

function getRelevantFeeds(feedingLogs: FeedingEntry[], lastPoopAt: Date | null): FeedingEntry[] {
  const now = Date.now();
  const lowerBound = lastPoopAt?.getTime() ?? now - 24 * 60 * 60 * 1000;

  return feedingLogs.filter((feed) => {
    const loggedAt = new Date(feed.logged_at).getTime();
    return loggedAt >= lowerBound && loggedAt <= now;
  });
}

function getRelevantSymptoms(symptomLogs: SymptomEntry[], lastPoopAt: Date | null): SymptomEntry[] {
  const now = Date.now();
  const lowerBound = Math.max(lastPoopAt?.getTime() ?? 0, now - 36 * 60 * 60 * 1000);

  return symptomLogs.filter((symptom) => {
    const loggedAt = new Date(symptom.logged_at).getTime();
    return loggedAt >= lowerBound && loggedAt <= now;
  });
}

function lowerConfidence(confidence: PredictionConfidence): PredictionConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

export function getPrediction(
  logs: PoopEntry[],
  baseline: AgeBaseline,
  feedingLogs: FeedingEntry[],
  symptomLogs: SymptomEntry[],
  activeEpisodeType: string | null,
): PoopPrediction | null {
  const realLogs = logs.filter((log) => log.is_no_poop === 0).slice(0, 8);
  const lastPoopAt = realLogs[0] ? new Date(realLogs[0].logged_at) : null;
  if (!lastPoopAt) return null;

  const intervalsMs: number[] = [];
  for (let index = 0; index < realLogs.length - 1; index += 1) {
    const newer = new Date(realLogs[index].logged_at).getTime();
    const older = new Date(realLogs[index + 1].logged_at).getTime();
    const diff = newer - older;
    if (diff > 0) {
      intervalsMs.push(diff);
    }
  }

  const hasHistory = intervalsMs.length > 0;
  const sortedIntervals = hasHistory ? [...intervalsMs].sort((left, right) => left - right) : [];
  const middle = Math.floor(sortedIntervals.length / 2);
  const baselineIntervalMs = ((baseline.lowerHours + baseline.upperHours) / 2) * 3600000;
  const medianMs = !hasHistory
    ? baselineIntervalMs
    : sortedIntervals.length % 2 === 0
      ? (sortedIntervals[middle - 1] + sortedIntervals[middle]) / 2
      : sortedIntervals[middle];

  const relevantFeeds = getRelevantFeeds(feedingLogs, lastPoopAt);
  const relevantSymptoms = getRelevantSymptoms(symptomLogs, lastPoopAt);
  const adjustments: PredictionAdjustment[] = [];
  let intervalFactor = 1;

  if (relevantFeeds.some((feed) => feed.is_constipation_support === 1 || feed.food_type === "water")) {
    intervalFactor *= 0.9;
    adjustments.push({ label: "Hydration support may bring it forward", direction: "earlier" });
  }

  if (relevantFeeds.some((feed) => feed.food_type === "solids")) {
    intervalFactor *= 1.08;
    adjustments.push({ label: "Recent solids may slow the rhythm slightly", direction: "later" });
  }

  if (activeEpisodeType === "constipation") {
    intervalFactor *= 1.14;
    adjustments.push({ label: "Active constipation episode can stretch the gap", direction: "later" });
  }

  if (activeEpisodeType === "diarrhoea") {
    intervalFactor *= 0.8;
    adjustments.push({ label: "Loose-stool episode can speed the next poop up", direction: "earlier" });
  }

  if (activeEpisodeType === "solids_transition") {
    intervalFactor *= 1.06;
    adjustments.push({ label: "Solids transition can make timing less regular", direction: "later" });
  }

  if (relevantSymptoms.some((symptom) => symptom.symptom_type === "dehydration_concern" && symptom.severity !== "mild")) {
    intervalFactor *= 1.1;
    adjustments.push({ label: "Dehydration concern can lengthen the gap", direction: "later" });
  }

  if (relevantSymptoms.some((symptom) => (symptom.symptom_type === "straining" || symptom.symptom_type === "pain") && symptom.severity !== "mild")) {
    intervalFactor *= 1.06;
    adjustments.push({ label: "Straining or pain suggests a slower passage", direction: "later" });
  }

  intervalFactor = Math.min(1.35, Math.max(0.72, intervalFactor));
  const adjustedIntervalMs = medianMs * intervalFactor;

  const averageDeviationMs = hasHistory
    ? sortedIntervals.reduce((sum, value) => sum + Math.abs(value - medianMs), 0) / sortedIntervals.length
    : ((baseline.upperHours - baseline.lowerHours) / 2) * 3600000;
  const fallbackBufferMs = 6 * 60 * 60 * 1000;
  const bufferMs = Math.max(fallbackBufferMs, averageDeviationMs);
  const predictedAt = new Date(lastPoopAt.getTime() + adjustedIntervalMs);
  const earliestAt = new Date(predictedAt.getTime() - bufferMs);
  const latestAt = new Date(predictedAt.getTime() + bufferMs);
  const now = Date.now();
  const state = now > latestAt.getTime() ? "overdue" : now >= earliestAt.getTime() ? "due" : "upcoming";
  let confidence: PredictionConfidence = hasHistory
    ? sortedIntervals.length >= 5 ? "high" : sortedIntervals.length >= 3 ? "medium" : "low"
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

function getPredictionEstimateParts(prediction: PoopPrediction | null): {
  value: string;
  unit: string;
} {
  if (!prediction) {
    return { value: "No", unit: "data" };
  }

  const now = Date.now();

  if (prediction.state === "due") {
    const remainingHours = (prediction.latestAt.getTime() - now) / 3600000;
    if (remainingHours < 1) {
      return { value: `${Math.max(1, Math.round(remainingHours * 60))}`, unit: "min left" };
    }
    if (remainingHours < 36) {
      return { value: `${Math.round(remainingHours)}`, unit: "hr left" };
    }
    return { value: `${Math.round((remainingHours / 24) * 10) / 10}`, unit: "days left" };
  }

  if (prediction.state === "overdue") {
    const overdueHours = (now - prediction.latestAt.getTime()) / 3600000;
    if (overdueHours < 1) {
      return { value: `${Math.max(1, Math.round(overdueHours * 60))}`, unit: "min late" };
    }
    if (overdueHours < 36) {
      return { value: `${Math.round(overdueHours)}`, unit: "hr late" };
    }
    return { value: `${Math.round((overdueHours / 24) * 10) / 10}`, unit: "days late" };
  }

  const untilHours = (prediction.predictedAt.getTime() - now) / 3600000;
  if (untilHours < 1) {
    return { value: `${Math.max(1, Math.round(untilHours * 60))}`, unit: "min left" };
  }
  if (untilHours < 36) {
    return { value: `${Math.round(untilHours)}`, unit: "hr left" };
  }
  return { value: `${Math.round((untilHours / 24) * 10) / 10}`, unit: "days left" };
}

export function getPredictionHeadline(prediction: PoopPrediction | null): string {
  if (!prediction) return "Not enough data";

  const estimate = getPredictionEstimateParts(prediction);
  return `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRelative(prediction: PoopPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  if (prediction.state === "overdue") {
    return `About ${estimate.value} ${estimate.unit}`;
  }
  return `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRange(prediction: PoopPrediction): string {
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

export function formatPredictionWindow(prediction: PoopPrediction): string {
  const timeLabel = prediction.predictedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayLabel = prediction.predictedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${dayLabel} around ${timeLabel}`;
}

export function getPredictionDescription(prediction: PoopPrediction): string {
  if (prediction.state === "overdue") {
    return prediction.source === "history"
      ? "Based on the recent rhythm and current context, another poop may be running late now."
      : "Using the age-based baseline and current context, another poop may be running late now.";
  }
  if (prediction.state === "due") {
    return prediction.source === "history"
      ? "Based on the recent rhythm and current context, the next poop is likely due in this window."
      : "Using the age-based baseline and current context, the next poop is likely due in this window.";
  }
  return prediction.source === "history"
    ? "Based on the recent rhythm and current context, this is the most likely next window."
    : "Using the age-based baseline and current context, this is the most likely next window.";
}

export function getStatusBadge(status: HealthStatus): { label: string; className: string } {
  if (status === "healthy") {
    return { label: "Normal", className: "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]" };
  }
  if (status === "caution") {
    return { label: "Watch", className: "bg-[var(--color-caution-bg)] text-[var(--color-caution)]" };
  }
  if (status === "alert") {
    return { label: "Concern", className: "bg-[var(--color-alert-bg)] text-[var(--color-alert)]" };
  }
  return { label: "Unknown", className: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]" };
}

export function getHealthInsightContent(status: HealthStatus, normalDescription: string): {
  title: string;
  detail: string;
  accentColor: string;
} {
  if (status === "alert") {
    return {
      title: "Needs Attention",
      detail: normalDescription || "Current timing and risk signals suggest this pattern needs closer attention right now.",
      accentColor: "var(--color-alert)",
    };
  }

  if (status === "caution") {
    return {
      title: "Keep Watching",
      detail: normalDescription || "The pattern is edging out of the usual range, so it is worth monitoring a bit more closely.",
      accentColor: "var(--color-caution)",
    };
  }

  return {
    title: "Health Insight",
    detail: normalDescription || "Frequency is stable and the current pattern still looks within the usual range for this age.",
    accentColor: "var(--color-healthy)",
  };
}

export function getPredictionRingDisplay(prediction: PoopPrediction | null): {
  value: string;
  unit: string;
  gradient: string;
} {
  if (!prediction) {
    return {
      value: "No",
      unit: "data",
      gradient: "var(--gradient-status-unknown)",
    };
  }

  const estimate = getPredictionEstimateParts(prediction);

  if (prediction.state === "due") {
    return {
      value: estimate.value,
      unit: estimate.unit,
      gradient: "var(--gradient-status-caution)",
    };
  }

  if (prediction.state === "overdue") {
    return {
      value: estimate.value,
      unit: estimate.unit,
      gradient: "var(--gradient-status-alert)",
    };
  }

  return {
    value: estimate.value,
    unit: estimate.unit,
    gradient: prediction.confidence === "high" ? "var(--gradient-status-healthy)" : "var(--gradient-status-caution)",
  };
}

export function getAlertRingDisplay(alerts: Alert[]): {
  value: string;
  unit: string;
  gradient: string;
} {
  if (alerts.length === 0) {
    return {
      value: "0",
      unit: "alerts",
      gradient: "var(--gradient-status-healthy)",
    };
  }

  const hasUrgent = alerts.some((alert) => alert.severity === "urgent");
  const hasWarning = alerts.some((alert) => alert.severity === "warning");

  return {
    value: `${alerts.length}`,
    unit: alerts.length === 1 ? "alert" : "alerts",
    gradient: hasUrgent
      ? "var(--gradient-status-alert)"
      : hasWarning
        ? "var(--gradient-status-caution)"
        : "var(--gradient-status-unknown)",
  };
}

export function getBaselineComparison(hoursSinceLastPoop: number | null, baseline: AgeBaseline): BaselineComparison {
  if (hoursSinceLastPoop === null) {
    return {
      label: "No comparison yet",
      description: "Add a couple of logs and this page will start comparing the current gap to the usual range for this age.",
      tone: "info",
    };
  }

  if (hoursSinceLastPoop < baseline.lowerHours * 0.75) {
    return {
      label: "Faster than usual",
      description: "The current gap is shorter than the usual age range, which can still happen when babies are going more frequently.",
      tone: "info",
    };
  }

  if (hoursSinceLastPoop <= baseline.upperHours) {
    return {
      label: "Within age range",
      description: "The current gap still sits inside the usual range for this age and feeding stage.",
      tone: "healthy",
    };
  }

  if (hoursSinceLastPoop <= baseline.upperHours * 1.25) {
    return {
      label: "Upper edge",
      description: "The current gap is brushing the upper end of the usual range, so it is worth watching rather than panicking.",
      tone: "info",
    };
  }

  return {
    label: "Beyond usual range",
    description: "The current gap is now running past the usual range for this age, so the surrounding alerts and symptoms matter more.",
    tone: "cta",
  };
}

export function getDueRisk(
  hoursSinceLastPoop: number | null,
  baseline: AgeBaseline,
  prediction: PoopPrediction | null,
  alerts: Alert[],
  symptomLogs: SymptomEntry[],
  activeEpisodeType: string | null,
  feedingLogs: FeedingEntry[],
  lastRealPoopAt: string | null,
): DueRisk {
  if (hoursSinceLastPoop === null) {
    return {
      label: "Low",
      score: 0,
      description: "No risk signal yet because there is not enough recent poop timing data.",
      tone: "healthy",
    };
  }

  let score = 8;

  if (hoursSinceLastPoop > baseline.upperHours) {
    score += Math.min(35, ((hoursSinceLastPoop - baseline.upperHours) / baseline.upperHours) * 45);
  }

  if (prediction?.state === "due") score += 12;
  if (prediction?.state === "overdue") score += 26;

  alerts.forEach((alert) => {
    if (alert.severity === "urgent") score += 24;
    else if (alert.severity === "warning") score += 14;
    else score += 6;
  });

  if (activeEpisodeType === "constipation") score += 14;
  if (activeEpisodeType === "diarrhoea") score += 10;
  if (activeEpisodeType === "solids_transition") score += 6;

  const relevantSymptoms = getRelevantSymptoms(symptomLogs, lastRealPoopAt ? new Date(lastRealPoopAt) : null);
  relevantSymptoms.forEach((symptom) => {
    if (symptom.severity === "severe") score += 12;
    else if (symptom.severity === "moderate") score += 7;
    else score += 3;
  });

  const relevantFeeds = getRelevantFeeds(feedingLogs, lastRealPoopAt ? new Date(lastRealPoopAt) : null);
  if (relevantFeeds.some((feed) => feed.is_constipation_support === 1 || feed.food_type === "water")) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 60) {
    return {
      label: "High",
      score,
      description: "Several signals point to a longer or more concerning gap now, so this deserves closer attention.",
      tone: "cta",
    };
  }

  if (score >= 30) {
    return {
      label: "Medium",
      score,
      description: "The pattern is drifting toward the upper edge, so it is worth watching over the next day.",
      tone: "info",
    };
  }

  return {
    label: "Low",
    score,
    description: "The current timing does not look urgent on its own right now.",
    tone: "healthy",
  };
}

export function buildPatternNarrative({
  status,
  baseline,
  baselineComparison,
  dueRisk,
  prediction,
  alerts,
  symptomLogs,
  activeEpisodeType,
}: {
  status: HealthStatus;
  baseline: AgeBaseline;
  baselineComparison: BaselineComparison;
  dueRisk: DueRisk;
  prediction: PoopPrediction | null;
  alerts: Alert[];
  symptomLogs: SymptomEntry[];
  activeEpisodeType: string | null;
}): string {
  const recentSymptom = symptomLogs[0] ?? null;

  if (alerts.some((alert) => alert.severity === "urgent") || dueRisk.label === "High" || status === "alert") {
    const contextBits = [
      activeEpisodeType === "constipation" ? "an active constipation episode" : null,
      recentSymptom ? `${recentSymptom.symptom_type.replace("_", " ")}` : null,
    ].filter(Boolean);

    return `This pattern leans concerning now because the gap is past the usual ${formatBaselineRange(baseline)} range${contextBits.length > 0 ? `, with ${contextBits.join(" and ")} also in the picture` : ""}. Use the active alerts above as the stronger signal than the prediction window.`;
  }

  if (dueRisk.label === "Medium" || status === "caution") {
    return `Right now the pattern is brushing the upper end of the usual ${formatBaselineRange(baseline)} range for this age. That does not automatically mean something is wrong, but it is worth keeping an eye on the next window${prediction ? ` around ${formatPredictionWindow(prediction)}` : ""}.`;
  }

  return `Right now the rhythm still looks broadly normal for this age, where a gap around ${formatBaselineRange(baseline)} is still commonly seen. ${baselineComparison.description}${prediction ? ` The next likely window is ${formatPredictionWindow(prediction).toLowerCase()}.` : ""}`;
}
