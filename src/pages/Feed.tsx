import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, formatHoursCompact, formatHoursLong, formatWeekLabel, startOfDay } from "../lib/tracker";
import { getFoodTypeLabel, getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../lib/feeding";
import {
  buildFeedPresetRecordInput,
  describeFeedPresetDraft,
  ensureEssentialFeedPresets,
  getDefaultQuickFeedPresets,
  hydrateFeedPresets,
  type QuickFeedPreset,
} from "../lib/quick-presets";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, isOnLocalDay, timeSince } from "../lib/utils";
import { formatVolumeValue, getVolumeDisplayParts } from "../lib/units";
import { getBreastfeedingSessionSettingKey, parseBreastfeedingSession } from "../lib/breastfeeding";
import * as db from "../lib/db";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
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
import { FeedPresetEditorSheet } from "../components/home/QuickPresetCustomizerSheet";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { DiscoveryLinks } from "../components/discovery/DiscoveryLinks";
import { useToast } from "../components/ui/toast";
import type { FeedingEntry, FeedingLogDraft, FeedingType, HealthStatus, UnitSystem } from "../lib/types";

type PredictionConfidence = "low" | "medium" | "high";

interface FeedBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

interface FeedComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface FeedRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface FeedAdjustment {
  label: string;
  direction: "earlier" | "later";
}

interface FeedPrediction {
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

interface FeedMixSnapshot {
  dominantLabel: string;
  dominantCount: number;
  description: string;
  tone: "healthy" | "info" | "cta";
  chips: string[];
}

function getAgeDays(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birth = new Date(year, (month || 1) - 1, day || 1);
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / 86400000));
}

function getFeedBaseline(dateOfBirth: string, feedingType: FeedingType): FeedBaseline {
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

function getPredictableFeedLogs(logs: FeedingEntry[]): FeedingEntry[] {
  return logs.filter((log) => log.food_type !== "pumping");
}

function getCurrentFeedingTimestamp(): string {
  return combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime());
}

function getTrackedMl(logs: FeedingEntry[]): number {
  return logs.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0);
}

function getFeedTypeCounts(logs: FeedingEntry[]): Map<FeedingEntry["food_type"], number> {
  return logs.reduce((map, log) => {
    map.set(log.food_type, (map.get(log.food_type) ?? 0) + 1);
    return map;
  }, new Map<FeedingEntry["food_type"], number>());
}

function getFeedMixSnapshot(logs: FeedingEntry[]): FeedMixSnapshot {
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

function lowerConfidence(confidence: PredictionConfidence): PredictionConfidence {
  if (confidence === "high") return "medium";
  if (confidence === "medium") return "low";
  return "low";
}

function getFeedPrediction(logs: FeedingEntry[], baseline: FeedBaseline): FeedPrediction | null {
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

function formatBaselineRange(baseline: FeedBaseline): string {
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

function getPredictionHeadline(prediction: FeedPrediction | null): string {
  if (!prediction) return "Not enough data";
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRelative(prediction: FeedPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  return prediction.state === "overdue"
    ? `About ${estimate.value} ${estimate.unit}`
    : `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRange(prediction: FeedPrediction): string {
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

function getPredictionDescription(prediction: FeedPrediction): string {
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

function getBaselineComparison(hoursSinceLastFeed: number | null, baseline: FeedBaseline): FeedComparison {
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

function getDueRisk(
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

function buildPatternNarrative({
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
    return `The current feeding gap is now past the usual ${formatBaselineRange(baseline)} range, so the next feed is worth prioritising over the prediction window.`;
  }

  if (dueRisk.label === "Medium") {
    return `The rhythm is leaning toward the upper edge of the usual ${formatBaselineRange(baseline)} range. ${prediction ? `The next likely window is ${formatPredictionRange(prediction).toLowerCase()}.` : ""}`;
  }

  return `Right now the rhythm still looks broadly settled for this age, where a gap around ${formatBaselineRange(baseline)} is still commonly seen. ${baselineComparison.description}`;
}

function getPredictionRingDisplay(prediction: FeedPrediction | null): { value: string; unit: string; gradient: string } {
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

function getTodayIntakeRingDisplay(todayTrackedMl: number, todayFeedCount: number, unitSystem: UnitSystem): {
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

function getTimeSinceStatus(dueRisk: FeedRisk, prediction: FeedPrediction | null): HealthStatus {
  if (dueRisk.label === "High" || prediction?.state === "overdue") return "alert";
  if (dueRisk.label === "Medium" || prediction?.state === "due") return "caution";
  return "healthy";
}

function getFeedStatusAccentColor(dueRisk: FeedRisk): string {
  if (dueRisk.label === "High") return "var(--color-alert)";
  if (dueRisk.label === "Medium") return "var(--color-caution)";
  return "var(--color-healthy)";
}

function FeedLogList({
  logs,
  onEdit,
  unitSystem,
}: {
  logs: FeedingEntry[];
  onEdit: (entry: FeedingEntry) => void;
  unitSystem: UnitSystem;
}) {
  if (logs.length === 0) {
    return (
      <InsetPanel>
        <p className="text-sm text-[var(--color-text-secondary)]">No feed entries in this week.</p>
      </InsetPanel>
    );
  }

  return (
    <TrackerEntryTable mainHeader="Feed">
      {logs.map((log) => {
        const dateLabel = new Date(log.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const timeLabel = new Date(log.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const detailLabel = getFeedingEntryDetailParts(log, unitSystem).join(" · ");
        const secondary = getFeedingEntrySecondaryText(log);

        return (
          <TrackerEntryRow key={log.id} onClick={() => onEdit(log)}>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">{dateLabel}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">{timeLabel}</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.logged_at)}</p>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {getFeedingEntryPrimaryLabel(log)}
              </p>
              {detailLabel && (
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">{detailLabel}</p>
              )}
              {secondary && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{secondary}</p>
              )}
            </div>
          </TrackerEntryRow>
        );
      })}
    </TrackerEntryTable>
  );
}

export function Feed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeChild } = useChildContext();
  const { unitSystem } = useUnits();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  const { logs, refresh } = useFeedingLogs(activeChild?.id ?? null, 500);
  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [feedDraft, setFeedDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [feedPresetSheetOpen, setFeedPresetSheetOpen] = useState(false);
  const [quickFeedPresets, setQuickFeedPresets] = useState<QuickFeedPreset[]>([]);
  const [activeBreastfeedingSide, setActiveBreastfeedingSide] = useState<"left" | "right" | null>(null);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const navigateWithOrigin = (path: string) => navigate(path, { state: { origin: location.pathname } });

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setFormOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeChild) {
      setQuickFeedPresets([]);
      return;
    }

    let cancelled = false;

    setQuickFeedPresets(ensureEssentialFeedPresets(
      getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
      activeChild.feeding_type,
      unitSystem,
    ));

    db.getQuickPresets(activeChild.id, "feed").then((feedRows) => {
      if (cancelled) return;
      const hydratedFeed = hydrateFeedPresets(feedRows, unitSystem);
      setQuickFeedPresets(
        ensureEssentialFeedPresets(
          hydratedFeed.length > 0 ? hydratedFeed : getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
          activeChild.feeding_type,
          unitSystem,
        ),
      );
    }).catch(() => {
      if (!cancelled) {
        setQuickFeedPresets(ensureEssentialFeedPresets(
          getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
          activeChild.feeding_type,
          unitSystem,
        ));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild, unitSystem]);

  useEffect(() => {
    if (!activeChild) {
      setActiveBreastfeedingSide(null);
      return;
    }

    let cancelled = false;

    const refreshSession = () => {
      db.getSetting(getBreastfeedingSessionSettingKey(activeChild.id))
        .then((raw) => {
          if (cancelled) return;
          const session = parseBreastfeedingSession(raw);
          setActiveBreastfeedingSide(session?.activeSide ?? null);
        })
        .catch(() => {
          if (!cancelled) {
            setActiveBreastfeedingSide(null);
          }
        });
    };

    refreshSession();

    const handleVisibility = () => refreshSession();
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeChild]);

  const predictableLogs = useMemo(() => getPredictableFeedLogs(logs), [logs]);
  const lastFeed = predictableLogs[0] ?? null;
  const todayKey = formatLocalDateKey(new Date());
  const todayFeedCount = useMemo(
    () => predictableLogs.filter((log) => isOnLocalDay(log.logged_at, todayKey)).length,
    [predictableLogs, todayKey],
  );
  const todayTrackedMl = useMemo(
    () => getTrackedMl(logs.filter((log) => isOnLocalDay(log.logged_at, todayKey))),
    [logs, todayKey],
  );

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

  const weekLogs = useMemo(
    () => logs.filter((log) => log.logged_at >= `${weekStartKey}T00:00:00` && log.logged_at <= `${weekEndKey}T23:59:59`),
    [logs, weekEndKey, weekStartKey],
  );
  const weeklyPredictableLogs = useMemo(
    () => getPredictableFeedLogs(weekLogs),
    [weekLogs],
  );

  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weeklyPredictableLogs) {
      const key = log.logged_at.split("T")[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [weeklyPredictableLogs]);
  const filledWeek = useMemo(() => fillDailyFrequencyDays(frequencyData, DAYS_IN_WEEK, endDate), [endDate, frequencyData]);

  const baseline = useMemo(
    () => getFeedBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(() => getFeedPrediction(logs, baseline), [baseline, logs]);
  const hoursSinceLastFeed = lastFeed ? (Date.now() - new Date(lastFeed.logged_at).getTime()) / 3600000 : null;
  const baselineComparison = useMemo(() => getBaselineComparison(hoursSinceLastFeed, baseline), [baseline, hoursSinceLastFeed]);
  const dueRisk = useMemo(
    () => getDueRisk(hoursSinceLastFeed, baseline, prediction, todayFeedCount),
    [baseline, hoursSinceLastFeed, prediction, todayFeedCount],
  );
  const narrative = useMemo(
    () => buildPatternNarrative({ baseline, baselineComparison, dueRisk, prediction }),
    [baseline, baselineComparison, dueRisk, prediction],
  );
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const todayIntakeRing = useMemo(
    () => getTodayIntakeRingDisplay(todayTrackedMl, todayFeedCount, unitSystem),
    [todayFeedCount, todayTrackedMl, unitSystem],
  );
  const statusTone = useMemo(() => getTimeSinceStatus(dueRisk, prediction), [dueRisk, prediction]);

  if (!activeChild) return null;

  const feedMix = useMemo(() => getFeedMixSnapshot(weekLogs), [weekLogs]);
  const weekTrackedMl = useMemo(() => getTrackedMl(weekLogs), [weekLogs]);
  const dominantType = [...getFeedTypeCounts(weeklyPredictableLogs).entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  const showBreastfeedAction = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";

  const weekSummaryBits = [
    weeklyPredictableLogs.length === 0 ? "No feeds logged in this week" : `${weeklyPredictableLogs.length} feed${weeklyPredictableLogs.length === 1 ? "" : "s"} in this week`,
    dominantType ? `Mostly ${getFoodTypeLabel(dominantType).toLowerCase()}` : null,
    weekTrackedMl > 0 ? `${formatVolumeValue(weekTrackedMl, unitSystem)} tracked` : null,
  ].filter(Boolean);

  const handleRefresh = async () => {
    await refresh();
  };

  const handleRepeatLastFeed = async () => {
    if (!lastFeed) return;

    try {
      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: getCurrentFeedingTimestamp(),
        food_type: lastFeed.food_type,
        food_name: lastFeed.food_name,
        amount_ml: lastFeed.amount_ml,
        duration_minutes: lastFeed.duration_minutes,
        breast_side: lastFeed.breast_side,
        bottle_content: lastFeed.bottle_content,
        reaction_notes: null,
        is_constipation_support: lastFeed.is_constipation_support,
        notes: null,
      });
      await handleRefresh();
      showSuccess("Repeated the last feed.");
    } catch {
      showError("Could not repeat the last feed. Please try again.");
    }
  };

  const handleQuickFeedPreset = async (preset: QuickFeedPreset) => {
    if (!preset.draft.food_type) {
      showError("This feed tile is missing a feed type.");
      return;
    }

    try {
      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: getCurrentFeedingTimestamp(),
        food_type: preset.draft.food_type,
        food_name: preset.draft.food_name?.trim() ? preset.draft.food_name.trim() : null,
        amount_ml: preset.draft.amount_ml?.trim() ? Number(preset.draft.amount_ml.trim()) : null,
        duration_minutes: preset.draft.duration_minutes?.trim() ? Number(preset.draft.duration_minutes.trim()) : null,
        breast_side: preset.draft.breast_side ?? null,
        bottle_content: preset.draft.bottle_content ?? null,
        reaction_notes: null,
        is_constipation_support: preset.draft.is_constipation_support ? 1 : 0,
        notes: null,
      });
      await handleRefresh();
      showSuccess(`${preset.label} logged.`);
    } catch {
      showError("Could not log that feed. Please try again.");
    }
  };

  const saveFeedPresets = async (drafts: Array<Partial<FeedingLogDraft>>) => {
    const nextPresets = drafts.map((draft, index) => {
      const preview = describeFeedPresetDraft(draft, unitSystem);
      return {
        id: `feed-preset-${index}`,
        label: preview.label,
        description: preview.description,
        draft,
      };
    });

    try {
      await db.replaceQuickPresets(activeChild.id, "feed", buildFeedPresetRecordInput(drafts, unitSystem));
      setQuickFeedPresets(ensureEssentialFeedPresets(nextPresets, activeChild.feeding_type, unitSystem));
      setFeedPresetSheetOpen(false);
      showSuccess("Quick feed tiles updated.");
    } catch {
      showError("Could not save the quick feed tiles. Please try again.");
    }
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Feed"
        description="Feeds, meals, and the next likely window in one place."
        action={<Button variant="cta" size="sm" onClick={() => setFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="feed"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator timestamp={lastFeed?.logged_at ?? null} status={statusTone} />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last feed</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label="Next predicted"
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={todayIntakeRing.value}
                unit={todayIntakeRing.unit}
                label={todayIntakeRing.label}
                gradient={todayIntakeRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick feed start</p>
                <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                  Start with the type already chosen, then add details only if needed.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {lastFeed && (
                  <button
                    type="button"
                    onClick={() => { void handleRepeatLastFeed(); }}
                    className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
                  >
                    Repeat last feed
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFeedPresetSheetOpen(true)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                >
                  Edit tiles
                </button>
                {showBreastfeedAction && (
                  <button
                    type="button"
                    onClick={() => navigateWithOrigin("/breastfeed")}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70 flex items-center gap-2"
                  >
                    <span>Breastfeed timer</span>
                    {activeBreastfeedingSide && (
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-primary)] text-[10px] font-semibold text-[var(--color-primary)]"
                        aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
                      >
                        {activeBreastfeedingSide === "left" ? "L" : "R"}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {lastFeed && (
              <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
                Last feed: {getFeedingEntryPrimaryLabel(lastFeed)}{getFeedingEntryDetailParts(lastFeed, unitSystem).length > 0 ? ` · ${getFeedingEntryDetailParts(lastFeed, unitSystem).join(" · ")}` : ""}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickFeedPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { void handleQuickFeedPreset(preset); }}
                  className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
                >
                  <p className="text-[14px] font-medium text-[var(--color-text)]">{preset.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-soft)]">{preset.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 left-0 top-1.5 w-1.5 rounded-r-full"
            style={{ backgroundColor: getFeedStatusAccentColor(dueRisk) }}
          />
          <CardContent className="overflow-hidden py-3.5 pl-7 pr-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current feed status</p>
                <p
                  className="mt-1 text-[0.95rem] font-semibold"
                  style={{ color: getFeedStatusAccentColor(dueRisk) }}
                >
                  {dueRisk.label === "High" ? "Feed window needs attention" : dueRisk.label === "Medium" ? "Next feed is approaching" : "Rhythm looks settled"}
                </p>
                <p className="mt-1 max-w-[34ch] text-[0.92rem] leading-snug text-[var(--color-text-secondary)]">{baseline.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${dueRisk.label === "High"
                ? "bg-[var(--color-alert-bg)] text-[var(--color-alert)]"
                : dueRisk.label === "Medium"
                  ? "bg-[var(--color-caution-bg)] text-[var(--color-caution)]"
                  : "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]"
                }`}>
                {dueRisk.label === "High" ? "Watch" : dueRisk.label === "Medium" ? "Soon" : "Normal"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusExpanded((current) => !current)}
              className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--color-text-secondary)] transition-opacity hover:opacity-75"
              aria-expanded={statusExpanded}
            >
              {statusExpanded ? "See less" : "See more"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform ${statusExpanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.137l3.71-3.907a.75.75 0 1 1 1.08 1.04l-4.25 4.474a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {statusExpanded && (
                <motion.div
                  key="status-details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ y: -6 }}
                    animate={{ y: 0 }}
                    exit={{ y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="pt-2 pr-0.5"
                  >
                    <div className="grid grid-cols-2 gap-2.5">
                      <TrackerMetricPanel
                        eyebrow="Age baseline"
                        value={formatBaselineRange(baseline)}
                        description={baselineComparison.label}
                        tone={baselineComparison.tone}
                      />
                      <TrackerMetricPanel
                        eyebrow="Due risk"
                        value={dueRisk.label}
                        description={dueRisk.description}
                        tone={dueRisk.tone}
                      />
                      <InsetPanel className={`col-span-2 p-3 ${feedMix.tone === "info"
                        ? "border-[var(--color-info)]/18 bg-[var(--color-info-bg)]"
                        : feedMix.tone === "cta"
                          ? "border-[var(--color-cta)]/16 bg-[var(--color-surface-tint)]"
                          : "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)]"
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">This week mix</p>
                            <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                              {feedMix.dominantLabel}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                              {feedMix.description}
                            </p>
                          </div>
                          {feedMix.dominantCount > 0 && (
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-chip-text-on-light)]">
                              {feedMix.dominantCount} logs
                            </span>
                          )}
                        </div>
                        {feedMix.chips.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {feedMix.chips.map((chip) => (
                              <span
                                key={chip}
                                className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]"
                              >
                                {chip}
                              </span>
                            ))}
                            {weekTrackedMl > 0 && (
                              <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                                {formatVolumeValue(weekTrackedMl, unitSystem)} tracked
                              </span>
                            )}
                          </div>
                        )}
                      </InsetPanel>
                      <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely feed</p>
                            <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                              {getPredictionHeadline(prediction)}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                              {prediction ? getPredictionDescription(prediction) : "Needs at least two logged feeds to estimate a rhythm."}
                            </p>
                          </div>
                          {prediction && (
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-chip-text-on-light)]">
                              {prediction.confidence}
                            </span>
                          )}
                        </div>
                        {prediction && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                              Typical gap: {prediction.intervalLabel}
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                              {formatPredictionRelative(prediction)}
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                              Source: {prediction.source === "history" ? "recent rhythm" : "age baseline"}
                            </span>
                            <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                              Window: {formatPredictionRange(prediction)}
                            </span>
                            {prediction.adjustments.slice(0, 2).map((adjustment) => (
                              <span
                                key={adjustment.label}
                                className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]"
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
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeading
              title="Weekly pattern"
              description="Breastfeeds, bottles, meals, and drinks logged across each seven-day window."
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
              valueLabel={(value) => `${value} feed${value === 1 ? "" : "s"}`}
            />
          </CardContent>
        </Card>

        <DiscoveryLinks
          eyebrow="Related"
          title="Keep feeding in context"
          description="Feed rhythm makes more sense when it stays connected to the wider care picture."
          compact
          items={[
            {
              to: "/history",
              title: "History",
              description: "Review the full feed and poop timeline.",
            },
            {
              to: "/milestones",
              title: "Milestones",
              description: "See solids, illness, or medication changes.",
              tone: "info",
            },
            {
              to: "/guidance",
              title: "Guidance",
              description: "Open practical feeding and stool guidance.",
              tone: "healthy",
            },
          ]}
        />

        {logs.length === 0 ? (
          <EmptyState
            icon={(
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5v7.125a2.625 2.625 0 0 0 5.25 0V4.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 4.5V21" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75v17.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5h2.25a1.5 1.5 0 0 0 1.5-1.5V3.75" />
              </svg>
            )}
            title="Start the feed page with the first log"
            description="Once a few feeds are in, this page starts surfacing rhythm, next likely window, and the week pattern."
            action={<Button variant="primary" onClick={() => setFormOpen(true)}>Add first feed</Button>}
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
                  Every feed or meal for the selected week, with quick editing when details need correcting.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <FeedLogList logs={weekLogs} onEdit={setEditingMeal} unitSystem={unitSystem} />
            </CardContent>
          </Card>
        )}

        <DietLogForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setFeedDraft(null);
            if (searchParams.get("add") === "1") {
              navigate("/feed", { replace: true });
            }
          }}
          childId={activeChild.id}
          onLogged={handleRefresh}
          initialDraft={feedDraft}
        />

        {editingMeal && (
          <EditMealSheet
            key={editingMeal.id}
            entry={editingMeal}
            open={!!editingMeal}
            onClose={() => setEditingMeal(null)}
            onSaved={() => { void handleRefresh(); }}
            onDeleted={() => { void handleRefresh(); }}
          />
        )}

        <FeedPresetEditorSheet
          open={feedPresetSheetOpen}
          onClose={() => setFeedPresetSheetOpen(false)}
          feedingType={activeChild.feeding_type}
          presets={quickFeedPresets}
          onSave={(drafts) => { void saveFeedPresets(drafts); }}
        />
      </div>
    </PageBody>
  );
}
