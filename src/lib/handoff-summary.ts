import { diaperIncludesStool, diaperIncludesWet, getDiaperTypeLabel, getUrineColorLabel } from "./diaper";
import { getEpisodeTypeLabel } from "./episode-constants";
import {
  formatPredictionRange as formatFeedPredictionRange,
  getFeedBaseline,
  getFeedPrediction,
  getUnifiedFeedTimeline,
} from "./feed-insights";
import { getFeedingEntryDisplayLabel } from "./feeding";
import {
  formatPredictionRange as formatSleepPredictionRange,
  formatSleepDuration,
  getClassifiedSleepLogs,
  getDurationMinutes,
  getOverlapMinutesForDay,
  getSleepPrediction,
  getWakeBaseline,
} from "./sleep-insights";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "./symptom-constants";
import { formatLocalDateKey, isOnLocalDay } from "./utils";
import { getCaregiverAttributionDisplay, getCaregiverRoleLabel, type CaregiverAttributionDisplay } from "./caregivers";
import type {
  Alert,
  Caregiver,
  CaregiverAttribution,
  Child,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
  StoolColor,
  SymptomEntry,
} from "./types";

export const HANDOFF_PRIVACY_NOTE = "Generated locally by Tiny Tummy. Share only with people you trust.";

const WATCH_SYMPTOM_TYPES = new Set<SymptomEntry["symptom_type"]>(["fever", "vomiting", "diarrhoea"]);

export type HandoffEventKind = "poop" | "diaper" | "feed" | "sleep" | "symptom" | "episode";

export interface HandoffChild {
  id: string;
  name: string;
  dateOfBirth: string;
  feedingType: Child["feeding_type"];
}

export interface HandoffWindow {
  start: string;
  end: string;
  label: string;
}

export interface HandoffEventSummary {
  kind: HandoffEventKind;
  occurredAt: string;
  title: string;
  detail: string;
  createdByCaregiverName?: string;
  updatedByCaregiverName?: string;
  attributionLabel?: string;
}

export interface HandoffEpisodeSummary {
  title: string;
  startedAt: string;
  detail: string;
}

export interface HandoffLastEvents {
  lastPoop: HandoffEventSummary | null;
  lastWetDiaper: HandoffEventSummary | null;
  lastDirtyDiaper: HandoffEventSummary | null;
  lastFeed: HandoffEventSummary | null;
  lastSleep: HandoffEventSummary | null;
  lastSymptom: HandoffEventSummary | null;
  activeEpisode: HandoffEpisodeSummary | null;
}

export interface HandoffTodaySummary {
  poopCount: number;
  wetDiaperCount: number;
  dirtyDiaperCount: number;
  mixedDiaperCount: number;
  feedCount: number;
  sleepTotalMinutes: number;
  sleepTotal: string;
  symptomCount: number;
}

export interface HandoffDueItem {
  status: "based_on_recent_logs" | "insufficient_data" | "not_available";
  label: string;
  detail: string;
  dueAt?: string;
  windowStart?: string;
  windowEnd?: string;
}

export interface HandoffNextDue {
  nextFeed: HandoffDueItem;
  nextSleep: HandoffDueItem;
  nextDiaperCheck: HandoffDueItem;
  nextPoopExpectation: HandoffDueItem;
}

export interface HandoffWatchItem {
  id: string;
  label: string;
  detail?: string;
}

export interface HandoffTimelineItem {
  kind: HandoffEventKind;
  occurredAt: string;
  title: string;
  detail: string;
  createdByCaregiverName?: string;
  updatedByCaregiverName?: string;
  attributionLabel?: string;
}

export interface HandoffPreparedBy {
  displayName: string;
  roleLabel: string;
}

export interface HandoffSummary {
  child: HandoffChild;
  generatedAt: string;
  preparedBy: HandoffPreparedBy | null;
  handoffWindow: HandoffWindow;
  lastEvents: HandoffLastEvents;
  todaySummary: HandoffTodaySummary;
  nextDue: HandoffNextDue;
  watchItems: HandoffWatchItem[];
  timeline: HandoffTimelineItem[];
  parentNote: string | null;
  privacyNote: string;
}

export interface BuildHandoffSummaryInput {
  child: Child;
  poopLogs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  alerts: Alert[];
  activeEpisode: Episode | null;
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  dayKey?: string;
  generatedAt?: string;
  parentNote?: string | null;
  preparedByCaregiver?: Pick<Caregiver, "display_name" | "role"> | null;
  linkedCaregivers?: Array<Pick<Caregiver, "id" | "display_name" | "deleted_at">>;
  now?: Date;
  timelineLimit?: number;
}

export interface HandoffTextFormatOptions {
  locale?: string;
  timeZone?: string;
}

interface StoolLikeLog {
  logged_at: string;
  stool_type: number | null;
  color: StoolColor | string | null;
  size: string | null;
}

interface Timestamped {
  occurredAt: string;
}

function isActiveRow(row: { deleted_at?: string | null }): boolean {
  return !row.deleted_at;
}

function sortByNewest<T>(items: T[], getTimestamp: (item: T) => string): T[] {
  return [...items].sort((left, right) => new Date(getTimestamp(right)).getTime() - new Date(getTimestamp(left)).getTime());
}

function sortByOldest<T extends Timestamped>(items: T[]): T[] {
  return [...items].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
}

function getStoolColorLabel(color: StoolColor | string | null): string | null {
  if (!color) return null;
  if (color === "black") return "black";
  if (color === "red") return "red";
  if (color === "white") return "white";
  if (color === "yellow") return "yellow";
  if (color === "green") return "green";
  if (color === "brown") return "brown";
  if (color === "orange") return "orange";
  return color;
}

function buildLinkedCaregiverDisplayNames(
  caregivers: BuildHandoffSummaryInput["linkedCaregivers"] = [],
): Record<string, string> {
  const displayNames: Record<string, string> = {};

  for (const caregiver of caregivers) {
    if (!isActiveRow(caregiver)) continue;
    const displayName = caregiver.display_name.trim();
    if (!displayName) continue;
    displayNames[caregiver.id] = displayName;
  }

  return displayNames;
}

function getHandoffCaregiverAttribution(
  entry: CaregiverAttribution,
  caregiverDisplayNames: Record<string, string>,
): CaregiverAttributionDisplay {
  return getCaregiverAttributionDisplay(entry, caregiverDisplayNames);
}

function formatStoolDetails(log: StoolLikeLog): string {
  return [
    getStoolColorLabel(log.color),
    log.stool_type ? `Type ${log.stool_type}` : null,
    log.size,
  ].filter(Boolean).join(", ") || "Details not recorded";
}

function toPoopEvent(log: PoopEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  return {
    kind: "poop",
    occurredAt: log.logged_at,
    title: "Poop",
    detail: formatStoolDetails(log),
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toDirtyDiaperPoopEvent(log: DiaperEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  return {
    kind: "poop",
    occurredAt: log.logged_at,
    title: "Dirty diaper",
    detail: formatStoolDetails(log),
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toDiaperEvent(log: DiaperEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  const urine = getUrineColorLabel(log.urine_color);
  const stool = diaperIncludesStool(log.diaper_type) ? formatStoolDetails(log) : null;

  return {
    kind: "diaper",
    occurredAt: log.logged_at,
    title: getDiaperTypeLabel(log.diaper_type),
    detail: [urine, stool].filter(Boolean).join(", ") || "Details not recorded",
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toFeedEvent(log: FeedingEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  return {
    kind: "feed",
    occurredAt: log.logged_at,
    title: "Feed",
    detail: getFeedingEntryDisplayLabel(log),
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toSleepEvent(log: SleepEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  return {
    kind: "sleep",
    occurredAt: log.ended_at,
    title: log.sleep_type === "night" ? "Night sleep" : "Nap",
    detail: formatSleepDuration(getDurationMinutes(log)),
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toSymptomEvent(log: SymptomEntry, caregiverDisplayNames: Record<string, string>): HandoffEventSummary {
  return {
    kind: "symptom",
    occurredAt: log.logged_at,
    title: getSymptomTypeLabel(log.symptom_type),
    detail: getSymptomSeverityLabel(log.severity),
    ...getHandoffCaregiverAttribution(log, caregiverDisplayNames),
  };
}

function toEpisodeSummary(episode: Episode | null): HandoffEpisodeSummary | null {
  if (!episode) return null;

  return {
    title: getEpisodeTypeLabel(episode.episode_type),
    startedAt: episode.started_at,
    detail: episode.summary?.trim() || "Active episode is still open.",
  };
}

function getVisibleDirectPoopLogs(poopLogs: PoopEntry[], diaperLogs: DiaperEntry[]): PoopEntry[] {
  const linkedPoopIds = new Set(
    diaperLogs
      .map((log) => log.linked_poop_log_id)
      .filter((id): id is string => Boolean(id)),
  );

  return poopLogs.filter((log) => log.is_no_poop === 0 && !linkedPoopIds.has(log.id));
}

function getPoopEvents(
  poopLogs: PoopEntry[],
  diaperLogs: DiaperEntry[],
  caregiverDisplayNames: Record<string, string>,
): HandoffEventSummary[] {
  const directPoops = getVisibleDirectPoopLogs(poopLogs, diaperLogs)
    .map((log) => toPoopEvent(log, caregiverDisplayNames));
  const diaperPoops = diaperLogs
    .filter((log) => diaperIncludesStool(log.diaper_type))
    .map((log) => toDirtyDiaperPoopEvent(log, caregiverDisplayNames));
  return sortByNewest([...directPoops, ...diaperPoops], (event) => event.occurredAt);
}

export function formatHandoffDateTime(value: string, options: HandoffTextFormatOptions = {}): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(options.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  }).format(parsed).replace(/\s+/g, " ");
}

export function formatHandoffTime(value: string, options: HandoffTextFormatOptions = {}): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(options.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  }).format(parsed).replace(/\s+/g, " ");
}

function formatDueWindow(start: string, end: string, options: HandoffTextFormatOptions = {}): string {
  return `${formatHandoffTime(start, options)} to ${formatHandoffTime(end, options)}`;
}

function formatCount(noun: string, count: number): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function buildPredictionDueItem(input: {
  kind: "feed" | "sleep";
  prediction: ReturnType<typeof getFeedPrediction> | ReturnType<typeof getSleepPrediction>;
}): HandoffDueItem {
  if (!input.prediction) {
    return {
      status: "insufficient_data",
      label: "No clear pattern yet",
      detail: input.kind === "feed"
        ? "Not enough feed logs to estimate the next feed."
        : "Not enough sleep logs to estimate the next sleep.",
    };
  }

  if (input.prediction.source !== "history") {
    return {
      status: "insufficient_data",
      label: "No clear pattern yet",
      detail: input.kind === "feed"
        ? "The last feed is logged, but there is not enough feed history for a reliable next window."
        : "The last sleep is logged, but there is not enough sleep history for a reliable next window.",
    };
  }

  const itemLabel = input.kind === "feed" ? "Next feed" : "Next sleep";
  const stateLabel = input.prediction.state === "overdue"
    ? `${itemLabel} may be due now`
    : input.prediction.state === "due"
      ? `${itemLabel} window is open`
      : `${itemLabel} is likely later`;

  return {
    status: "based_on_recent_logs",
    label: stateLabel,
    detail: input.kind === "feed"
      ? `Based on recent logs: ${formatFeedPredictionRange(input.prediction)}.`
      : `Based on recent logs: ${formatSleepPredictionRange(input.prediction)}.`,
    dueAt: input.prediction.predictedAt.toISOString(),
    windowStart: input.prediction.earliestAt.toISOString(),
    windowEnd: input.prediction.latestAt.toISOString(),
  };
}

function buildNextDue(input: {
  child: Child;
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  lastWetDiaper: HandoffEventSummary | null;
  lastPoop: HandoffEventSummary | null;
}): HandoffNextDue {
  const feedBaseline = getFeedBaseline(input.child.date_of_birth, input.child.feeding_type);
  const sleepBaseline = getWakeBaseline(input.child.date_of_birth);
  const feedPrediction = getFeedPrediction(input.feedingLogs, feedBaseline);
  const sleepPrediction = getSleepPrediction(input.sleepLogs, sleepBaseline);

  return {
    nextFeed: buildPredictionDueItem({ kind: "feed", prediction: feedPrediction }),
    nextSleep: buildPredictionDueItem({ kind: "sleep", prediction: sleepPrediction }),
    nextDiaperCheck: input.lastWetDiaper
      ? {
          status: "not_available",
          label: "No clear pattern yet",
          detail: "A diaper check prediction is not available yet; use the last wet diaper time for handoff context.",
        }
      : {
          status: "insufficient_data",
          label: "No wet diaper logged yet",
          detail: "Not enough diaper logs to estimate a next check.",
        },
    nextPoopExpectation: input.lastPoop
      ? {
          status: "not_available",
          label: "No clear pattern yet",
          detail: "Poop timing varies in the current logs; dated events are more useful than an average.",
        }
      : {
          status: "insufficient_data",
          label: "No poop logged yet",
          detail: "Not enough poop logs to estimate a next poop.",
        },
  };
}

function addWatchItem(items: HandoffWatchItem[], item: HandoffWatchItem): void {
  if (items.some((existing) => existing.id === item.id)) return;
  items.push(item);
}

function buildWatchItems(input: {
  todayPoopEvents: HandoffEventSummary[];
  todayDiaperLogs: DiaperEntry[];
  todaySymptoms: SymptomEntry[];
  alerts: Alert[];
  activeEpisode: Episode | null;
  timelineEventCount: number;
}): HandoffWatchItem[] {
  const items: HandoffWatchItem[] = [];
  const wetCount = input.todayDiaperLogs.filter((log) => diaperIncludesWet(log.diaper_type)).length;

  if (input.activeEpisode) {
    addWatchItem(items, {
      id: `active-episode-${input.activeEpisode.id}`,
      label: `${getEpisodeTypeLabel(input.activeEpisode.episode_type)} episode is active.`,
      detail: input.activeEpisode.summary ?? undefined,
    });
  }

  const redFlagPoop = input.todayPoopEvents.find((event) => {
    const detail = event.detail.toLowerCase();
    return detail.includes("red") || detail.includes("black") || detail.includes("white");
  });
  if (redFlagPoop) {
    addWatchItem(items, {
      id: "red-flag-stool-color",
      label: `${redFlagPoop.detail.split(",")[0]} stool was logged today.`,
    });
  }

  if (wetCount === 0) {
    addWatchItem(items, {
      id: "low-wet-diaper-count",
      label: "No wet diapers logged today.",
    });
  } else if (wetCount <= 1) {
    addWatchItem(items, {
      id: "low-wet-diaper-count",
      label: "Only 1 wet diaper logged today.",
    });
  }

  for (const symptom of input.todaySymptoms) {
    if (!WATCH_SYMPTOM_TYPES.has(symptom.symptom_type)) continue;
    addWatchItem(items, {
      id: `recent-symptom-${symptom.symptom_type}`,
      label: `${getSymptomTypeLabel(symptom.symptom_type)} was logged today.`,
      detail: getSymptomSeverityLabel(symptom.severity),
    });
  }

  for (const alert of input.alerts.slice(0, 2)) {
    addWatchItem(items, {
      id: `alert-${alert.id}`,
      label: alert.title,
      detail: alert.message,
    });
  }

  if (input.timelineEventCount <= 3) {
    addWatchItem(items, {
      id: "sparse-logging",
      label: "Logging is sparse; dated events may be more useful than averages.",
    });
  }

  return items.slice(0, 6);
}

function buildTimeline(input: {
  poopEvents: HandoffEventSummary[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  activeEpisode: Episode | null;
  dayKey: string;
  limit: number;
  caregiverDisplayNames: Record<string, string>;
}): HandoffTimelineItem[] {
  const diaperEvents = input.diaperLogs
    .filter((log) => isOnLocalDay(log.logged_at, input.dayKey))
    .map((log) => toDiaperEvent(log, input.caregiverDisplayNames));
  const feedEvents = input.feedingLogs
    .filter((log) => isOnLocalDay(log.logged_at, input.dayKey))
    .map((log) => toFeedEvent(log, input.caregiverDisplayNames));
  const sleepEvents = input.sleepLogs
    .filter((log) => isOnLocalDay(log.ended_at, input.dayKey))
    .map((log) => toSleepEvent(log, input.caregiverDisplayNames));
  const symptomEvents = input.symptomLogs
    .filter((log) => isOnLocalDay(log.logged_at, input.dayKey))
    .map((log) => toSymptomEvent(log, input.caregiverDisplayNames));
  const episodeEvents = input.activeEpisode && isOnLocalDay(input.activeEpisode.started_at, input.dayKey)
    ? [{
        kind: "episode" as const,
        occurredAt: input.activeEpisode.started_at,
        title: `${getEpisodeTypeLabel(input.activeEpisode.episode_type)} started`,
        detail: input.activeEpisode.summary ?? "Episode opened",
        ...getHandoffCaregiverAttribution(input.activeEpisode, input.caregiverDisplayNames),
      }]
    : [];

  const todaysPoopEvents = input.poopEvents.filter((event) => isOnLocalDay(event.occurredAt, input.dayKey));

  return sortByOldest([
    ...todaysPoopEvents,
    ...diaperEvents,
    ...feedEvents,
    ...sleepEvents,
    ...symptomEvents,
    ...episodeEvents,
  ]).slice(-input.limit);
}

export function buildHandoffSummary(input: BuildHandoffSummaryInput): HandoffSummary {
  const now = input.now ?? new Date();
  const dayKey = input.dayKey ?? formatLocalDateKey(now);
  const generatedAt = input.generatedAt ?? now.toISOString();
  const parentNote = input.parentNote?.trim() || null;
  const caregiverDisplayNames = buildLinkedCaregiverDisplayNames(input.linkedCaregivers);
  const preparedBy = input.preparedByCaregiver
    ? {
        displayName: input.preparedByCaregiver.display_name,
        roleLabel: getCaregiverRoleLabel(input.preparedByCaregiver.role),
      }
    : null;
  const poopLogs = input.poopLogs.filter(isActiveRow);
  const diaperLogs = input.diaperLogs.filter(isActiveRow);
  const feedingLogs = getUnifiedFeedTimeline(input.feedingLogs.filter(isActiveRow));
  const sleepLogs = getClassifiedSleepLogs(input.sleepLogs.filter(isActiveRow), now.getTime());
  const symptomLogs = sortByNewest(input.symptomLogs.filter(isActiveRow), (log) => log.logged_at);
  const alerts = input.alerts.filter(isActiveRow);
  const activeEpisode = input.activeEpisode && isActiveRow(input.activeEpisode) ? input.activeEpisode : null;
  const poopEvents = getPoopEvents(poopLogs, diaperLogs, caregiverDisplayNames);
  const wetDiapers = sortByNewest(diaperLogs.filter((log) => diaperIncludesWet(log.diaper_type)), (log) => log.logged_at);
  const dirtyDiapers = sortByNewest(diaperLogs.filter((log) => diaperIncludesStool(log.diaper_type)), (log) => log.logged_at);
  const todayDiaperLogs = diaperLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey));
  const todaySymptoms = symptomLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey));
  const todayPoopEvents = poopEvents.filter((event) => isOnLocalDay(event.occurredAt, dayKey));
  const timeline = buildTimeline({
    poopEvents,
    diaperLogs,
    feedingLogs,
    sleepLogs,
    symptomLogs,
    activeEpisode,
    dayKey,
    limit: input.timelineLimit ?? 8,
    caregiverDisplayNames,
  });
  const lastPoop = poopEvents[0] ?? null;
  const lastWetDiaper = wetDiapers[0] ? toDiaperEvent(wetDiapers[0], caregiverDisplayNames) : null;
  const lastDirtyDiaper = dirtyDiapers[0] ? toDiaperEvent(dirtyDiapers[0], caregiverDisplayNames) : null;
  const lastFeed = feedingLogs[0] ? toFeedEvent(feedingLogs[0], caregiverDisplayNames) : null;
  const lastSleep = sleepLogs[0] ? toSleepEvent(sleepLogs[0], caregiverDisplayNames) : null;
  const lastSymptom = symptomLogs[0] ? toSymptomEvent(symptomLogs[0], caregiverDisplayNames) : null;
  const sleepTotalMinutes = sleepLogs.reduce((sum, log) => sum + getOverlapMinutesForDay(log, dayKey), 0);

  return {
    child: {
      id: input.child.id,
      name: input.child.name,
      dateOfBirth: input.child.date_of_birth,
      feedingType: input.child.feeding_type,
    },
    generatedAt,
    preparedBy,
    handoffWindow: {
      start: dayKey,
      end: dayKey,
      label: "Today",
    },
    lastEvents: {
      lastPoop,
      lastWetDiaper,
      lastDirtyDiaper,
      lastFeed,
      lastSleep,
      lastSymptom,
      activeEpisode: toEpisodeSummary(activeEpisode),
    },
    todaySummary: {
      poopCount: todayPoopEvents.length,
      wetDiaperCount: todayDiaperLogs.filter((log) => diaperIncludesWet(log.diaper_type)).length,
      dirtyDiaperCount: todayDiaperLogs.filter((log) => diaperIncludesStool(log.diaper_type)).length,
      mixedDiaperCount: todayDiaperLogs.filter((log) => log.diaper_type === "mixed").length,
      feedCount: feedingLogs.filter((log) => isOnLocalDay(log.logged_at, dayKey)).length,
      sleepTotalMinutes,
      sleepTotal: formatSleepDuration(sleepTotalMinutes),
      symptomCount: todaySymptoms.length,
    },
    nextDue: buildNextDue({
      child: input.child,
      feedingLogs,
      sleepLogs,
      lastWetDiaper,
      lastPoop,
    }),
    watchItems: buildWatchItems({
      todayPoopEvents,
      todayDiaperLogs,
      todaySymptoms,
      alerts,
      activeEpisode,
      timelineEventCount: timeline.length,
    }),
    timeline,
    parentNote,
    privacyNote: HANDOFF_PRIVACY_NOTE,
  };
}

function formatEventForText(event: HandoffEventSummary | null, options: HandoffTextFormatOptions): string {
  if (!event) return "No log yet";
  return [
    formatHandoffTime(event.occurredAt, options),
    event.detail,
    event.attributionLabel,
  ].filter(Boolean).join(" - ");
}

function formatDueItemForText(item: HandoffDueItem, options: HandoffTextFormatOptions): string {
  if (item.windowStart && item.windowEnd) {
    return `${item.label} (${formatDueWindow(item.windowStart, item.windowEnd, options)})`;
  }
  return `${item.label} - ${item.detail}`;
}

export function formatHandoffSummaryText(
  summary: HandoffSummary,
  options: HandoffTextFormatOptions = {},
): string {
  const lines = [
    `Tiny Tummy handoff for ${summary.child.name}`,
    `Generated: ${formatHandoffDateTime(summary.generatedAt, options)}`,
    ...(summary.preparedBy ? [`Prepared by: ${summary.preparedBy.displayName} (${summary.preparedBy.roleLabel})`] : []),
    "",
    "Today so far:",
    `- Poops: ${summary.todaySummary.poopCount}`,
    `- Wet diapers: ${summary.todaySummary.wetDiaperCount}`,
    `- Dirty diapers: ${summary.todaySummary.dirtyDiaperCount}`,
    `- Mixed diapers: ${summary.todaySummary.mixedDiaperCount}`,
    `- Feeds: ${summary.todaySummary.feedCount}`,
    `- Sleep: ${summary.todaySummary.sleepTotal}`,
    `- Symptoms: ${summary.todaySummary.symptomCount}`,
    "",
    "Last events:",
    `- Last poop: ${formatEventForText(summary.lastEvents.lastPoop, options)}`,
    `- Last wet diaper: ${formatEventForText(summary.lastEvents.lastWetDiaper, options)}`,
    `- Last feed: ${formatEventForText(summary.lastEvents.lastFeed, options)}`,
    `- Last sleep: ${formatEventForText(summary.lastEvents.lastSleep, options)}`,
    `- Active episode: ${summary.lastEvents.activeEpisode ? `${summary.lastEvents.activeEpisode.title} - ${summary.lastEvents.activeEpisode.detail}` : "None logged"}`,
    "",
    "Likely due next:",
    `- ${formatDueItemForText(summary.nextDue.nextFeed, options)}`,
    `- ${formatDueItemForText(summary.nextDue.nextSleep, options)}`,
    `- Diaper check: ${summary.nextDue.nextDiaperCheck.label}`,
    "",
    "Watch items:",
    ...(summary.watchItems.length > 0
      ? summary.watchItems.map((item) => `- ${item.label}`)
      : ["- No watch items logged for this window."]),
    "",
    "What happened today:",
    ...(summary.timeline.length > 0
      ? summary.timeline.map((item) => `- ${[
          formatHandoffTime(item.occurredAt, options),
          `${item.title}: ${item.detail}`,
          item.attributionLabel,
        ].filter(Boolean).join(" - ")}`)
      : ["- No events logged yet."]),
  ];

  if (summary.parentNote) {
    lines.push("", "Parent note:", summary.parentNote);
  }

  lines.push("", summary.privacyNote);

  return lines.join("\n");
}

export function getHandoffSummaryCountsLabel(summary: HandoffSummary): string {
  return [
    formatCount("poop", summary.todaySummary.poopCount),
    formatCount("wet diaper", summary.todaySummary.wetDiaperCount),
    formatCount("feed", summary.todaySummary.feedCount),
    `${summary.todaySummary.sleepTotal} sleep`,
  ].join(" / ");
}
