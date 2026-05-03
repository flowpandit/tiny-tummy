import { formatHoursCompact, formatHoursLong } from "./tracker";
import { getFoodTypeLabel } from "./feeding";
import { formatVolumeValue, getVolumeDisplayParts } from "./units";
import type { FeedingEntry, FeedingType, HealthStatus, UnitSystem } from "./types";

export type PredictionConfidence = "low" | "medium" | "high";

export interface FeedBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

export interface FeedComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface FeedRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

export interface FeedAdjustment {
  label: string;
  direction: "earlier" | "later";
}

export interface FeedPrediction {
  predictedAt: Date;
  earliestAt: Date;
  latestAt: Date;
  confidence: PredictionConfidence;
  intervalHours: number;
  intervalLabel: string;
  state: "upcoming" | "due" | "overdue";
  source: "history" | "baseline";
  adjustments: FeedAdjustment[];
}

export interface FeedMixSnapshot {
  dominantLabel: string;
  dominantCount: number;
  description: string;
  tone: "healthy" | "info" | "cta";
  chips: string[];
}

export const FEED_PREDICTION_FALLBACK = "Log feeds to predict next feeding time";

function getAgeDays(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(year, (month || 1) - 1, day || 1);
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / 86400000));
}

export function getFeedBaseline(dateOfBirth: string, feedingType: FeedingType): FeedBaseline {
  const ageDays = getAgeDays(dateOfBirth);

  if (ageDays < 30) {
    return {
      label: "Newborn feed rhythm",
      lowerHours: 2,
      upperHours: 3.5,
      description: "In the first month, feeds are often close together and the day can feel like one long rolling cycle.",
    };
  }

  if (ageDays < 120) {
    return {
      label: feedingType === "formula" ? "Early bottle rhythm" : "Early infant rhythm",
      lowerHours: 2.5,
      upperHours: feedingType === "formula" ? 4.5 : 4,
      description: "Most early infant days still cluster around frequent feeds, with some wider gaps overnight.",
    };
  }

  if (ageDays < 365) {
    if (feedingType === "solids") {
      return {
        label: "Solids-led rhythm",
        lowerHours: 3,
        upperHours: 5.5,
        description: "Once meals are part of the day, feed timing often spreads out and becomes more meal-led.",
      };
    }

    return {
      label: "Later infant rhythm",
      lowerHours: 3,
      upperHours: feedingType === "formula" ? 5 : 4.5,
      description: "Later infant feeds usually open up into wider, steadier gaps than the newborn weeks.",
    };
  }

  return {
    label: "Toddler-like meal rhythm",
    lowerHours: 3.5,
    upperHours: 6,
    description: "As meals dominate, the day tends to settle into fewer, more deliberate feed or snack windows.",
  };
}

function getFeedTimestamp(log: FeedingEntry): number {
  const timestamp = new Date(log.logged_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isFeedTimelineEntry(log: FeedingEntry): boolean {
  return log.food_type !== "pumping";
}

export function getUnifiedFeedTimeline(logs: FeedingEntry[]): FeedingEntry[] {
  return logs
    .filter(isFeedTimelineEntry)
    .sort((left, right) => getFeedTimestamp(right) - getFeedTimestamp(left));
}

export function getPredictableFeedLogs(logs: FeedingEntry[]): FeedingEntry[] {
  return getUnifiedFeedTimeline(logs);
}

export function getTrackedMl(logs: FeedingEntry[]): number {
  return logs.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0);
}

export function getFeedTypeCounts(logs: FeedingEntry[]): Map<FeedingEntry["food_type"], number> {
  return logs.reduce((map, log) => {
    map.set(log.food_type, (map.get(log.food_type) ?? 0) + 1);
    return map;
  }, new Map<FeedingEntry["food_type"], number>());
}

export function getFeedMixSnapshot(logs: FeedingEntry[]): FeedMixSnapshot {
  if (logs.length === 0) {
    return {
      dominantLabel: "No mix yet",
      dominantCount: 0,
      description: "Once a few feeds are in, this page starts surfacing what is leading the week and how meals are mixing in.",
      tone: "info",
      chips: [],
    };
  }

  const typeCounts = getFeedTypeCounts(logs);
  const dominantEntry = [...typeCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
  const dominantType = dominantEntry?.[0] ?? "other";
  const dominantCount = dominantEntry?.[1] ?? 0;
  const solidsCount = typeCounts.get("solids") ?? 0;
  const supportCount = logs.filter((log) => Boolean(log.is_constipation_support)).length;
  const bottleLikeCount = (typeCounts.get("bottle") ?? 0) + (typeCounts.get("formula") ?? 0);
  const dominantLabel = getFoodTypeLabel(dominantType);
  const chips = [
    solidsCount > 0 ? `${solidsCount} solids` : null,
    bottleLikeCount > 0 ? `${bottleLikeCount} bottle/formula` : null,
    supportCount > 0 ? `${supportCount} support` : null,
  ].filter(Boolean) as string[];

  if (solidsCount >= Math.max(2, Math.ceil(logs.length / 3))) {
    return {
      dominantLabel,
      dominantCount,
      description: "Meals are a visible part of the week now, so feed timing will often feel more meal-led than newborn-style.",
      tone: "info",
      chips,
    };
  }

  if (supportCount > 0) {
    return {
      dominantLabel,
      dominantCount,
      description: "Support foods or hydration are in the mix this week, which can shift both appetite timing and stool rhythm.",
      tone: "healthy",
      chips,
    };
  }

  return {
    dominantLabel,
    dominantCount,
    description: `Most logged entries this week are ${dominantLabel.toLowerCase()}, which gives the current rhythm its main shape.`,
    tone: "healthy",
    chips,
  };
}

export function buildFeedWeekSummary(
  weeklyPredictableLogs: FeedingEntry[],
  unitSystem: UnitSystem,
  weekTrackedMl: number,
) {
  const dominantType = [...getFeedTypeCounts(weeklyPredictableLogs).entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

  return [
    weeklyPredictableLogs.length === 0
      ? "No feeds logged in this week"
      : `${weeklyPredictableLogs.length} feed${weeklyPredictableLogs.length === 1 ? "" : "s"} in this week`,
    dominantType ? `Mostly ${getFoodTypeLabel(dominantType).toLowerCase()}` : null,
    weekTrackedMl > 0 ? `${formatVolumeValue(weekTrackedMl, unitSystem)} tracked` : null,
  ].filter(Boolean).join(" • ");
}

function lowerConfidence(confidence: PredictionConfidence): PredictionConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

export function getFeedPrediction(logs: FeedingEntry[], baseline: FeedBaseline): FeedPrediction | null {
  const relevantLogs = getPredictableFeedLogs(logs).slice(0, 8);
  const lastFeed = relevantLogs[0] ?? null;
  if (!lastFeed) return null;

  const intervalsMs: number[] = [];
  for (let index = 0; index < relevantLogs.length - 1; index += 1) {
    const newer = new Date(relevantLogs[index].logged_at).getTime();
    const older = new Date(relevantLogs[index + 1].logged_at).getTime();
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

  const recentLogs = relevantLogs.slice(0, 3);
  const latestLog = recentLogs[0];
  const adjustments: FeedAdjustment[] = [];
  let intervalFactor = 1;

  if (recentLogs.some((log) => log.food_type === "solids")) {
    intervalFactor *= 1.12;
    adjustments.push({ label: "Recent solids can stretch the next gap a little", direction: "later" });
  }

  if (recentLogs.some((log) => (log.food_type === "formula" || log.food_type === "bottle") && (log.amount_ml ?? 0) >= 150)) {
    intervalFactor *= 1.08;
    adjustments.push({ label: "A fuller bottle can buy a bit more time", direction: "later" });
  }

  if (latestLog?.food_type === "breast_milk" && latestLog.duration_minutes !== null && latestLog.duration_minutes <= 8) {
    intervalFactor *= 0.88;
    adjustments.push({ label: "A shorter breastfeed can bring the next feed forward", direction: "earlier" });
  }

  intervalFactor = Math.max(0.78, Math.min(1.3, intervalFactor));
  const adjustedIntervalMs = medianMs * intervalFactor;
  const averageDeviationMs = hasHistory
    ? sortedIntervals.reduce((sum, value) => sum + Math.abs(value - medianMs), 0) / sortedIntervals.length
    : ((baseline.upperHours - baseline.lowerHours) / 2) * 3600000;
  const bufferMs = Math.max(45 * 60 * 1000, averageDeviationMs);
  const predictedAt = new Date(new Date(lastFeed.logged_at).getTime() + adjustedIntervalMs);
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

export function formatFeedBaselineRange(baseline: FeedBaseline): string {
  return `${formatHoursCompact(baseline.lowerHours)} - ${formatHoursCompact(baseline.upperHours)}`;
}

function getPredictionEstimateParts(prediction: FeedPrediction | null): { value: string; unit: string } {
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

export function getPredictionHeadline(prediction: FeedPrediction | null): string {
  if (!prediction) return "Not enough data";
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRelative(prediction: FeedPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

export function formatPredictionRange(prediction: FeedPrediction): string {
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

export function getPredictionDescription(prediction: FeedPrediction): string {
  if (prediction.state === "overdue") {
    return prediction.source === "history"
      ? "The recent rhythm suggests a feed window may already be running late."
      : "The age-based baseline suggests a feed window may already be running late.";
  }
  if (prediction.state === "due") {
    return prediction.source === "history"
      ? "The recent rhythm suggests the next feed window is open now."
      : "The age-based baseline suggests the next feed window is open now.";
  }
  return prediction.source === "history"
    ? "This is the most likely next feed window from the recent rhythm."
    : "This is the most likely next feed window from the age-based baseline.";
}

export function getBaselineComparison(hoursSinceLastFeed: number | null, baseline: FeedBaseline): FeedComparison {
  if (hoursSinceLastFeed === null) {
    return {
      label: "No comparison yet",
      description: "Add a few feed logs and this page will start comparing the current gap to the usual range for this age.",
      tone: "info",
    };
  }

  if (hoursSinceLastFeed < baseline.lowerHours * 0.85) {
    return {
      label: "Closer together",
      description: "The current gap is still on the shorter side, which often happens in cluster-feeding stretches.",
      tone: "info",
    };
  }

  if (hoursSinceLastFeed <= baseline.upperHours) {
    return {
      label: "Within usual range",
      description: "The current gap still sits inside the usual range for this age and feeding stage.",
      tone: "healthy",
    };
  }

  if (hoursSinceLastFeed <= baseline.upperHours * 1.2) {
    return {
      label: "Upper edge",
      description: "The gap is brushing the upper end of the usual range, so it is worth watching rather than forcing it.",
      tone: "info",
    };
  }

  return {
    label: "Past the usual gap",
    description: "The current gap is now running beyond the usual range for this age, so the next feed is worth planning for.",
    tone: "cta",
  };
}

export function getDueRisk(
  hoursSinceLastFeed: number | null,
  baseline: FeedBaseline,
  prediction: FeedPrediction | null,
  todayFeedCount: number,
): FeedRisk {
  if (hoursSinceLastFeed === null) {
    return {
      label: "Low",
      score: 0,
      description: "No timing risk yet because there is not enough recent feed data.",
      tone: "healthy",
    };
  }

  let score = 8;
  if (hoursSinceLastFeed > baseline.upperHours) {
    score += Math.min(40, ((hoursSinceLastFeed - baseline.upperHours) / baseline.upperHours) * 48);
  }
  if (prediction?.state === "due") score += 12;
  if (prediction?.state === "overdue") score += 24;
  if (todayFeedCount <= 2) score += 12;
  if (todayFeedCount <= 1) score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score >= 60) {
    return {
      label: "High",
      score,
      description: "The gap is stretching enough that the next feed deserves attention now.",
      tone: "cta",
    };
  }

  if (score >= 30) {
    return {
      label: "Medium",
      score,
      description: "The pattern is drifting toward the upper edge, so the next feed is worth keeping close in mind.",
      tone: "info",
    };
  }

  return {
    label: "Low",
    score,
    description: "The current timing still looks comfortably inside a normal feeding window.",
    tone: "healthy",
  };
}

export function buildFeedPatternNarrative({
  baseline,
  baselineComparison,
  dueRisk,
  prediction,
}: {
  baseline: FeedBaseline;
  baselineComparison: FeedComparison;
  dueRisk: FeedRisk;
  prediction: FeedPrediction | null;
}): string {
  if (dueRisk.label === "High") {
    return `The current feeding gap is now past the usual ${formatFeedBaselineRange(baseline)} range, so the next feed is worth prioritising over the prediction window.`;
  }

  if (dueRisk.label === "Medium") {
    return `The rhythm is leaning toward the upper edge of the usual ${formatFeedBaselineRange(baseline)} range. ${prediction ? `The next likely window is ${formatPredictionRange(prediction).toLowerCase()}.` : ""}`;
  }

  return `Right now the rhythm still looks broadly settled for this age, where a gap around ${formatFeedBaselineRange(baseline)} is still commonly seen. ${baselineComparison.description}`;
}

export function getPredictionRingDisplay(prediction: FeedPrediction | null): { value: string; unit: string; gradient: string } {
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

function getTodayFeedRingDisplay(todayFeedCount: number): { value: string; unit: string; gradient: string } {
  return {
    value: `${todayFeedCount}`,
    unit: todayFeedCount === 1 ? "feed today" : "feeds today",
    gradient: todayFeedCount > 0 ? "var(--gradient-status-healthy)" : "var(--gradient-status-unknown)",
  };
}

export function getTodayIntakeRingDisplay(todayTrackedMl: number, todayFeedCount: number, unitSystem: UnitSystem): {
  value: string;
  unit: string;
  label: string;
  gradient: string;
} {
  if (todayTrackedMl > 0) {
    const parts = getVolumeDisplayParts(todayTrackedMl, unitSystem);
    return {
      value: parts.value,
      unit: `${parts.unit} today`,
      label: "Tracked intake",
      gradient: "var(--gradient-status-healthy)",
    };
  }

  return {
    ...getTodayFeedRingDisplay(todayFeedCount),
    label: "Today feeds",
  };
}

export function getTimeSinceStatus(dueRisk: FeedRisk, prediction: FeedPrediction | null): HealthStatus {
  if (dueRisk.label === "High" || prediction?.state === "overdue") return "alert";
  if (dueRisk.label === "Medium" || prediction?.state === "due") return "caution";
  return "healthy";
}

export function getFeedStatusAccentColor(dueRisk: FeedRisk): string {
  if (dueRisk.label === "High") return "var(--color-alert)";
  if (dueRisk.label === "Medium") return "var(--color-caution)";
  return "var(--color-healthy)";
}

export function getWeekTrackedVolumeChip(weekTrackedMl: number, unitSystem: UnitSystem): string | null {
  if (weekTrackedMl <= 0) {
    return null;
  }
  return `${formatVolumeValue(weekTrackedMl, unitSystem)} tracked`;
}
