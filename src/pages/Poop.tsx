import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { fillDailyFrequencyDays, formatLocalDateKey } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, formatHoursCompact, formatHoursLong, startOfDay } from "../lib/tracker";
import { getChildStatus } from "../lib/tauri";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import {
  buildPoopPresetRecordInput,
  describePoopPresetDraft,
  getDefaultQuickPoopPresets,
  hydratePoopPresets,
  type QuickPoopPreset,
} from "../lib/quick-presets";
import * as db from "../lib/db";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
import { ScenicHero } from "../components/layout/ScenicHero";
import {
  TrackerMetricPanel,
  TrackerMetricRing,
} from "../components/tracking/TrackerPrimitives";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { PoopPresetEditorSheet } from "../components/home/QuickPresetCustomizerSheet";
import { LogForm } from "../components/logging/LogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import { useToast } from "../components/ui/toast";
import {
  HomeToolGrowthIcon,
  HomeToolHistoryIcon,
  HomeToolMilestonesIcon,
} from "../components/ui/icons";
import poop1Icon from "../assets/svg-assets/icons/poop-1.svg";
import poop2Icon from "../assets/svg-assets/icons/poop-2.svg";
import poop3Icon from "../assets/svg-assets/icons/poop-3.svg";
import poop4Icon from "../assets/svg-assets/icons/poop-4.svg";
import poop5Icon from "../assets/svg-assets/icons/poop-5.svg";
import poop6Icon from "../assets/svg-assets/icons/poop-6.svg";
import poop7Icon from "../assets/svg-assets/icons/poop-7.svg";
import type { Alert, FeedingEntry, HealthStatus, PoopEntry, PoopLogDraft, SymptomEntry } from "../lib/types";

type PredictionConfidence = "low" | "medium" | "high";

interface AgeBaseline {
  label: string;
  lowerHours: number;
  upperHours: number;
  description: string;
}

interface BaselineComparison {
  label: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface DueRisk {
  label: "Low" | "Medium" | "High";
  score: number;
  description: string;
  tone: "healthy" | "info" | "cta";
}

interface PredictionAdjustment {
  label: string;
  direction: "earlier" | "later";
}

interface PoopPrediction {
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

function getCurrentPoopTimestamp(): string {
  return combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime());
}

function getRepeatablePoopEntry(lastPoop: PoopEntry | null): PoopEntry | null {
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

function getPoopColorHex(color: PoopEntry["color"] | Partial<PoopLogDraft>["color"]): string {
  return STOOL_COLORS.find((item) => item.value === color)?.hex ?? "#b58754";
}

const POOP_PRESET_ICONS: Record<number, string> = {
  1: poop1Icon,
  2: poop2Icon,
  3: poop3Icon,
  4: poop4Icon,
  5: poop5Icon,
  6: poop6Icon,
  7: poop7Icon,
};

function PoopPresetIcon({
  draft,
  className = "h-10 w-10",
}: {
  draft: Partial<PoopLogDraft>;
  className?: string;
}) {
  const fill = getPoopColorHex(draft.color ?? null);
  const shadow = draft.color === "green" ? "rgba(113, 144, 69, 0.35)" : "rgba(181, 135, 84, 0.28)";
  const iconSrc = POOP_PRESET_ICONS[draft.stool_type ?? 4] ?? poop4Icon;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: fill,
        filter: `drop-shadow(0 2px 4px ${shadow})`,
        WebkitMaskImage: `url(${iconSrc})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${iconSrc})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
}

function getRecentHistoryDayLabel(dateStr: string): string {
  const entryDate = new Date(dateStr);
  const day = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function WeeklyPatternDots({
  filledWeek,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {filledWeek.map((day) => {
        const slots = [2, 1, 0];
        return (
          <div key={day.date} className="flex min-w-[22px] flex-col items-center gap-0.5">
            <div className="flex h-[46px] flex-col justify-end gap-1">
              {slots.map((slot) => {
                const active = day.count > slot;
                const isBar = day.count >= 3 && slot === 0;
                return (
                  <span
                    key={`${day.date}-${slot}`}
                    className={isBar ? "h-8 w-2.5 rounded-full" : "h-2.5 w-2.5 rounded-full"}
                    style={{
                      background: !active
                        ? "rgba(148, 158, 176, 0.22)"
                        : slot === 2
                          ? "rgba(236, 112, 89, 0.92)"
                          : slot === 1
                            ? "rgba(104, 205, 110, 0.9)"
                            : "rgba(245, 171, 82, 0.95)",
                    }}
                  />
                );
              })}
            </div>
            <span className="mt-1 text-[0.66rem] leading-none text-[var(--color-text-secondary)]">{day.weekdayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function getAgeBaseline(dateOfBirth: string, feedingType: string): AgeBaseline {
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

function formatBaselineRange(baseline: AgeBaseline): string {
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

function getPrediction(
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

function formatPredictionWindow(prediction: PoopPrediction): string {
  const timeLabel = prediction.predictedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayLabel = prediction.predictedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${dayLabel} around ${timeLabel}`;
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
      return {
        value: `${Math.max(1, Math.round(remainingHours * 60))}`,
        unit: "min left",
      };
    }
    if (remainingHours < 36) {
      return {
        value: `${Math.round(remainingHours)}`,
        unit: "hr left",
      };
    }
    return {
      value: `${Math.round((remainingHours / 24) * 10) / 10}`,
      unit: "days left",
    };
  }

  if (prediction.state === "overdue") {
    const overdueHours = (now - prediction.latestAt.getTime()) / 3600000;
    if (overdueHours < 1) {
      return {
        value: `${Math.max(1, Math.round(overdueHours * 60))}`,
        unit: "min late",
      };
    }
    if (overdueHours < 36) {
      return {
        value: `${Math.round(overdueHours)}`,
        unit: "hr late",
      };
    }
    return {
      value: `${Math.round((overdueHours / 24) * 10) / 10}`,
      unit: "days late",
    };
  }

  const untilHours = (prediction.predictedAt.getTime() - now) / 3600000;
  if (untilHours < 1) {
    return {
      value: `${Math.max(1, Math.round(untilHours * 60))}`,
      unit: "min left",
    };
  }
  if (untilHours < 36) {
    return {
      value: `${Math.round(untilHours)}`,
      unit: "hr left",
    };
  }
  return {
    value: `${Math.round((untilHours / 24) * 10) / 10}`,
    unit: "days left",
  };
}

function getPredictionHeadline(prediction: PoopPrediction | null): string {
  if (!prediction) return "Not enough data";

  const estimate = getPredictionEstimateParts(prediction);
  if (prediction.state === "overdue") {
    return `About ${estimate.value} ${estimate.unit}`;
  }

  return `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRelative(prediction: PoopPrediction): string {
  const estimate = getPredictionEstimateParts(prediction);
  if (prediction.state === "overdue") {
    return `About ${estimate.value} ${estimate.unit}`;
  }
  return `In about ${estimate.value} ${estimate.unit}`;
}

function formatPredictionRange(prediction: PoopPrediction): string {
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

function getPredictionDescription(prediction: PoopPrediction): string {
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

function getStatusBadge(status: HealthStatus): { label: string; className: string } {
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

function getHealthInsightContent(status: HealthStatus, normalDescription: string): {
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

function getPredictionRingDisplay(prediction: PoopPrediction | null): {
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

function getAlertRingDisplay(alerts: Alert[]): {
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

function getBaselineComparison(hoursSinceLastPoop: number | null, baseline: AgeBaseline): BaselineComparison {
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

function getDueRisk(
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

function buildPatternNarrative({
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

export function Poop() {
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
  const { showError, showSuccess } = useToast();
  const { logs, lastRealPoop, refresh } = usePoopLogs(activeChild?.id ?? null, 500);
  const { logs: feedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { logs: symptomLogs } = useSymptoms(activeChild?.id ?? null);
  const { activeEpisode } = useEpisodes(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { runChecks } = useAlertEngine();
  const [weekOffset, setWeekOffset] = useState(0);
  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDescription, setNormalDescription] = useState("");
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [poopDraft, setPoopDraft] = useState<Partial<PoopLogDraft> | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [poopPresetSheetOpen, setPoopPresetSheetOpen] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [quickPoopPresets, setQuickPoopPresets] = useState<QuickPoopPreset[]>([]);

  useEffect(() => {
    if (experience.mode === "diaper") {
      navigate("/diaper", { replace: true });
    }
  }, [experience.mode, navigate]);

  useEffect(() => {
    if (!activeChild) {
      setStatus("healthy");
      setNormalDescription("");
      return;
    }

    let cancelled = false;
    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([nextStatus, nextDescription]) => {
      if (!cancelled) {
        setStatus(nextStatus);
        setNormalDescription(nextDescription);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild, lastRealPoop]);

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    db.getQuickPresets(activeChild.id, "poop")
      .then((rows) => {
        if (cancelled) return;
        const hydrated = hydratePoopPresets(rows);
        setQuickPoopPresets(
          hydrated.length > 0 ? hydrated : getDefaultQuickPoopPresets(activeChild.feeding_type),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setQuickPoopPresets(getDefaultQuickPoopPresets(activeChild.feeding_type));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

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

  const weeklyRealLogs = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0 && log.logged_at >= `${weekStartKey}T00:00:00` && log.logged_at <= `${weekEndKey}T23:59:59`),
    [logs, weekEndKey, weekStartKey],
  );
  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of weeklyRealLogs) {
      const key = log.logged_at.split("T")[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([date, count]) => ({ date, count }));
  }, [weeklyRealLogs]);

  const filledWeek = useMemo(() => fillDailyFrequencyDays(frequencyData, DAYS_IN_WEEK, endDate), [endDate, frequencyData]);
  const baseline = useMemo(
    () => getAgeBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(
    () => getPrediction(logs, baseline, feedingLogs, symptomLogs, activeEpisode?.episode_type ?? null),
    [activeEpisode, baseline, feedingLogs, logs, symptomLogs],
  );
  const hoursSinceLastPoop = lastRealPoop
    ? (Date.now() - new Date(lastRealPoop.logged_at).getTime()) / 3600000
    : null;
  const baselineComparison = useMemo(
    () => getBaselineComparison(hoursSinceLastPoop, baseline),
    [baseline, hoursSinceLastPoop],
  );
  const dueRisk = useMemo(
    () => getDueRisk(
      hoursSinceLastPoop,
      baseline,
      prediction,
      alerts,
      symptomLogs,
      activeEpisode?.episode_type ?? null,
      feedingLogs,
      lastRealPoop?.logged_at ?? null,
    ),
    [activeEpisode, alerts, baseline, feedingLogs, hoursSinceLastPoop, lastRealPoop, prediction, symptomLogs],
  );
  const effectiveStatus = useMemo<HealthStatus>(() => {
    if (alerts.some((alert) => alert.severity === "urgent") || dueRisk.label === "High" || status === "alert") {
      return "alert";
    }
    if (alerts.some((alert) => alert.severity === "warning") || dueRisk.label === "Medium" || status === "caution") {
      return "caution";
    }
    return status;
  }, [alerts, dueRisk.label, status]);
  const statusBadge = getStatusBadge(effectiveStatus);
  const patternNarrative = useMemo(
    () => buildPatternNarrative({
      status: effectiveStatus,
      baseline,
      baselineComparison,
      dueRisk,
      prediction,
      alerts,
      symptomLogs,
      activeEpisodeType: activeEpisode?.episode_type ?? null,
    }),
    [activeEpisode, alerts, baseline, baselineComparison, dueRisk, effectiveStatus, prediction, symptomLogs],
  );
  const healthInsight = useMemo(
    () => getHealthInsightContent(effectiveStatus, normalDescription),
    [effectiveStatus, normalDescription],
  );
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const alertRing = useMemo(() => getAlertRingDisplay(alerts), [alerts]);
  const repeatablePoop = useMemo(() => getRepeatablePoopEntry(lastRealPoop), [lastRealPoop]);
  const recentHistory = useMemo(
    () => logs.filter((log) => log.is_no_poop === 0).slice(0, 3),
    [logs],
  );

  if (!activeChild) return null;
  if (experience.mode === "diaper") return null;

  const handleRefresh = async () => {
    await refresh();
    await runChecks(activeChild);
    await refreshAlerts();
  };

  const handleRepeatLastPoop = async () => {
    if (!repeatablePoop) return;

    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: repeatablePoop.stool_type,
        color: repeatablePoop.color,
        size: repeatablePoop.size,
        notes: null,
        photo_path: null,
      });
      await handleRefresh();
      showSuccess("Repeated the last normal poop pattern.");
    } catch {
      showError("Could not repeat the last poop pattern. Please try again.");
    }
  };

  const handleQuickPoopPreset = async (preset: QuickPoopPreset) => {
    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: preset.draft.stool_type ?? null,
        color: preset.draft.color ?? null,
        size: preset.draft.size ?? null,
        notes: null,
        photo_path: null,
      });
      await handleRefresh();
      showSuccess(`${preset.label} logged.`);
    } catch {
      showError("Could not log that poop. Please try again.");
    }
  };

  const savePoopPresets = async (drafts: Array<Partial<PoopLogDraft>>) => {
    const nextPresets = drafts.map((draft, index) => {
      const preview = describePoopPresetDraft(draft);
      return {
        id: `poop-preset-${index}`,
        label: preview.label,
        description: preview.description,
        draft,
      };
    });

    try {
      await db.replaceQuickPresets(activeChild.id, "poop", buildPoopPresetRecordInput(drafts));
      setQuickPoopPresets(nextPresets);
      setPoopPresetSheetOpen(false);
      showSuccess("Quick poop tiles updated.");
    } catch {
      showError("Could not save the quick poop tiles. Please try again.");
    }
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Poop"
        description="Pattern, timing, and alerts in one place."
        action={<Button variant="cta" size="sm" onClick={() => setLogFormOpen(true)}>Add</Button>}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="poop"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator
                  timestamp={lastRealPoop?.logged_at ?? null}
                  status={effectiveStatus === "alert" ? "alert" : effectiveStatus === "caution" ? "caution" : "healthy"}
                />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last poop</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label="Next predicted"
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={alertRing.value}
                unit={alertRing.unit}
                label="Alerts"
                gradient={alertRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick log</p>
                {repeatablePoop && (
                  <p className="mt-1 text-[12px] text-[var(--color-text-soft)]">Last safe pattern ready to repeat.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {repeatablePoop && (
                  <button
                    type="button"
                    onClick={() => { void handleRepeatLastPoop(); }}
                    className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
                  >
                    Repeat
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPoopPresetSheetOpen(true)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="mt-2 overflow-x-auto pb-1">
              <div className="flex w-max gap-3 pr-2">
                {quickPoopPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => { void handleQuickPoopPreset(preset); }}
                    className="flex min-h-[50px] min-w-[50px] flex-col items-center justify-center gap-0.25 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-0.5 text-center transition-colors hover:bg-white/70"
                  >
                    <PoopPresetIcon draft={preset.draft} className="h-10 w-10" />
                    <p className="pb-2 text-[0.72rem] font-medium leading-none text-[var(--color-text)]">{preset.label}</p>
                  </button>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="px-1">
          <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <div className="flex min-h-[74px] items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[0.8rem] font-medium uppercase leading-[1.15] tracking-[0.1em] text-[var(--color-text-soft)]">
                  Weekly
                  <br />
                  Pattern
                </p>
                <p className="mt-1 text-[0.72rem] leading-none text-[var(--color-text-secondary)]">Last 7 days</p>
              </div>
              <div className="flex-shrink-0">
                <WeeklyPatternDots filledWeek={filledWeek} />
              </div>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 left-0 top-1.5 w-1.5 rounded-r-full"
            style={{ backgroundColor: healthInsight.accentColor }}
          />
          <CardContent
            className="overflow-hidden py-3.5 pl-7 pr-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-[0.95rem] font-semibold"
                  style={{ color: healthInsight.accentColor }}
                >
                  {healthInsight.title}
                </p>
                <p className="mt-1 max-w-[34ch] text-[0.92rem] leading-snug text-[var(--color-text-secondary)]">
                  {healthInsight.detail}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${statusBadge.className}`}>
                {statusBadge.label}
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
                        description={baseline.label}
                        tone={baselineComparison.tone}
                      />
                      <TrackerMetricPanel
                        eyebrow="Due risk"
                        value={dueRisk.label}
                        description={dueRisk.description}
                        tone={dueRisk.tone}
                      />
                      <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely poop</p>
                            <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                              {getPredictionHeadline(prediction)}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                              {prediction ? getPredictionDescription(prediction) : "Needs at least two real poop logs to estimate a rhythm."}
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
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{patternNarrative}</p>
                      </InsetPanel>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {recentHistory.length > 0 && (
          <section className="px-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[1rem] font-semibold text-[var(--color-text)]">Recent history</p>
              <Link
                to="/history"
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-strong)]"
              >
                See all
              </Link>
            </div>
            <div className="mt-2.5 space-y-2">
              {recentHistory.map((log, index) => {
                const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
                const title = typeInfo?.label ?? "Logged";
                const tint = log.color ? `${getPoopColorHex(log.color)}20` : "var(--color-bg-elevated)";

                return (
                  <div key={log.id} className="flex items-center gap-2.5">
                    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                      {index < recentHistory.length - 1 && (
                        <span
                          className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                          style={{ backgroundColor: "var(--color-border)" }}
                        />
                      )}
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ backgroundColor: tint }}
                      >
                        <PoopPresetIcon
                          draft={{ stool_type: log.stool_type, color: log.color, size: log.size }}
                          className="h-5 w-5"
                        />
                      </span>
                    </div>
                    <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                      <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                      Type {log.stool_type ?? "?"}, {title}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="px-1">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Related</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <Link
                to="/dashboard"
                className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--color-home-tool-growth)" }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                  <HomeToolGrowthIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.72rem] font-semibold leading-tight">Trend</span>
              </Link>
              <Link
                to="/history"
                className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--color-home-tool-history)" }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                  <HomeToolHistoryIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.72rem] font-semibold leading-tight">History</span>
              </Link>
              <Link
                to="/guidance"
                className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--color-home-tool-milestone)" }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                  <HomeToolMilestonesIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.72rem] font-semibold leading-tight">Guidance</span>
              </Link>
            </div>
          </div>
        </div>

        <LogForm
          open={logFormOpen}
          onClose={() => {
            setLogFormOpen(false);
            setPoopDraft(null);
          }}
          childId={activeChild.id}
          onLogged={handleRefresh}
          initialDraft={poopDraft}
        />

        {editingPoop && (
          <EditPoopSheet
            key={editingPoop.id}
            entry={editingPoop}
            open={!!editingPoop}
            onClose={() => setEditingPoop(null)}
            onSaved={() => { void handleRefresh(); }}
            onDeleted={() => { void handleRefresh(); }}
          />
        )}

        <PoopPresetEditorSheet
          open={poopPresetSheetOpen}
          onClose={() => setPoopPresetSheetOpen(false)}
          feedingType={activeChild.feeding_type}
          presets={quickPoopPresets}
          onSave={(drafts) => { void savePoopPresets(drafts); }}
        />
      </div>
    </PageBody>
  );
}
