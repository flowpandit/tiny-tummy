import { useEffect, useMemo, useState } from "react";
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
import { fillDailyFrequencyDays, formatLocalDateKey, getRecentNoPoopDates } from "../lib/stats";
import { DAYS_IN_WEEK, addDays, formatHoursCompact, formatHoursLong, formatWeekLabel, startOfDay } from "../lib/tracker";
import { getChildStatus } from "../lib/tauri";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, timeSince } from "../lib/utils";
import {
  buildPoopPresetRecordInput,
  describePoopPresetDraft,
  getDefaultQuickPoopPresets,
  hydratePoopPresets,
  type QuickPoopPreset,
} from "../lib/quick-presets";
import * as db from "../lib/db";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { EmptyState, InsetPanel, PageBody, SectionHeading } from "../components/ui/page-layout";
import { ScenicHero } from "../components/layout/ScenicHero";
import {
  TrackerEntryRow,
  TrackerEntryTable,
  TrackerMetricPanel,
  TrackerMetricRing,
  TrackerWeekBarChart,
  TrackerWeekRangePill,
  TrackerWeekSwitcher,
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

function getPoopPresetIconPath(stoolType: number | null): string {
  if (stoolType !== null && stoolType <= 2) {
    return "M12 5.5c3 0 5 1.92 5 4.28 0 1.43-.86 2.4-1.9 3.02 1.6.5 2.65 1.75 2.65 3.42 0 2.47-2.3 4.28-5.75 4.28S6.25 18.7 6.25 16.22c0-1.67 1.05-2.92 2.65-3.42-1.04-.62-1.9-1.6-1.9-3.02C7 7.42 9 5.5 12 5.5Z";
  }

  if (stoolType !== null && stoolType >= 6) {
    return "M8 7.25c1.38 0 2.08 1.06 2.2 1.98.48-.73 1.31-1.48 2.8-1.48 1.88 0 3.25 1.35 3.25 3.12 0 .49-.11.93-.27 1.3 1.18.23 2.02 1.2 2.02 2.48 0 1.58-1.26 2.85-2.88 2.85-.36 0-.68-.06-.98-.16-.36 1.1-1.42 1.91-2.64 1.91-1.16 0-2.18-.73-2.58-1.74-.38.19-.81.29-1.27.29-1.62 0-2.9-1.28-2.9-2.86 0-1.32.91-2.34 2.11-2.53A2.96 2.96 0 0 1 4.75 9.9c0-1.47 1.27-2.65 2.84-2.65.18 0 .28 0 .41.02Z";
  }

  return "M12 4.75c1.43 0 2.62.95 2.98 2.24.12.43.38.8.74 1.06A4.3 4.3 0 0 1 17.5 11.5c0 .84-.25 1.6-.69 2.25 1.08.56 1.82 1.56 1.82 2.87 0 2.02-1.85 3.63-4.16 3.63H9.53c-2.31 0-4.16-1.6-4.16-3.63 0-1.31.74-2.31 1.82-2.87A3.9 3.9 0 0 1 6.5 11.5a4.3 4.3 0 0 1 1.78-3.45c.36-.26.62-.63.74-1.06A3.08 3.08 0 0 1 12 4.75Z";
}

function PoopPresetIcon({
  draft,
  className = "h-10 w-10",
}: {
  draft: Partial<PoopLogDraft>;
  className?: string;
}) {
  const fill = getPoopColorHex(draft.color ?? null);
  const shadow = draft.color === "green" ? "rgba(113, 144, 69, 0.35)" : "rgba(181, 135, 84, 0.28)";
  const iconId = `${draft.stool_type ?? "default"}-${draft.color ?? "none"}`;
  const filterId = `poop-shadow-${iconId}`;
  const gradientId = `poop-highlight-${iconId}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <filter id={filterId}>
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={shadow} floodOpacity="1" />
        </filter>
        <linearGradient id={gradientId} x1="7" y1="5" x2="17" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7d8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={getPoopPresetIconPath(draft.stool_type ?? 4)}
        fill={fill}
        filter={`url(#${filterId})`}
      />
      <path
        d={getPoopPresetIconPath(draft.stool_type ?? 4)}
        fill={`url(#${gradientId})`}
        opacity="0.35"
      />
    </svg>
  );
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
            <span className="text-[0.66rem] leading-none text-[var(--color-text-secondary)]">{day.weekdayLabel}</span>
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

function PoopLogList({
  logs,
  onEdit,
}: {
  logs: PoopEntry[];
  onEdit: (entry: PoopEntry) => void;
}) {
  if (logs.length === 0) {
    return (
      <InsetPanel>
        <p className="text-sm text-[var(--color-text-secondary)]">No poop entries in this week.</p>
      </InsetPanel>
    );
  }

  return (
    <TrackerEntryTable mainHeader="Pattern">
      {logs.map((log) => {
        const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
        const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
        const dateLabel = new Date(log.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const timeLabel = new Date(log.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

        return (
          <TrackerEntryRow
            key={log.id}
            onClick={() => onEdit(log)}
          >
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">{dateLabel}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">{timeLabel}</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.logged_at)}</p>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: log.is_no_poop ? "var(--color-text-soft)" : colorInfo?.hex ?? "var(--color-cta)" }}
                />
                <p className="truncate text-sm font-medium text-[var(--color-text)]">
                  {log.is_no_poop ? "No-poop day" : typeInfo ? `Type ${typeInfo.type} · ${typeInfo.label}` : "Poop logged"}
                </p>
              </div>
              {!log.is_no_poop && (
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {[colorInfo?.label, log.size].filter(Boolean).join(" · ")}
                </p>
              )}
              {log.notes && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {log.notes}
                </p>
              )}
            </div>
          </TrackerEntryRow>
        );
      })}
    </TrackerEntryTable>
  );
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
  const weekLogs = useMemo(
    () => logs.filter((log) => log.logged_at >= `${weekStartKey}T00:00:00` && log.logged_at <= `${weekEndKey}T23:59:59`),
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
  const noPoopDates = useMemo(() => getRecentNoPoopDates(weekLogs, DAYS_IN_WEEK, endDate), [endDate, weekLogs]);

  const totalPoops = weeklyRealLogs.length;
  const dominantType = useMemo(() => {
    const counts = new Map<number, number>();
    weeklyRealLogs.forEach((log) => {
      if (log.stool_type !== null) {
        counts.set(log.stool_type, (counts.get(log.stool_type) ?? 0) + 1);
      }
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [weeklyRealLogs]);
  const dominantColor = useMemo(() => {
    const counts = new Map<string, number>();
    weeklyRealLogs.forEach((log) => {
      if (log.color) {
        counts.set(log.color, (counts.get(log.color) ?? 0) + 1);
      }
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [weeklyRealLogs]);
  const baseline = useMemo(
    () => getAgeBaseline(activeChild?.date_of_birth ?? getCurrentLocalDate(), activeChild?.feeding_type ?? "mixed"),
    [activeChild],
  );
  const prediction = useMemo(
    () => getPrediction(logs, baseline, feedingLogs, symptomLogs, activeEpisode?.episode_type ?? null),
    [activeEpisode, baseline, feedingLogs, logs, symptomLogs],
  );
  const statusBadge = getStatusBadge(status);
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
  const patternNarrative = useMemo(
    () => buildPatternNarrative({
      status,
      baseline,
      baselineComparison,
      dueRisk,
      prediction,
      alerts,
      symptomLogs,
      activeEpisodeType: activeEpisode?.episode_type ?? null,
    }),
    [activeEpisode, alerts, baseline, baselineComparison, dueRisk, prediction, status, symptomLogs],
  );
  const predictionRing = useMemo(() => getPredictionRingDisplay(prediction), [prediction]);
  const alertRing = useMemo(() => getAlertRingDisplay(alerts), [alerts]);
  const repeatablePoop = useMemo(() => getRepeatablePoopEntry(lastRealPoop), [lastRealPoop]);

  if (!activeChild) return null;
  if (experience.mode === "diaper") return null;

  const weekSummaryBits = [
    totalPoops === 0 ? "No poops logged in this week" : `${totalPoops} poop${totalPoops === 1 ? "" : "s"} in this week`,
    dominantType ? `Mostly Type ${dominantType}` : null,
    dominantColor ? `Mostly ${(STOOL_COLORS.find((item) => item.value === dominantColor)?.label ?? dominantColor).toLowerCase()}` : null,
  ].filter(Boolean);

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
        <Card className="-mt-32 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <TimeSinceIndicator
                timestamp={lastRealPoop?.logged_at ?? null}
                status={status === "alert" ? "alert" : status === "caution" ? "caution" : "healthy"}
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

          <div className="mt-3 overflow-x-auto pb-1">
            <div className="flex w-max gap-3 pr-2">
              {quickPoopPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { void handleQuickPoopPreset(preset); }}
                  className="flex min-h-[118px] min-w-[92px] flex-col items-center justify-between rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-3 text-center transition-colors hover:bg-white/70"
                >
                  <PoopPresetIcon draft={preset.draft} className="h-12 w-12" />
                  <p className="text-[0.82rem] font-medium leading-none text-[var(--color-text)]">{preset.label}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current poop status</p>
              <p className="mt-1.5 text-[1.4rem] font-semibold tracking-[-0.035em] text-[var(--color-text)]">
                {status === "healthy" ? "Looks in the usual range" : status === "caution" ? "Pattern needs watching" : "Pattern needs attention"}
              </p>
              <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{normalDescription}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
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
        </CardContent>
      </Card>

      <div className="px-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Weekly overview</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{weekOffset === 0 ? "Last 7 days" : formatWeekLabel(startDate, endDate)}</p>
          </div>
          <TrackerWeekSwitcher
            weekOffset={weekOffset}
            maxWeekOffset={maxWeekOffset}
            onOlder={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
            onNewer={() => setWeekOffset((current) => Math.max(0, current - 1))}
          />
        </div>

        <div className="mt-2.5 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="flex min-h-[74px] items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[0.8rem] font-medium uppercase leading-[1.15] tracking-[0.1em] text-[var(--color-text-soft)]">
                Weekly
                <br />
                Pattern
              </p>
            </div>
            <div className="flex-shrink-0">
              <WeeklyPatternDots filledWeek={filledWeek} />
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <SectionHeading
            title="Weekly pattern"
            description="The same seven-day pattern view, but with week-by-week browsing so older rhythms are easier to compare."
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
            markerDates={noPoopDates}
            markerLegend={`Grey dots mark ${noPoopDates.size} no-poop day${noPoopDates.size === 1 ? "" : "s"} in this week.`}
            valueLabel={(value) => `${value} poop${value === 1 ? "" : "s"}`}
          />
        </CardContent>
      </Card>

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

      {logs.length === 0 ? (
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary)" className="h-8 w-8">
              <path d="M12 3.75c.87 0 1.601.61 1.789 1.423.152.656.514 1.243 1.029 1.671A4.86 4.86 0 0 1 18 10.5c0 3.314-2.686 6-6 6s-6-2.686-6-6a4.86 4.86 0 0 1 3.182-4.556 3.01 3.01 0 0 0 1.029-1.671A1.835 1.835 0 0 1 12 3.75Z" />
            </svg>
          )}
          title="Start the poop page with the first log"
          description="Once the first few entries are in, this page starts surfacing timing, weekly rhythm, and when to pay attention."
          action={<Button variant="primary" onClick={() => setLogFormOpen(true)}>Add first poop log</Button>}
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
                Every poop log for the selected week, with quick editing when details need correcting.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <PoopLogList logs={weekLogs} onEdit={setEditingPoop} />
          </CardContent>
        </Card>
      )}

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
