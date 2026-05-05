import { formatDate, formatLocalDateKey } from "./utils";
import { STOOL_COLORS } from "./constants";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getFeedingEntryDisplayLabel } from "./feeding";
import { getMilestoneTypeLabel } from "./milestone-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "./symptom-constants";
import { formatGrowthValue, formatTemperatureValue, formatVolumeValue, getDefaultTemperatureUnit, volumeMlToDisplay } from "./units";
import type {
  Episode,
  EpisodeEvent,
  Attachment,
  Child,
  DiaperEntry,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
  UnitSystem,
} from "./types";

export interface EpisodeReportGroup {
  episode: Episode;
  events: EpisodeEvent[];
}

export interface ReportHighlight {
  tone: "alert" | "caution" | "info";
  title: string;
  detail: string;
}

export type ReportMode =
  | "pediatrician_full"
  | "doctor_brief"
  | "poop_diaper"
  | "symptoms_episodes"
  | "caregiver_handoff"
  | "clinical_export";

export const REPORT_MODES: ReportMode[] = [
  "pediatrician_full",
  "doctor_brief",
  "poop_diaper",
  "symptoms_episodes",
  "caregiver_handoff",
  "clinical_export",
];

export const DEFAULT_REPORT_MODE: ReportMode = "pediatrician_full";

export type ReportKind = "poopTummy" | "fullHealth";

export const DEFAULT_REPORT_KIND: ReportKind = "poopTummy";

export interface ReportDateRange {
  start: string;
  end: string;
}

export type ReportBooleanOptionKey =
  | "includeFeeds"
  | "includeEpisodes"
  | "includeEpisodeSummary"
  | "includeSymptoms"
  | "includeMilestones"
  | "includeGrowth"
  | "includeNotes"
  | "includeTimeline"
  | "includePhotos"
  | "includeAttachmentMetadata"
  | "includeDeleted"
  | "includeFeedingContext"
  | "includeSleepContext"
  | "includeGrowthContext"
  | "includeCaregiverAttribution";

export interface ReportOptions {
  mode?: ReportMode;
  childId?: string;
  dateRange?: ReportDateRange;
  includeTimeline: boolean;
  includePhotos: boolean;
  includeAttachmentMetadata: boolean;
  includeDeleted: boolean;
  includeFeedingContext: boolean;
  includeSleepContext: boolean;
  includeGrowthContext: boolean;
  includeCaregiverAttribution: boolean;
  maxTimelineRows?: number;
  generatedAt?: string;
  includeFeeds: boolean;
  includeEpisodes: boolean;
  includeEpisodeSummary: boolean;
  includeSymptoms: boolean;
  includeMilestones: boolean;
  includeGrowth: boolean;
  includeNotes: boolean;
}

export type ReportSectionId =
  | "poopSummary"
  | "diaperSummary"
  | "feedingContext"
  | "sleepContext"
  | "symptomsSummary"
  | "episodeSummary"
  | "growthContext"
  | "milestonesContext"
  | "caregiverHandoff"
  | "charts"
  | "notes";

export type ReportSectionTone = "default" | "info" | "healthy" | "caution" | "alert";

export interface ReportChildSummary {
  id: string;
  name: string | null;
  dateOfBirth: string | null;
  sex: Child["sex"] | null;
  feedingType: Child["feeding_type"] | null;
}

export interface ReportDataQuality {
  totalDays: number;
  activeDays: number;
  loggedEventCount: number;
  isSparse: boolean;
  includesDeleted: boolean;
  notes: string[];
}

export interface ReportBrief {
  title: string;
  summary: string;
  rows: ReportSectionRow[];
}

export interface ReportKeyMetric {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone: ReportSectionTone;
}

export interface ReportSectionRow {
  label: string;
  value: string;
  detail?: string;
  at?: string;
  sourceId?: string;
  sourceType?: string;
  caregiverId?: string | null;
  tone?: ReportSectionTone;
}

export interface TinyTummyReportSection {
  id: ReportSectionId;
  title: string;
  summary?: string;
  rows: ReportSectionRow[];
}

export type TinyTummyReportSections = Partial<Record<ReportSectionId, TinyTummyReportSection>>;

export interface TinyTummyReportTimelineRow extends ReportSectionRow {
  eventType: string;
}

export interface ReportAttachmentMetadata {
  ownerTable: string;
  ownerId: string;
  childId: string | null;
  localPath: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
  policy: "local_only_metadata";
}

export interface ReportAttachmentPolicy {
  includePhotos: boolean;
  includeAttachmentMetadata: boolean;
  localOnly: boolean;
  summary: string;
  attachments: ReportAttachmentMetadata[];
}

export interface TinyTummyReportData {
  schemaVersion: "tiny_tummy_report_v1";
  reportId: string;
  mode: ReportMode;
  generatedAt: string;
  child: ReportChildSummary;
  dateRange: ReportDateRange;
  dataQuality: ReportDataQuality;
  disclaimer: string;
  brief: ReportBrief;
  keyMetrics: ReportKeyMetric[];
  sections: TinyTummyReportSections;
  timeline: TinyTummyReportTimelineRow[];
  questions: string[];
  privacyNote: string;
  attachmentPolicy: ReportAttachmentPolicy;
}

export interface ReportHandoffSourceData {
  dayKey: string;
  lastPoop: PoopEntry | null;
  lastDiaper: DiaperEntry | null;
  lastWetDiaper: DiaperEntry | null;
  lastFeed: FeedingEntry | null;
  lastSleep: SleepEntry | null;
  activeEpisode: Episode | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  latestSymptom: SymptomEntry | null;
  recentSymptoms: SymptomEntry[];
  todayPoops: number;
  todayWetDiapers: number;
  todayDirtyDiapers: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  watchItems: string[];
}

export interface ReportDashboardStat {
  label: string;
  value: string;
  detail?: string;
}

export interface ReportChartPoint {
  label: string;
  primaryValue: number;
  secondaryValue?: number;
}

export interface ReportContextRow {
  title: string;
  meta?: string;
  detail?: string;
}

export interface ReportContextSection {
  title: string;
  emptyText: string;
  rows: ReportContextRow[];
}

export interface ReportTimelineRow {
  dateTime: string;
  eventType: string;
  details: string;
  note?: string;
}

export interface ReportStoolEvent {
  id: string;
  source: "poop" | "diaper";
  logged_at: string;
  stool_type: number | null;
  color: string | null;
  size: string | null;
  is_no_poop: number;
  notes: string | null;
  photo_path: string | null;
  diaper_type?: DiaperEntry["diaper_type"];
  urine_color?: DiaperEntry["urine_color"];
}

export interface ReportDiaperStats {
  total: number;
  wet: number;
  dirty: number;
  mixed: number;
  darkUrine: number;
  photoCount: number;
}

export interface ReportData {
  reportKind: ReportKind;
  reportMode: ReportMode;
  report: TinyTummyReportData;
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  stoolEvents: ReportStoolEvent[];
  diaperStats: ReportDiaperStats;
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  photoUrls: Record<string, string>;
  highlights: ReportHighlight[];
  stats: {
    totalPoops: number;
    totalNoPoop: number;
    avgPerDay: number;
    mostCommonType: number | null;
    mostCommonColor: string | null;
  };
  dashboardStats: ReportDashboardStat[];
  chartData: {
    stoolOutput: ReportChartPoint[];
    diaperOutput: ReportChartPoint[];
    feedActivity: ReportChartPoint[];
    stoolConsistency: ReportChartPoint[];
    symptomActivity: ReportChartPoint[];
  };
  contextSections: ReportContextSection[];
  timeline: ReportTimelineRow[];
}

export interface ReportSourceData {
  child?: Pick<Child, "id" | "name" | "date_of_birth" | "sex" | "feeding_type"> | null;
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs?: SleepEntry[];
  growthLogs: GrowthEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  attachments?: Attachment[];
  handoffSummary?: ReportHandoffSourceData | null;
}

function buildReportOptionsForMode(mode: ReportMode): ReportOptions {
  const base: ReportOptions = {
    mode,
    childId: "",
    dateRange: { start: "", end: "" },
    includeTimeline: true,
    includePhotos: false,
    includeAttachmentMetadata: false,
    includeDeleted: false,
    includeFeedingContext: true,
    includeSleepContext: false,
    includeGrowthContext: false,
    includeMilestones: false,
    includeCaregiverAttribution: false,
    includeFeeds: true,
    includeEpisodes: true,
    includeEpisodeSummary: true,
    includeSymptoms: true,
    includeGrowth: false,
    includeNotes: true,
  };

  switch (mode) {
    case "doctor_brief":
      return {
        ...base,
        includeTimeline: false,
        includeFeedingContext: false,
        includeFeeds: false,
        includeMilestones: false,
        includeGrowthContext: false,
        includeGrowth: false,
        maxTimelineRows: 0,
      };
    case "poop_diaper":
      return {
        ...base,
        includeSymptoms: false,
        includeEpisodes: false,
        includeEpisodeSummary: false,
        includeMilestones: false,
        includeGrowthContext: false,
        includeGrowth: false,
        maxTimelineRows: 80,
      };
    case "symptoms_episodes":
      return {
        ...base,
        includeFeedingContext: false,
        includeSleepContext: false,
        includeFeeds: false,
        includeMilestones: false,
        includeGrowthContext: false,
        includeGrowth: false,
        maxTimelineRows: 80,
      };
    case "caregiver_handoff":
      return {
        ...base,
        includeSleepContext: true,
        includeMilestones: false,
        includeGrowthContext: false,
        includeGrowth: false,
        maxTimelineRows: 12,
      };
    case "clinical_export":
      return {
        ...base,
        includeGrowthContext: true,
        includeGrowth: true,
        includeMilestones: true,
        maxTimelineRows: 250,
      };
    case "pediatrician_full":
    default:
      return {
        ...base,
        includeGrowthContext: true,
        includeGrowth: true,
        includeMilestones: true,
        maxTimelineRows: 150,
      };
  }
}

export function getReportModeForKind(reportKind: ReportKind): ReportMode {
  return reportKind === "poopTummy" ? "poop_diaper" : "pediatrician_full";
}

export function getReportKindForMode(mode: ReportMode): ReportKind {
  return mode === "poop_diaper" ? "poopTummy" : "fullHealth";
}

export function getDefaultReportOptionsForMode(
  mode: ReportMode = DEFAULT_REPORT_MODE,
  input: Partial<Pick<ReportOptions, "childId" | "dateRange" | "generatedAt">> = {},
): ReportOptions {
  return {
    ...buildReportOptionsForMode(mode),
    ...input,
    mode,
  };
}

export const defaultReportOptions: ReportOptions = getDefaultReportOptionsForMode("pediatrician_full");

export const defaultPoopTummyReportOptions: ReportOptions = getDefaultReportOptionsForMode("poop_diaper");

export function getDefaultReportOptionsForKind(reportKind: ReportKind): ReportOptions {
  return getDefaultReportOptionsForMode(getReportModeForKind(reportKind));
}

export function normalizeReportOptions(
  options: Partial<ReportOptions> = {},
  context: Partial<Pick<ReportOptions, "mode" | "childId" | "dateRange" | "generatedAt">> = {},
): ReportOptions {
  const mode = options.mode ?? context.mode ?? DEFAULT_REPORT_MODE;
  const defaults = getDefaultReportOptionsForMode(mode);
  const dateRange = hasCompleteReportDateRange(options.dateRange)
    ? options.dateRange
    : context.dateRange ?? defaults.dateRange;
  const merged: ReportOptions = {
    ...defaults,
    ...options,
    mode,
    childId: options.childId ?? context.childId ?? defaults.childId,
    dateRange,
    generatedAt: options.generatedAt ?? context.generatedAt ?? defaults.generatedAt,
  };

  if (options.includeFeeds !== undefined || options.includeFeedingContext !== undefined) {
    const nextIncludeFeeding = options.includeFeeds === false || options.includeFeedingContext === false
      ? false
      : options.includeFeeds === true || options.includeFeedingContext === true;
    merged.includeFeeds = nextIncludeFeeding;
    merged.includeFeedingContext = nextIncludeFeeding;
  }
  if (options.includeGrowth !== undefined || options.includeGrowthContext !== undefined) {
    const nextIncludeGrowth = options.includeGrowth === false || options.includeGrowthContext === false
      ? false
      : options.includeGrowth === true || options.includeGrowthContext === true;
    merged.includeGrowth = nextIncludeGrowth;
    merged.includeGrowthContext = nextIncludeGrowth;
  }

  return merged;
}

function hasCompleteReportDateRange(dateRange: ReportDateRange | undefined): dateRange is ReportDateRange {
  return Boolean(dateRange?.start.trim() && dateRange.end.trim());
}

function dateKey(isoString: string): string {
  return isoString.split("T")[0];
}

function buildLastNDates(endDate: string, count: number): string[] {
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const current = new Date(end);
    current.setDate(end.getDate() - index);
    dates.push(formatLocalDateKey(current));
  }
  return dates;
}

function getDateRangeLength(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function hasStoolInDiaper(log: DiaperEntry): boolean {
  return log.diaper_type === "dirty" || log.diaper_type === "mixed";
}

function hasUrineInDiaper(log: DiaperEntry): boolean {
  return log.diaper_type === "wet" || log.diaper_type === "mixed";
}

function getVisiblePoopLogs(logs: PoopEntry[], diaperLogs: DiaperEntry[]): PoopEntry[] {
  const linkedPoopIds = new Set(
    diaperLogs
      .map((log) => log.linked_poop_log_id)
      .filter((id): id is string => Boolean(id)),
  );
  const diaperStoolKeys = new Set(
    diaperLogs
      .filter(hasStoolInDiaper)
      .map((log) => [
        log.logged_at,
        log.stool_type ?? "",
        log.color ?? "",
        log.size ?? "",
      ].join("|")),
  );

  return logs.filter((log) => {
    if (linkedPoopIds.has(log.id)) return false;
    if (log.is_no_poop === 1) return true;
    const logKey = [
      log.logged_at,
      log.stool_type ?? "",
      log.color ?? "",
      log.size ?? "",
    ].join("|");
    return !diaperStoolKeys.has(logKey);
  });
}

function buildReportStoolEvents(logs: PoopEntry[], diaperLogs: DiaperEntry[]): ReportStoolEvent[] {
  const poopEvents: ReportStoolEvent[] = getVisiblePoopLogs(logs, diaperLogs).map((log) => ({
    id: log.id,
    source: "poop",
    logged_at: log.logged_at,
    stool_type: log.stool_type,
    color: log.color,
    size: log.size,
    is_no_poop: log.is_no_poop,
    notes: log.notes,
    photo_path: log.photo_path,
  }));

  const diaperStoolEvents: ReportStoolEvent[] = diaperLogs
    .filter(hasStoolInDiaper)
    .map((log) => ({
      id: log.id,
      source: "diaper",
      logged_at: log.logged_at,
      stool_type: log.stool_type,
      color: log.color,
      size: log.size,
      is_no_poop: 0,
      notes: log.notes,
      photo_path: log.photo_path,
      diaper_type: log.diaper_type,
      urine_color: log.urine_color,
    }));

  return [...poopEvents, ...diaperStoolEvents].sort((left, right) => (left.logged_at < right.logged_at ? 1 : -1));
}

function buildDiaperStats(diaperLogs: DiaperEntry[]): ReportDiaperStats {
  return {
    total: diaperLogs.length,
    wet: diaperLogs.filter(hasUrineInDiaper).length,
    dirty: diaperLogs.filter(hasStoolInDiaper).length,
    mixed: diaperLogs.filter((log) => log.diaper_type === "mixed").length,
    darkUrine: diaperLogs.filter((log) => log.urine_color === "dark").length,
    photoCount: diaperLogs.filter((log) => Boolean(log.photo_path)).length,
  };
}

function formatShortDayLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

function formatShortChartDateLabel(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getLongestNoPoopStreak(logs: Array<{ is_no_poop: number; logged_at: string }>): number {
  const dates = [...new Set(
    logs
      .filter((log) => log.is_no_poop === 1)
      .map((log) => dateKey(log.logged_at)),
  )].sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00`);
    const next = new Date(`${dates[index]}T00:00:00`);
    const dayDiff = (next.getTime() - previous.getTime()) / 86400000;

    if (dayDiff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function buildReportHighlights(data: {
  stoolEvents: ReportStoolEvent[];
  diaperStats: ReportDiaperStats;
  feedingLogs: FeedingEntry[];
  episodeGroups: EpisodeReportGroup[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
}): ReportHighlight[] {
  const highlights: ReportHighlight[] = [];
  const redFlagLogs = data.stoolEvents.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return log.is_no_poop === 0 && colorInfo?.isRedFlag;
  });
  const hardStoolCount = data.stoolEvents.filter((log) => (log.stool_type ?? 99) <= 2).length;
  const looseStoolCount = data.stoolEvents.filter((log) => (log.stool_type ?? 0) >= 6).length;
  const longestNoPoopStreak = getLongestNoPoopStreak(data.stoolEvents);
  const activeEpisode = data.episodeGroups.find((group) => group.episode.status === "active");
  const severeSymptoms = data.symptomLogs.filter((log) => log.severity === "severe");
  const strainingCount = data.symptomLogs.filter((log) => log.symptom_type === "straining").length;
  const latestMilestone = data.milestoneLogs[0] ?? null;

  if (redFlagLogs.length > 0) {
    const lastRedFlag = redFlagLogs[0];
    highlights.push({
      tone: "alert",
      title: "Red-flag stool logged",
      detail: `${lastRedFlag.color ?? "Red-flag"} stool appears in this period and should be reviewed in context.`,
    });
  }

  if (longestNoPoopStreak >= 2) {
    highlights.push({
      tone: "caution",
      title: "No-poop streak recorded",
      detail: `Longest marked no-poop streak was ${longestNoPoopStreak} day${longestNoPoopStreak !== 1 ? "s" : ""}.`,
    });
  }

  if (hardStoolCount >= 2) {
    highlights.push({
      tone: "caution",
      title: "Hard stool pattern",
      detail: `${hardStoolCount} stool entr${hardStoolCount === 1 ? "y" : "ies"} were Type 1-2 during this period.`,
    });
  }

  if (looseStoolCount >= 2) {
    highlights.push({
      tone: "alert",
      title: "Loose stool pattern",
      detail: `${looseStoolCount} stool entr${looseStoolCount === 1 ? "y" : "ies"} were Type 6-7 during this period.`,
    });
  }

  if (data.diaperStats.darkUrine > 0) {
    highlights.push({
      tone: "caution",
      title: "Dark urine diaper logged",
      detail: `${data.diaperStats.darkUrine} diaper${data.diaperStats.darkUrine === 1 ? "" : "s"} included dark urine during this period.`,
    });
  }

  if (activeEpisode) {
    highlights.push({
      tone: "info",
      title: "Active episode in progress",
      detail: `${getEpisodeTypeLabel(activeEpisode.episode.episode_type)} is still active with ${activeEpisode.events.length} update${activeEpisode.events.length !== 1 ? "s" : ""}.`,
    });
  } else if (data.episodeGroups.length > 0) {
    highlights.push({
      tone: "info",
      title: "Episode history recorded",
      detail: `${data.episodeGroups.length} episode${data.episodeGroups.length !== 1 ? "s" : ""} captured in this date range.`,
    });
  }

  if (severeSymptoms.length > 0) {
    highlights.push({
      tone: "alert",
      title: "Severe symptom logged",
      detail: `${getSymptomTypeLabel(severeSymptoms[0].symptom_type)} was marked severe during this period.`,
    });
  } else if (strainingCount >= 2) {
    highlights.push({
      tone: "caution",
      title: "Repeated straining logged",
      detail: `${strainingCount} straining symptom entr${strainingCount === 1 ? "y" : "ies"} were recorded in this period.`,
    });
  }

  if (latestMilestone && highlights.length < 4) {
    highlights.push({
      tone: "info",
      title: "Recent context milestone logged",
      detail: `${getMilestoneTypeLabel(latestMilestone.milestone_type)} was recorded on ${formatDate(latestMilestone.logged_at)}.`,
    });
  }

  if (highlights.length === 0) {
    highlights.push({
      tone: "info",
      title: "All key bowel metrics stayed within the logged normal range",
      detail: "This period does not include red-flag colors, marked no-poop streaks, severe symptoms, or episode activity.",
    });
  }

  return highlights.slice(0, 4);
}

function buildDashboardStats(input: {
  reportKind: ReportKind;
  stoolEvents: ReportStoolEvent[];
  diaperStats: ReportDiaperStats;
  feedingLogs: FeedingEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  dayCount: number;
  unitSystem: UnitSystem;
}): ReportDashboardStat[] {
  const actualPoops = input.stoolEvents.filter((log) => log.is_no_poop === 0);
  const avgStoolsPerDay = actualPoops.length / input.dayCount;
  const longestNoPoopStreak = getLongestNoPoopStreak(input.stoolEvents);
  const noPoopMarkers = input.stoolEvents.filter((log) => log.is_no_poop === 1).length;
  const feedSessionsPerDay = input.feedingLogs.length / input.dayCount;
  const bottleVolumePerDay = input.feedingLogs.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0) / input.dayCount;
  const breastfeedingMinutesPerDay = input.feedingLogs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0) / input.dayCount;
  const severeSymptoms = input.symptomLogs.filter((log) => log.severity === "severe").length;

  const stats: ReportDashboardStat[] = [
    {
      label: "Avg stools / day",
      value: avgStoolsPerDay.toFixed(avgStoolsPerDay >= 1 ? 1 : 2),
      detail: `${actualPoops.length} stool${actualPoops.length === 1 ? "" : "s"} logged`,
    },
    {
      label: "No-poop markers",
      value: noPoopMarkers > 0 ? String(noPoopMarkers) : "None",
      detail: longestNoPoopStreak > 0
        ? `Longest streak ${longestNoPoopStreak} day${longestNoPoopStreak === 1 ? "" : "s"}`
        : "No marked no-poop days",
    },
    {
      label: "Dirty diapers",
      value: String(input.diaperStats.dirty),
      detail: `${input.diaperStats.mixed} mixed diaper${input.diaperStats.mixed === 1 ? "" : "s"} included`,
    },
    {
      label: "Wet diapers",
      value: String(input.diaperStats.wet),
      detail: input.diaperStats.darkUrine > 0
        ? `${input.diaperStats.darkUrine} dark urine diaper${input.diaperStats.darkUrine === 1 ? "" : "s"}`
        : `${input.diaperStats.total} total diaper${input.diaperStats.total === 1 ? "" : "s"} logged`,
    },
  ];

  if (input.reportKind === "poopTummy") {
    if (input.feedingLogs.length > 0) {
      stats.push({
        label: "Feed sessions / day",
        value: feedSessionsPerDay.toFixed(feedSessionsPerDay >= 1 ? 1 : 2),
        detail: `${input.feedingLogs.length} feed${input.feedingLogs.length === 1 ? "" : "s"} in range`,
      });
    }
    return stats.slice(0, 6);
  }

  stats.push(
    {
      label: "Feed sessions / day",
      value: feedSessionsPerDay.toFixed(feedSessionsPerDay >= 1 ? 1 : 2),
      detail: `${input.feedingLogs.length} feed${input.feedingLogs.length === 1 ? "" : "s"} in range`,
    },
  );

  if (bottleVolumePerDay > 0) {
    stats.push({
      label: "Bottle volume / day",
      value: formatVolumeValue(bottleVolumePerDay, input.unitSystem, { maximumFractionDigits: input.unitSystem === "imperial" ? 1 : 0 }),
      detail: "Only logged bottle amounts are counted",
    });
  } else if (breastfeedingMinutesPerDay > 0) {
    stats.push({
      label: "Breastfeeding duration / day",
      value: `${Math.round(breastfeedingMinutesPerDay)} min`,
      detail: "Only logged durations are counted",
    });
  }

  if (input.activeEpisodeGroup) {
    stats.push({
      label: "Active episode",
      value: getEpisodeTypeLabel(input.activeEpisodeGroup.episode.episode_type),
      detail: `${input.activeEpisodeGroup.events.length} update${input.activeEpisodeGroup.events.length === 1 ? "" : "s"} in range`,
    });
  }

  if (severeSymptoms > 0) {
    stats.push({
      label: "Severe symptoms",
      value: String(severeSymptoms),
      detail: "Review symptom details on page 2",
    });
  } else if (input.growthLogs.length > 0) {
    stats.push({
      label: "Growth entries",
      value: String(input.growthLogs.length),
      detail: "Recent measurements included",
    });
  }

  return stats.slice(0, 6);
}

function buildLegacyStats(logs: ReportStoolEvent[], dayCount: number) {
  const actualPoops = logs.filter((log) => log.is_no_poop === 0);
  const typeCounts = new Map<number, number>();
  const colorCounts = new Map<string, number>();

  for (const log of actualPoops) {
    if (log.stool_type !== null) {
      typeCounts.set(log.stool_type, (typeCounts.get(log.stool_type) ?? 0) + 1);
    }
    if (log.color) {
      colorCounts.set(log.color, (colorCounts.get(log.color) ?? 0) + 1);
    }
  }

  const mostCommonType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostCommonColor = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalPoops: actualPoops.length,
    totalNoPoop: logs.filter((log) => log.is_no_poop === 1).length,
    avgPerDay: Number((actualPoops.length / dayCount).toFixed(actualPoops.length / dayCount >= 1 ? 1 : 2)),
    mostCommonType,
    mostCommonColor,
  };
}

function buildChartData(
  endDate: string,
  stoolEvents: ReportStoolEvent[],
  diaperLogs: DiaperEntry[],
  feedingLogs: FeedingEntry[],
  symptomLogs: SymptomEntry[],
  unitSystem: UnitSystem,
) {
  const dates = buildLastNDates(endDate, 7);
  const actualPoopsWithType = stoolEvents
    .filter((log) => log.is_no_poop === 0 && log.stool_type !== null)
    .sort((left, right) => (left.logged_at < right.logged_at ? -1 : 1))
    .slice(-7);

  return {
    stoolOutput: dates.map((day) => ({
      label: formatShortDayLabel(day),
      primaryValue: stoolEvents.filter((log) => dateKey(log.logged_at) === day && log.is_no_poop === 0).length,
      secondaryValue: stoolEvents.filter((log) => dateKey(log.logged_at) === day && log.is_no_poop === 1).length,
    })),
    diaperOutput: dates.map((day) => ({
      label: formatShortDayLabel(day),
      primaryValue: diaperLogs.filter((log) => dateKey(log.logged_at) === day && hasUrineInDiaper(log)).length,
      secondaryValue: diaperLogs.filter((log) => dateKey(log.logged_at) === day && hasStoolInDiaper(log)).length,
    })),
    feedActivity: dates.map((day) => {
      const dayFeeds = feedingLogs.filter((log) => dateKey(log.logged_at) === day);
      return {
        label: formatShortDayLabel(day),
        primaryValue: dayFeeds.length,
        secondaryValue: volumeMlToDisplay(dayFeeds.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0), unitSystem),
      };
    }),
    stoolConsistency: actualPoopsWithType.map((log) => ({
      label: formatShortChartDateLabel(log.logged_at),
      primaryValue: log.stool_type ?? 0,
    })),
    symptomActivity: dates.map((day) => ({
      label: formatShortDayLabel(day),
      primaryValue: symptomLogs.filter((log) => dateKey(log.logged_at) === day).length,
    })),
  };
}

function getSymptomSeverityRank(severity: SymptomEntry["severity"]): number {
  if (severity === "severe") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function formatReportSymptom(log: SymptomEntry, unitSystem: UnitSystem): string {
  const detailParts = [
    getSymptomSeverityLabel(log.severity),
    log.temperature_c !== null ? formatTemperatureValue(log.temperature_c, getDefaultTemperatureUnit(unitSystem)) : null,
    log.temperature_c !== null ? getTemperatureMethodLabel(log.temperature_method)?.toLowerCase() : null,
  ].filter(Boolean);

  return detailParts.length > 0
    ? `${getSymptomTypeLabel(log.symptom_type)} (${detailParts.join(", ")})`
    : getSymptomTypeLabel(log.symptom_type);
}

function buildLinkedSymptomSummary(symptoms: SymptomEntry[], unitSystem: UnitSystem): string | null {
  if (symptoms.length === 0) return null;

  const sortedSymptoms = [...symptoms].sort((left, right) => {
    const severityDiff = getSymptomSeverityRank(right.severity) - getSymptomSeverityRank(left.severity);
    if (severityDiff !== 0) return severityDiff;
    return left.logged_at < right.logged_at ? 1 : -1;
  });
  const shown = sortedSymptoms.slice(0, 3).map((log) => formatReportSymptom(log, unitSystem));
  const remaining = sortedSymptoms.length - shown.length;

  return remaining > 0
    ? `${shown.join("; ")}; +${remaining} more`
    : shown.join("; ");
}

function buildContextSections(input: {
  reportKind: ReportKind;
  stoolEvents: ReportStoolEvent[];
  diaperLogs: DiaperEntry[];
  diaperStats: ReportDiaperStats;
  feedingLogs: FeedingEntry[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  options: ReportOptions;
  dayCount: number;
  unitSystem: UnitSystem;
}): ReportContextSection[] {
  const sections: ReportContextSection[] = [];
  const episodeById = new Map(input.episodeGroups.map((group) => [group.episode.id, group.episode]));
  const actualStoolEvents = input.stoolEvents.filter((log) => log.is_no_poop === 0);
  const hardStoolCount = actualStoolEvents.filter((log) => (log.stool_type ?? 99) <= 2).length;
  const looseStoolCount = actualStoolEvents.filter((log) => (log.stool_type ?? 0) >= 6).length;
  const redFlagCount = actualStoolEvents.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return Boolean(colorInfo?.isRedFlag);
  }).length;
  const noPoopCount = input.stoolEvents.filter((log) => log.is_no_poop === 1).length;
  const stoolPhotoCount = actualStoolEvents.filter((log) => Boolean(log.photo_path)).length;

  sections.push({
    title: input.reportKind === "poopTummy" ? "Poop & Tummy Summary" : "Bowel Pattern Summary",
    emptyText: "No poop or diaper activity was logged in this date range.",
    rows: [
      {
        title: "Stool events",
        detail: `${actualStoolEvents.length} stool event${actualStoolEvents.length === 1 ? "" : "s"} across ${input.dayCount} day${input.dayCount === 1 ? "" : "s"}`,
      },
      {
        title: "No-poop markers",
        detail: noPoopCount > 0
          ? `${noPoopCount} no-poop marker${noPoopCount === 1 ? "" : "s"}; longest streak ${getLongestNoPoopStreak(input.stoolEvents)} day${getLongestNoPoopStreak(input.stoolEvents) === 1 ? "" : "s"}`
          : "No marked no-poop days in this range",
      },
      {
        title: "Consistency pattern",
        detail: [
          `${hardStoolCount} hard Type 1-2`,
          `${looseStoolCount} loose Type 6-7`,
          redFlagCount > 0 ? `${redFlagCount} red-flag color${redFlagCount === 1 ? "" : "s"}` : "No red-flag colors logged",
        ].join(" · "),
      },
      {
        title: "Photo context",
        detail: input.options.includePhotos
          ? `${stoolPhotoCount + input.diaperStats.photoCount} poop or diaper photo${stoolPhotoCount + input.diaperStats.photoCount === 1 ? "" : "s"} attached`
          : "Photos excluded from this report",
      },
    ],
  });

  if (input.diaperLogs.length > 0 || input.reportKind === "poopTummy") {
    sections.push({
      title: "Diaper Output",
      emptyText: "No diaper entries were logged in this date range.",
      rows: [
        {
          title: "Wet output",
          detail: `${input.diaperStats.wet} wet diaper${input.diaperStats.wet === 1 ? "" : "s"} logged`,
        },
        {
          title: "Dirty output",
          detail: `${input.diaperStats.dirty} dirty diaper${input.diaperStats.dirty === 1 ? "" : "s"} logged`,
        },
        {
          title: "Mixed diapers",
          detail: `${input.diaperStats.mixed} mixed diaper${input.diaperStats.mixed === 1 ? "" : "s"} included both urine and stool`,
        },
        {
          title: "Urine color watch",
          detail: input.diaperStats.darkUrine > 0
            ? `${input.diaperStats.darkUrine} dark urine diaper${input.diaperStats.darkUrine === 1 ? "" : "s"} logged`
            : "No dark urine diapers logged",
        },
      ],
    });
  }

  if (input.options.includeEpisodeSummary || input.options.includeEpisodes) {
    const rows = input.activeEpisodeGroup
      ? (() => {
          const linkedSymptoms = input.symptomLogs.filter((log) => log.episode_id === input.activeEpisodeGroup?.episode.id);
          const linkedSymptomSummary = buildLinkedSymptomSummary(linkedSymptoms, input.unitSystem);
          const latestEvent = [...input.activeEpisodeGroup.events].sort((left, right) => (left.logged_at < right.logged_at ? 1 : -1))[0] ?? null;
          return [
            {
              title: `${getEpisodeTypeLabel(input.activeEpisodeGroup.episode.episode_type)} (active)`,
              meta: `Started ${formatDate(input.activeEpisodeGroup.episode.started_at)}`,
              detail: [
                input.activeEpisodeGroup.episode.summary ? `Summary: ${input.activeEpisodeGroup.episode.summary}` : null,
                linkedSymptomSummary ? `Linked symptoms: ${linkedSymptomSummary}` : "No linked symptoms logged",
                `${input.activeEpisodeGroup.events.length} update${input.activeEpisodeGroup.events.length === 1 ? "" : "s"} in range`,
                latestEvent ? `Latest update: ${latestEvent.title} on ${formatDate(latestEvent.logged_at)}` : null,
                input.activeEpisodeGroup.episode.outcome ? `Outcome: ${input.activeEpisodeGroup.episode.outcome}` : null,
              ].filter(Boolean).join(" · "),
            },
          ];
        })()
      : input.episodeGroups.slice(0, 3).map(({ episode, events }) => {
          const linkedSymptomSummary = buildLinkedSymptomSummary(
            input.symptomLogs.filter((log) => log.episode_id === episode.id),
            input.unitSystem,
          );
          const latestEvent = [...events].sort((left, right) => (left.logged_at < right.logged_at ? 1 : -1))[0] ?? null;
          return {
            title: getEpisodeTypeLabel(episode.episode_type),
            meta: [
              episode.status === "active" ? "Active" : "Resolved",
              `Started ${formatDate(episode.started_at)}`,
              episode.ended_at ? `Ended ${formatDate(episode.ended_at)}` : null,
            ].filter(Boolean).join(" · "),
            detail: [
              linkedSymptomSummary ? `Linked symptoms: ${linkedSymptomSummary}` : "No linked symptoms logged",
              `${events.length} update${events.length === 1 ? "" : "s"} in range`,
              latestEvent ? `Latest update: ${latestEvent.title} on ${formatDate(latestEvent.logged_at)}` : null,
              episode.outcome ? `Outcome: ${episode.outcome}` : null,
            ].filter(Boolean).join(" · "),
          };
        });

    if (rows.length > 0) {
      sections.push({
        title: "Episode Context",
        emptyText: "No episode activity was logged in this date range.",
        rows,
      });
    }
  }

  if (input.options.includeSymptoms && input.symptomLogs.length > 0) {
    sections.push({
      title: "Symptoms",
      emptyText: "No symptoms were logged in this date range.",
      rows: input.symptomLogs.slice(0, 6).map((log) => ({
        title: getSymptomTypeLabel(log.symptom_type),
        meta: `${getSymptomSeverityLabel(log.severity)} · ${formatDate(log.logged_at)}`,
        detail: [
          log.temperature_c !== null ? formatTemperatureValue(log.temperature_c, getDefaultTemperatureUnit(input.unitSystem)) : null,
          getTemperatureMethodLabel(log.temperature_method),
          log.episode_id ? `In ${getEpisodeTypeLabel(episodeById.get(log.episode_id)?.episode_type ?? "other")}` : null,
          log.notes,
        ].filter(Boolean).join(" • ") || undefined,
      })),
    });
  }

  sections.push({
    title: "Report Note",
    emptyText: "",
    rows: [{
      title: "Tracking summary only",
      detail: "This report is a tracking summary from Tiny Tummy. It does not diagnose or replace medical advice.",
    }],
  });

  if (input.options.includeFeeds && input.feedingLogs.length > 0) {
    const avgFeedSessions = input.feedingLogs.length / input.dayCount;
    const avgBottleVolume = input.feedingLogs.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0) / input.dayCount;
    const avgDuration = input.feedingLogs.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0) / input.dayCount;
    const rows: ReportContextRow[] = [
      {
        title: "Average feed sessions per day",
        detail: avgFeedSessions.toFixed(avgFeedSessions >= 1 ? 1 : 2),
      },
    ];

    if (avgBottleVolume > 0) {
      rows.push({
        title: "Average bottle volume per day",
        detail: formatVolumeValue(avgBottleVolume, input.unitSystem, { maximumFractionDigits: input.unitSystem === "imperial" ? 1 : 0 }),
      });
    }

    if (avgDuration > 0) {
      rows.push({
        title: "Average breastfeeding duration per day",
        detail: `${Math.round(avgDuration)} min`,
      });
    }

    rows.push(
      ...input.feedingLogs.slice(0, 4).map((log) => ({
        title: getFeedingEntryDisplayLabel(log, input.unitSystem),
        meta: formatDate(log.logged_at),
        detail: log.reaction_notes ?? log.notes ?? undefined,
      })),
    );

    sections.push({
      title: "Feeding Summary",
      emptyText: "No feeds or meals were logged in this date range.",
      rows,
    });
  }

  if (input.options.includeGrowth && input.growthLogs.length > 0) {
    sections.push({
      title: "Growth Measurements",
      emptyText: "No growth entries were logged in this date range.",
      rows: input.growthLogs.slice(0, 6).map((log) => ({
        title: [
          log.weight_kg !== null ? formatGrowthValue("weight_kg", log.weight_kg, input.unitSystem, { maximumFractionDigits: 2 }) : null,
          log.height_cm !== null ? formatGrowthValue("height_cm", log.height_cm, input.unitSystem, { maximumFractionDigits: 1 }) : null,
          log.head_circumference_cm !== null ? `HC ${formatGrowthValue("head_circumference_cm", log.head_circumference_cm, input.unitSystem, { maximumFractionDigits: 1 })}` : null,
        ].filter(Boolean).join(" · "),
        meta: formatDate(log.measured_at),
        detail: log.notes ?? undefined,
      })),
    });
  }

  if (input.options.includeMilestones && input.milestoneLogs.length > 0) {
    sections.push({
      title: "Milestones & Context",
      emptyText: "No milestones were logged in this date range.",
      rows: input.milestoneLogs.slice(0, 5).map((log) => ({
        title: getMilestoneTypeLabel(log.milestone_type),
        meta: formatDate(log.logged_at),
        detail: log.notes ?? undefined,
      })),
    });
  }

  return sections;
}

function buildTimeline(input: {
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  options: ReportOptions;
  unitSystem: UnitSystem;
}): ReportTimelineRow[] {
  const rows: Array<ReportTimelineRow & { sortAt: string }> = [];
  const episodeById = new Map(input.episodeGroups.map((group) => [group.episode.id, group.episode]));
  const linkedSymptomKeys = new Set(
    input.symptomLogs
      .filter((symptom) => symptom.episode_id)
      .map((symptom) => `${symptom.episode_id}:${symptom.logged_at}`),
  );

  for (const log of getVisiblePoopLogs(input.logs, input.diaperLogs)) {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    rows.push({
      sortAt: log.logged_at,
      dateTime: formatDate(log.logged_at),
      eventType: "Stool",
      details: log.is_no_poop
        ? "Marked as no-poop day"
        : [
            log.stool_type ? `Type ${log.stool_type}` : "Logged stool",
            log.color ? `Color ${log.color}` : null,
            log.size ? `Size ${log.size}` : null,
            colorInfo?.isRedFlag ? "Red-flag color" : null,
          ].filter(Boolean).join(" · "),
      note: input.options.includeNotes ? log.notes ?? undefined : undefined,
    });
  }

  for (const log of input.diaperLogs) {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    rows.push({
      sortAt: log.logged_at,
      dateTime: formatDate(log.logged_at),
      eventType: hasStoolInDiaper(log) ? "Stool + diaper" : "Diaper",
      details: [
        log.diaper_type === "mixed" ? "Mixed diaper" : log.diaper_type === "dirty" ? "Dirty diaper" : "Wet diaper",
        hasStoolInDiaper(log) && log.stool_type ? `Type ${log.stool_type}` : null,
        hasStoolInDiaper(log) && log.color ? `Color ${log.color}` : null,
        hasStoolInDiaper(log) && log.size ? `Size ${log.size}` : null,
        hasUrineInDiaper(log) && log.urine_color ? `Urine ${log.urine_color}` : null,
        colorInfo?.isRedFlag ? "Red-flag color" : null,
      ].filter(Boolean).join(" · "),
      note: input.options.includeNotes ? log.notes ?? undefined : undefined,
    });
  }

  if (input.options.includeFeeds) {
    for (const log of input.feedingLogs) {
      rows.push({
        sortAt: log.logged_at,
        dateTime: formatDate(log.logged_at),
        eventType: "Feed",
        details: getFeedingEntryDisplayLabel(log, input.unitSystem),
        note: input.options.includeNotes ? log.reaction_notes ?? log.notes ?? undefined : undefined,
      });
    }
  }

  if (input.options.includeSleepContext) {
    for (const log of input.sleepLogs) {
      const durationMinutes = Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000));
      rows.push({
        sortAt: log.started_at,
        dateTime: formatDate(log.started_at),
        eventType: "Sleep",
        details: [
          log.sleep_type === "night" ? "Night sleep" : "Nap",
          durationMinutes > 0 ? `${durationMinutes} min` : null,
        ].filter(Boolean).join(" · "),
        note: input.options.includeNotes ? log.notes ?? undefined : undefined,
      });
    }
  }

  if (input.options.includeSymptoms) {
    for (const log of input.symptomLogs) {
      rows.push({
        sortAt: log.logged_at,
        dateTime: formatDate(log.logged_at),
        eventType: "Symptom",
        details: [
          getSymptomTypeLabel(log.symptom_type),
          getSymptomSeverityLabel(log.severity),
          log.temperature_c !== null ? formatTemperatureValue(log.temperature_c, getDefaultTemperatureUnit(input.unitSystem)) : null,
          getTemperatureMethodLabel(log.temperature_method),
          log.episode_id ? `In ${getEpisodeTypeLabel(episodeById.get(log.episode_id)?.episode_type ?? "other")}` : null,
        ].filter(Boolean).join(" · "),
        note: input.options.includeNotes ? log.notes ?? undefined : undefined,
      });
    }
  }

  if (input.options.includeMilestones) {
    for (const log of input.milestoneLogs) {
      rows.push({
        sortAt: log.logged_at,
        dateTime: formatDate(log.logged_at),
        eventType: "Milestone",
        details: getMilestoneTypeLabel(log.milestone_type),
        note: input.options.includeNotes ? log.notes ?? undefined : undefined,
      });
    }
  }

  if (input.options.includeGrowth) {
    for (const log of input.growthLogs) {
      rows.push({
        sortAt: log.measured_at,
        dateTime: formatDate(log.measured_at),
        eventType: "Growth",
        details: [
          log.weight_kg !== null ? formatGrowthValue("weight_kg", log.weight_kg, input.unitSystem, { maximumFractionDigits: 2 }) : null,
          log.height_cm !== null ? formatGrowthValue("height_cm", log.height_cm, input.unitSystem, { maximumFractionDigits: 1 }) : null,
          log.head_circumference_cm !== null ? `HC ${formatGrowthValue("head_circumference_cm", log.head_circumference_cm, input.unitSystem, { maximumFractionDigits: 1 })}` : null,
        ].filter(Boolean).join(" · "),
        note: input.options.includeNotes ? log.notes ?? undefined : undefined,
      });
    }
  }

  if (input.options.includeEpisodes) {
    for (const group of input.episodeGroups) {
      rows.push({
        sortAt: group.episode.started_at,
        dateTime: formatDate(group.episode.started_at),
        eventType: "Episode",
        details: `${getEpisodeTypeLabel(group.episode.episode_type)} ${group.episode.status === "active" ? "started" : "recorded"}`,
        note: input.options.includeNotes ? group.episode.summary ?? group.episode.outcome ?? undefined : undefined,
      });

      for (const event of group.events) {
        const isGeneratedSymptomEvent = event.event_type === "symptom"
          && (event.source_kind === "symptom" || linkedSymptomKeys.has(`${event.episode_id}:${event.logged_at}`));
        if (input.options.includeSymptoms && isGeneratedSymptomEvent) continue;

        rows.push({
          sortAt: event.logged_at,
          dateTime: formatDate(event.logged_at),
          eventType: "Episode update",
          details: event.title,
          note: input.options.includeNotes ? event.notes ?? undefined : undefined,
        });
      }
    }
  }

  return rows
    .sort((a, b) => (a.sortAt < b.sortAt ? 1 : -1))
    .map(({ sortAt: _sortAt, ...row }) => row);
}

type PreparedReportSourceData = {
  child: ReportSourceData["child"];
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  growthLogs: GrowthEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  attachments: Attachment[];
  handoffSummary: ReportHandoffSourceData | null;
};

type LegacyReportDataFields = Omit<ReportData, "reportKind" | "reportMode" | "report">;

function isIncludedRow(row: { deleted_at?: string | null }, options: ReportOptions): boolean {
  return options.includeDeleted || !row.deleted_at;
}

function prepareReportSourceData(source: ReportSourceData, options: ReportOptions): PreparedReportSourceData {
  return {
    child: source.child ?? null,
    logs: source.logs.filter((row) => isIncludedRow(row, options)),
    diaperLogs: source.diaperLogs.filter((row) => isIncludedRow(row, options)),
    feedingLogs: source.feedingLogs.filter((row) => isIncludedRow(row, options)),
    sleepLogs: (source.sleepLogs ?? []).filter((row) => isIncludedRow(row, options)),
    growthLogs: source.growthLogs.filter((row) => isIncludedRow(row, options)),
    episodes: source.episodes.filter((row) => isIncludedRow(row, options)),
    episodeEvents: source.episodeEvents.filter((row) => isIncludedRow(row, options)),
    symptomLogs: source.symptomLogs.filter((row) => isIncludedRow(row, options)),
    milestoneLogs: source.milestoneLogs.filter((row) => isIncludedRow(row, options)),
    attachments: (source.attachments ?? []).filter((row) => isIncludedRow(row, options)),
    handoffSummary: source.handoffSummary ?? null,
  };
}

function scrubReportPhotos(source: PreparedReportSourceData, includePhotos: boolean): PreparedReportSourceData {
  if (includePhotos) return source;

  return {
    ...source,
    logs: source.logs.map((log) => ({ ...log, photo_path: null })),
    diaperLogs: source.diaperLogs.map((log) => ({ ...log, photo_path: null })),
  };
}

function buildLegacyReportDataFields(
  source: PreparedReportSourceData,
  startDate: string,
  endDate: string,
  options: ReportOptions,
  unitSystem: UnitSystem,
  reportKind: ReportKind,
): LegacyReportDataFields {
  const dayCount = getDateRangeLength(startDate, endDate);
  const stoolEvents = buildReportStoolEvents(source.logs, source.diaperLogs);
  const diaperStats = buildDiaperStats(source.diaperLogs);
  const episodeGroups: EpisodeReportGroup[] = source.episodes.map((episode) => ({
    episode,
    events: source.episodeEvents.filter((event) => event.episode_id === episode.id),
  }));
  const activeEpisodeGroup = episodeGroups.find((group) => group.episode.status === "active") ?? null;

  return {
    logs: source.logs,
    diaperLogs: source.diaperLogs,
    stoolEvents,
    diaperStats,
    feedingLogs: source.feedingLogs,
    sleepLogs: source.sleepLogs,
    growthLogs: source.growthLogs,
    episodeGroups,
    activeEpisodeGroup,
    symptomLogs: source.symptomLogs,
    milestoneLogs: source.milestoneLogs,
    photoUrls: {},
    highlights: buildReportHighlights({
      stoolEvents,
      diaperStats,
      feedingLogs: source.feedingLogs,
      episodeGroups,
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
    }),
    stats: buildLegacyStats(stoolEvents, dayCount),
    dashboardStats: buildDashboardStats({
      reportKind,
      stoolEvents,
      diaperStats,
      feedingLogs: source.feedingLogs,
      symptomLogs: source.symptomLogs,
      growthLogs: source.growthLogs,
      activeEpisodeGroup,
      dayCount,
      unitSystem,
    }),
    chartData: buildChartData(endDate, stoolEvents, source.diaperLogs, source.feedingLogs, source.symptomLogs, unitSystem),
    contextSections: buildContextSections({
      reportKind,
      stoolEvents,
      diaperLogs: source.diaperLogs,
      diaperStats,
      feedingLogs: source.feedingLogs,
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
      growthLogs: source.growthLogs,
      episodeGroups,
      activeEpisodeGroup,
      options,
      dayCount,
      unitSystem,
    }),
    timeline: buildTimeline({
      logs: source.logs,
      diaperLogs: source.diaperLogs,
      feedingLogs: source.feedingLogs,
      sleepLogs: source.sleepLogs,
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
      growthLogs: source.growthLogs,
      episodeGroups,
      options,
      unitSystem,
    }),
  };
}

function collectReportDateKeys(source: ReportSourceData): string[] {
  return [
    ...source.logs.map((row) => dateKey(row.logged_at)),
    ...source.diaperLogs.map((row) => dateKey(row.logged_at)),
    ...source.feedingLogs.map((row) => dateKey(row.logged_at)),
    ...(source.sleepLogs ?? []).map((row) => dateKey(row.started_at)),
    ...source.growthLogs.map((row) => dateKey(row.measured_at)),
    ...source.episodes.map((row) => dateKey(row.started_at)),
    ...source.episodeEvents.map((row) => dateKey(row.logged_at)),
    ...source.symptomLogs.map((row) => dateKey(row.logged_at)),
    ...source.milestoneLogs.map((row) => dateKey(row.logged_at)),
  ].filter(Boolean);
}

function resolveReportDateRange(source: ReportSourceData, options: Partial<ReportOptions>): ReportDateRange {
  if (options.dateRange?.start && options.dateRange.end) return options.dateRange;

  const dates = collectReportDateKeys(source).sort();
  if (dates.length > 0) {
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  const today = formatLocalDateKey(new Date());
  return { start: today, end: today };
}

function countActiveDays(legacyData: LegacyReportDataFields): number {
  return new Set([
    ...legacyData.stoolEvents.map((row) => dateKey(row.logged_at)),
    ...legacyData.diaperLogs.map((row) => dateKey(row.logged_at)),
    ...legacyData.feedingLogs.map((row) => dateKey(row.logged_at)),
    ...legacyData.sleepLogs.map((row) => dateKey(row.started_at)),
    ...legacyData.growthLogs.map((row) => dateKey(row.measured_at)),
    ...legacyData.symptomLogs.map((row) => dateKey(row.logged_at)),
    ...legacyData.milestoneLogs.map((row) => dateKey(row.logged_at)),
    ...legacyData.episodeGroups.map((group) => dateKey(group.episode.started_at)),
    ...legacyData.episodeGroups.flatMap((group) => group.events.map((row) => dateKey(row.logged_at))),
  ]).size;
}

function buildReportDataQuality(legacyData: LegacyReportDataFields, options: ReportOptions): ReportDataQuality {
  const totalDays = getDateRangeLength(options.dateRange?.start ?? "", options.dateRange?.end ?? "");
  const activeDays = countActiveDays(legacyData);
  const loggedEventCount = legacyData.stoolEvents.length
    + legacyData.diaperLogs.length
    + legacyData.feedingLogs.length
    + legacyData.sleepLogs.length
    + legacyData.growthLogs.length
    + legacyData.symptomLogs.length
    + legacyData.milestoneLogs.length
    + legacyData.episodeGroups.length
    + legacyData.episodeGroups.reduce((sum, group) => sum + group.events.length, 0);
  const sparseThreshold = Math.max(2, Math.ceil(totalDays / 3));
  const isSparse = activeDays < sparseThreshold;
  const notes = [
    isSparse
      ? "Logging is sparse for this date range; dated events may be more useful than averages."
      : "Logging coverage supports short-term pattern review for the selected range.",
    options.includeDeleted
      ? "Soft-deleted rows were explicitly included."
      : "Soft-deleted rows are excluded.",
  ];

  return {
    totalDays,
    activeDays,
    loggedEventCount,
    isSparse,
    includesDeleted: options.includeDeleted,
    notes,
  };
}

function buildReportChildSummary(source: PreparedReportSourceData, options: ReportOptions): ReportChildSummary {
  return {
    id: source.child?.id ?? options.childId ?? "",
    name: source.child?.name ?? null,
    dateOfBirth: source.child?.date_of_birth ?? null,
    sex: source.child?.sex ?? null,
    feedingType: source.child?.feeding_type ?? null,
  };
}

function buildReportId(options: ReportOptions): string {
  const childId = options.childId || "child";
  const start = options.dateRange?.start || "start";
  const end = options.dateRange?.end || "end";
  const generatedAt = (options.generatedAt ?? "").replace(/[^0-9A-Za-z]/g, "").slice(0, 14) || "local";
  return `report-${options.mode}-${childId}-${start}-${end}-${generatedAt}`;
}

function makeSection(
  id: ReportSectionId,
  title: string,
  rows: ReportSectionRow[],
  summary?: string,
): TinyTummyReportSection {
  return { id, title, summary, rows };
}

function toneFromCount(count: number, cautionAt = 1): ReportSectionTone {
  return count >= cautionAt ? "caution" : "healthy";
}

function getRedFlagStoolCount(stoolEvents: ReportStoolEvent[]): number {
  return stoolEvents.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return log.is_no_poop === 0 && Boolean(colorInfo?.isRedFlag);
  }).length;
}

function getStoolColorLabel(color: string | null): string {
  if (!color) return "Color not recorded";
  return STOOL_COLORS.find((item) => item.value === color)?.label ?? color;
}

function buildPoopSummarySection(legacyData: LegacyReportDataFields, options: ReportOptions): TinyTummyReportSection {
  const actualStools = legacyData.stoolEvents.filter((log) => log.is_no_poop === 0);
  const redFlagCount = getRedFlagStoolCount(legacyData.stoolEvents);
  const latestStool = actualStools[0] ?? null;
  const photoCount = actualStools.filter((log) => Boolean(log.photo_path)).length;

  return makeSection("poopSummary", "Poop Summary", [
    {
      label: "Stool events",
      value: String(actualStools.length),
      detail: `${legacyData.stats.avgPerDay} average per day`,
    },
    {
      label: "No-poop days",
      value: String(legacyData.stats.totalNoPoop),
      detail: `Longest marked streak ${getLongestNoPoopStreak(legacyData.stoolEvents)} day${getLongestNoPoopStreak(legacyData.stoolEvents) === 1 ? "" : "s"}`,
      tone: toneFromCount(legacyData.stats.totalNoPoop),
    },
    {
      label: "Most common type",
      value: legacyData.stats.mostCommonType ? `Type ${legacyData.stats.mostCommonType}` : "Not recorded",
      detail: "Based on logged stool type values",
    },
    {
      label: "Most common colour",
      value: getStoolColorLabel(legacyData.stats.mostCommonColor),
      detail: redFlagCount > 0 ? `${redFlagCount} red-flag colour entr${redFlagCount === 1 ? "y" : "ies"}` : "No red-flag colours logged",
      tone: redFlagCount > 0 ? "alert" : "healthy",
    },
    {
      label: "Latest stool",
      value: latestStool ? formatDate(latestStool.logged_at) : "None in range",
      detail: latestStool
        ? [
            latestStool.stool_type ? `Type ${latestStool.stool_type}` : "Type not recorded",
            getStoolColorLabel(latestStool.color),
            latestStool.size ? `Size ${latestStool.size}` : null,
          ].filter(Boolean).join(" · ")
        : "No stool events were logged in this date range.",
    },
    {
      label: "Photo policy",
      value: options.includePhotos ? `${photoCount} photo reference${photoCount === 1 ? "" : "s"}` : "Photos excluded",
      detail: "Photo bytes are not embedded in report data.",
    },
  ]);
}

function buildDiaperSummarySection(legacyData: LegacyReportDataFields): TinyTummyReportSection {
  return makeSection("diaperSummary", "Diaper Summary", [
    {
      label: "Wet diapers",
      value: String(legacyData.diaperStats.wet),
      detail: "Wet or mixed diaper logs",
    },
    {
      label: "Dirty diapers",
      value: String(legacyData.diaperStats.dirty),
      detail: "Dirty or mixed diaper logs",
    },
    {
      label: "Mixed diapers",
      value: String(legacyData.diaperStats.mixed),
      detail: "Wet and dirty in the same change",
    },
    {
      label: "Dark urine",
      value: legacyData.diaperStats.darkUrine > 0 ? String(legacyData.diaperStats.darkUrine) : "None",
      detail: "Urine colour is parent-observed and should be reviewed with context.",
      tone: toneFromCount(legacyData.diaperStats.darkUrine),
    },
  ]);
}

function buildFeedingContextSection(legacyData: LegacyReportDataFields, unitSystem: UnitSystem): TinyTummyReportSection | undefined {
  if (legacyData.feedingLogs.length === 0) return undefined;

  const latestFeed = legacyData.feedingLogs[0];
  return makeSection("feedingContext", "Feeding Context", [
    {
      label: "Feed logs",
      value: String(legacyData.feedingLogs.length),
      detail: "Included as context only.",
    },
    {
      label: "Latest feed",
      value: latestFeed ? formatDate(latestFeed.logged_at) : "None",
      detail: latestFeed ? getFeedingEntryDisplayLabel(latestFeed, unitSystem) : undefined,
    },
  ]);
}

function buildSleepContextSection(legacyData: LegacyReportDataFields): TinyTummyReportSection | undefined {
  if (legacyData.sleepLogs.length === 0) return undefined;

  const latestSleep = legacyData.sleepLogs[0];
  const totalMinutes = legacyData.sleepLogs.reduce((sum, log) => {
    const started = new Date(log.started_at).getTime();
    const ended = new Date(log.ended_at).getTime();
    return sum + Math.max(0, Math.round((ended - started) / 60000));
  }, 0);

  return makeSection("sleepContext", "Sleep Context", [
    {
      label: "Sleep logs",
      value: String(legacyData.sleepLogs.length),
      detail: `${totalMinutes} total logged minutes`,
    },
    {
      label: "Latest sleep",
      value: latestSleep ? formatDate(latestSleep.started_at) : "None",
      detail: latestSleep ? (latestSleep.sleep_type === "night" ? "Night sleep" : "Nap") : undefined,
    },
  ]);
}

function buildSymptomsSummarySection(
  legacyData: LegacyReportDataFields,
  options: ReportOptions,
  unitSystem: UnitSystem,
): TinyTummyReportSection | undefined {
  if (legacyData.symptomLogs.length === 0) return undefined;

  const severeCount = legacyData.symptomLogs.filter((log) => log.severity === "severe").length;
  return makeSection("symptomsSummary", "Symptoms Summary", [
    {
      label: "Symptoms",
      value: String(legacyData.symptomLogs.length),
      detail: severeCount > 0 ? `${severeCount} marked severe` : "No severe symptoms logged",
      tone: severeCount > 0 ? "alert" : "info",
    },
    ...legacyData.symptomLogs.slice(0, 5).map((log) => ({
      label: getSymptomTypeLabel(log.symptom_type),
      value: getSymptomSeverityLabel(log.severity),
      detail: formatReportSymptom(log, unitSystem),
      at: log.logged_at,
      sourceId: log.id,
      sourceType: "symptom",
      caregiverId: options.includeCaregiverAttribution ? log.created_by_caregiver_id ?? null : undefined,
      tone: log.severity === "severe" ? "alert" as const : log.severity === "moderate" ? "caution" as const : "info" as const,
    })),
  ]);
}

function buildEpisodeSummarySection(
  legacyData: LegacyReportDataFields,
  options: ReportOptions,
): TinyTummyReportSection | undefined {
  if (legacyData.episodeGroups.length === 0) return undefined;

  return makeSection("episodeSummary", "Episode Summary", legacyData.episodeGroups.slice(0, 5).map((group) => ({
    label: getEpisodeTypeLabel(group.episode.episode_type),
    value: group.episode.status === "active" ? "Active" : "Resolved",
    detail: [
      `Started ${formatDate(group.episode.started_at)}`,
      group.episode.ended_at ? `Ended ${formatDate(group.episode.ended_at)}` : null,
      `${group.events.length} update${group.events.length === 1 ? "" : "s"}`,
      group.episode.summary,
      group.episode.outcome,
    ].filter(Boolean).join(" · "),
    at: group.episode.started_at,
    sourceId: group.episode.id,
    sourceType: "episode",
    caregiverId: options.includeCaregiverAttribution ? group.episode.created_by_caregiver_id ?? null : undefined,
    tone: group.episode.status === "active" ? "caution" : "info",
  })));
}

function buildGrowthContextSection(
  legacyData: LegacyReportDataFields,
  options: ReportOptions,
  unitSystem: UnitSystem,
): TinyTummyReportSection | undefined {
  if (legacyData.growthLogs.length === 0) return undefined;

  return makeSection("growthContext", "Growth Context", legacyData.growthLogs.slice(0, 4).map((log) => ({
    label: "Growth check-in",
    value: formatDate(log.measured_at),
    detail: [
      log.weight_kg !== null ? formatGrowthValue("weight_kg", log.weight_kg, unitSystem, { maximumFractionDigits: 2 }) : null,
      log.height_cm !== null ? formatGrowthValue("height_cm", log.height_cm, unitSystem, { maximumFractionDigits: 1 }) : null,
      log.head_circumference_cm !== null ? `HC ${formatGrowthValue("head_circumference_cm", log.head_circumference_cm, unitSystem, { maximumFractionDigits: 1 })}` : null,
      log.notes,
    ].filter(Boolean).join(" · "),
    at: log.measured_at,
    sourceId: log.id,
    sourceType: "growth",
    caregiverId: options.includeCaregiverAttribution ? log.created_by_caregiver_id ?? null : undefined,
  })));
}

function buildMilestonesContextSection(
  legacyData: LegacyReportDataFields,
  options: ReportOptions,
): TinyTummyReportSection | undefined {
  if (legacyData.milestoneLogs.length === 0) return undefined;

  return makeSection("milestonesContext", "Milestones Context", legacyData.milestoneLogs.slice(0, 5).map((log) => ({
    label: getMilestoneTypeLabel(log.milestone_type),
    value: formatDate(log.logged_at),
    detail: log.notes ?? undefined,
    at: log.logged_at,
    sourceId: log.id,
    sourceType: "milestone",
    caregiverId: options.includeCaregiverAttribution ? log.created_by_caregiver_id ?? null : undefined,
  })));
}

function formatLastPoopForHandoff(log: PoopEntry | ReportStoolEvent | null): string {
  if (!log) return "No poop logged";
  return [
    log.stool_type ? `Type ${log.stool_type}` : "Type not recorded",
    getStoolColorLabel(log.color),
    "size" in log && log.size ? `Size ${log.size}` : null,
  ].filter(Boolean).join(" · ");
}

function buildCaregiverHandoffSection(
  legacyData: LegacyReportDataFields,
  source: PreparedReportSourceData,
  unitSystem: UnitSystem,
): TinyTummyReportSection {
  const handoff = source.handoffSummary;
  const lastPoop = handoff?.lastPoop ?? legacyData.stoolEvents.find((log) => log.is_no_poop === 0) ?? null;
  const lastWetDiaper = handoff?.lastWetDiaper ?? legacyData.diaperLogs.find(hasUrineInDiaper) ?? null;
  const lastFeed = handoff?.lastFeed ?? legacyData.feedingLogs[0] ?? null;
  const lastSleep = handoff?.lastSleep ?? legacyData.sleepLogs[0] ?? null;
  const activeEpisode = handoff?.activeEpisode ?? legacyData.activeEpisodeGroup?.episode ?? null;
  const recentSymptoms = handoff?.recentSymptoms ?? legacyData.symptomLogs.slice(0, 3);
  const dayLabel = handoff?.dayKey ?? source.handoffSummary?.dayKey ?? "Selected day";
  const wetCount = handoff?.todayWetDiapers ?? legacyData.diaperStats.wet;
  const dirtyCount = handoff?.todayDirtyDiapers ?? legacyData.diaperStats.dirty;
  const poopCount = handoff?.todayPoops ?? legacyData.stats.totalPoops;
  const feedCount = handoff?.todayFeeds ?? legacyData.feedingLogs.length;

  return makeSection("caregiverHandoff", "Caregiver Handoff", [
    {
      label: "Today",
      value: dayLabel,
      detail: `${poopCount} poop${poopCount === 1 ? "" : "s"} · ${wetCount} wet · ${dirtyCount} dirty · ${feedCount} feed${feedCount === 1 ? "" : "s"}`,
    },
    {
      label: "Last poop",
      value: lastPoop ? formatDate(lastPoop.logged_at) : "None",
      detail: formatLastPoopForHandoff(lastPoop),
    },
    {
      label: "Last wet diaper",
      value: lastWetDiaper ? formatDate(lastWetDiaper.logged_at) : "None",
      detail: lastWetDiaper?.urine_color ? `Urine ${lastWetDiaper.urine_color}` : "Urine colour not recorded",
    },
    {
      label: "Last feed",
      value: lastFeed ? formatDate(lastFeed.logged_at) : "None",
      detail: lastFeed ? getFeedingEntryDisplayLabel(lastFeed, unitSystem) : "No feed logged",
    },
    {
      label: "Last sleep",
      value: lastSleep ? formatDate(lastSleep.started_at) : "None",
      detail: lastSleep ? (lastSleep.sleep_type === "night" ? "Night sleep" : "Nap") : "No sleep logged",
    },
    {
      label: "Active episode",
      value: activeEpisode ? getEpisodeTypeLabel(activeEpisode.episode_type) : "None",
      detail: activeEpisode?.summary ?? "No active episode logged",
      tone: activeEpisode ? "caution" : "healthy",
    },
    {
      label: "Watch items",
      value: [...(handoff?.watchItems ?? []), ...recentSymptoms.map((log) => getSymptomTypeLabel(log.symptom_type))].slice(0, 3).join(", ") || "None",
      detail: "Observational handoff context for the next caregiver.",
    },
  ]);
}

function buildChartsSection(legacyData: LegacyReportDataFields): TinyTummyReportSection {
  return makeSection("charts", "Charts", [
    {
      label: "Stool output",
      value: `${legacyData.chartData.stoolOutput.length} points`,
      detail: "Daily stool/no-poop counts",
    },
    {
      label: "Diaper output",
      value: `${legacyData.chartData.diaperOutput.length} points`,
      detail: "Daily wet/dirty diaper counts",
    },
    {
      label: "Stool consistency",
      value: `${legacyData.chartData.stoolConsistency.length} points`,
      detail: "Recent logged stool type sequence",
    },
  ]);
}

function buildNotesSection(dataQuality: ReportDataQuality, attachmentPolicy: ReportAttachmentPolicy): TinyTummyReportSection {
  return makeSection("notes", "Report Note", [
    {
      label: "Disclaimer",
      value: "Observational tracking summary",
      detail: "This report does not diagnose or replace medical advice.",
    },
    {
      label: "Data quality",
      value: dataQuality.isSparse ? "Sparse logging" : "Logged activity present",
      detail: dataQuality.notes.join(" "),
      tone: dataQuality.isSparse ? "caution" : "info",
    },
    {
      label: "Attachment policy",
      value: attachmentPolicy.includeAttachmentMetadata ? "Metadata only" : "Excluded",
      detail: attachmentPolicy.summary,
    },
  ]);
}

function buildAttachmentMetadataFromPhotos(source: PreparedReportSourceData, options: ReportOptions): ReportAttachmentMetadata[] {
  if (!options.includeAttachmentMetadata) return [];

  const photoRows: ReportAttachmentMetadata[] = [
    ...source.logs
      .filter((log) => Boolean(log.photo_path))
      .map((log) => ({
        ownerTable: "poop_logs",
        ownerId: log.id,
        childId: log.child_id,
        localPath: log.photo_path ?? "",
        mimeType: null,
        fileSize: null,
        createdAt: log.created_at,
        policy: "local_only_metadata" as const,
      })),
    ...source.diaperLogs
      .filter((log) => Boolean(log.photo_path))
      .map((log) => ({
        ownerTable: "diaper_logs",
        ownerId: log.id,
        childId: log.child_id,
        localPath: log.photo_path ?? "",
        mimeType: null,
        fileSize: null,
        createdAt: log.created_at,
        policy: "local_only_metadata" as const,
      })),
  ];

  const attachmentRows = source.attachments.map((attachment) => ({
    ownerTable: attachment.owner_table,
    ownerId: attachment.owner_id,
    childId: attachment.child_id,
    localPath: attachment.local_path,
    mimeType: attachment.mime_type,
    fileSize: attachment.file_size,
    createdAt: attachment.created_at,
    policy: "local_only_metadata" as const,
  }));

  return [...photoRows, ...attachmentRows];
}

function buildReportAttachmentPolicy(source: PreparedReportSourceData, options: ReportOptions): ReportAttachmentPolicy {
  const attachments = buildAttachmentMetadataFromPhotos(source, options);

  return {
    includePhotos: options.includePhotos,
    includeAttachmentMetadata: options.includeAttachmentMetadata,
    localOnly: true,
    summary: options.includeAttachmentMetadata
      ? "Attachment metadata may include local file paths, but photo/file bytes are never embedded in the report DTO."
      : "Photos and attachment metadata are excluded. Photo/file bytes are never embedded in the report DTO.",
    attachments,
  };
}

function shouldIncludeTimelineRow(mode: ReportMode, row: ReportTimelineRow): boolean {
  if (mode === "poop_diaper") return ["Stool", "Stool + diaper", "Diaper"].includes(row.eventType);
  if (mode === "symptoms_episodes") return ["Symptom", "Episode", "Episode update"].includes(row.eventType);
  if (mode === "doctor_brief") return ["Stool", "Stool + diaper", "Diaper", "Symptom", "Episode", "Episode update"].includes(row.eventType);
  return true;
}

function buildStableTimeline(legacyData: LegacyReportDataFields, options: ReportOptions): TinyTummyReportTimelineRow[] {
  if (!options.includeTimeline) return [];

  const mode = options.mode ?? DEFAULT_REPORT_MODE;
  const rows = legacyData.timeline
    .filter((row) => shouldIncludeTimelineRow(mode, row))
    .slice(0, options.maxTimelineRows ?? legacyData.timeline.length);

  return rows.map((row) => ({
    label: row.eventType,
    value: row.dateTime,
    detail: row.details,
    at: row.dateTime,
    eventType: row.eventType,
    tone: row.details.includes("Red-flag") ? "alert" : row.eventType.includes("Episode") || row.eventType === "Symptom" ? "caution" : "default",
  }));
}

function buildQuestionsForReport(legacyData: LegacyReportDataFields, dataQuality: ReportDataQuality, mode: ReportMode): string[] {
  const questions: string[] = [];
  const redFlagCount = getRedFlagStoolCount(legacyData.stoolEvents);
  const looseCount = legacyData.stoolEvents.filter((log) => log.is_no_poop === 0 && (log.stool_type ?? 0) >= 6).length;
  const hardCount = legacyData.stoolEvents.filter((log) => log.is_no_poop === 0 && (log.stool_type ?? 99) <= 2).length;

  if (redFlagCount > 0) {
    questions.push("Which dated stool colour entries should we review together?");
  }
  if (looseCount >= 2 || hardCount >= 2) {
    questions.push("Does the dated stool type pattern fit the child's recent feeding, illness, or medication context?");
  }
  if (legacyData.diaperStats.darkUrine > 0 || legacyData.diaperStats.wet <= 2) {
    questions.push("Is the logged wet diaper output enough for this age and situation?");
  }
  if (legacyData.activeEpisodeGroup) {
    questions.push("Which symptoms or episode changes should prompt same-day follow-up?");
  }
  if (dataQuality.isSparse) {
    questions.push("Which specific events are most useful to keep logging before the visit?");
  }
  if (mode === "doctor_brief" || questions.length === 0) {
    questions.push("What changes should we keep watching and documenting?");
  }

  return questions.slice(0, 5);
}

function getReportModeTitle(mode: ReportMode): string {
  switch (mode) {
    case "doctor_brief":
      return "Doctor Brief";
    case "poop_diaper":
      return "Poop & Diaper Report";
    case "symptoms_episodes":
      return "Symptoms & Episodes Report";
    case "caregiver_handoff":
      return "Caregiver Handoff";
    case "clinical_export":
      return "Clinical Export";
    case "pediatrician_full":
    default:
      return "Pediatrician Full Report";
  }
}

function buildReportBrief(legacyData: LegacyReportDataFields, dataQuality: ReportDataQuality, mode: ReportMode): ReportBrief {
  const actualStools = legacyData.stoolEvents.filter((log) => log.is_no_poop === 0);
  const activeEpisode = legacyData.activeEpisodeGroup?.episode ?? null;
  const recentSymptoms = legacyData.symptomLogs.slice(0, 3).map((log) => getSymptomTypeLabel(log.symptom_type)).join(", ");
  const summaryParts = [
    `${actualStools.length} stool event${actualStools.length === 1 ? "" : "s"}`,
    `${legacyData.diaperStats.wet} wet diaper${legacyData.diaperStats.wet === 1 ? "" : "s"}`,
    `${legacyData.symptomLogs.length} symptom${legacyData.symptomLogs.length === 1 ? "" : "s"}`,
    activeEpisode ? `active ${getEpisodeTypeLabel(activeEpisode.episode_type)} episode` : null,
  ].filter(Boolean);

  return {
    title: getReportModeTitle(mode),
    summary: `${summaryParts.join(", ")}. ${dataQuality.notes[0]}`,
    rows: [
      {
        label: "Report period",
        value: `${dataQuality.totalDays} day${dataQuality.totalDays === 1 ? "" : "s"}`,
        detail: `${dataQuality.activeDays} day${dataQuality.activeDays === 1 ? "" : "s"} with logged activity`,
      },
      {
        label: "Key concern summary",
        value: getRedFlagStoolCount(legacyData.stoolEvents) > 0 ? "Red-flag stool colour logged" : "No red-flag stool colour logged",
        detail: recentSymptoms ? `Recent symptoms: ${recentSymptoms}` : "No recent symptoms in the selected range",
        tone: getRedFlagStoolCount(legacyData.stoolEvents) > 0 ? "alert" : "info",
      },
      {
        label: "Active episode",
        value: activeEpisode ? getEpisodeTypeLabel(activeEpisode.episode_type) : "None",
        detail: activeEpisode?.summary ?? "No active episode logged",
        tone: activeEpisode ? "caution" : "healthy",
      },
      {
        label: "Data quality",
        value: dataQuality.isSparse ? "Sparse" : "Usable",
        detail: dataQuality.notes.join(" "),
        tone: dataQuality.isSparse ? "caution" : "info",
      },
    ],
  };
}

function buildKeyMetricsForMode(legacyData: LegacyReportDataFields, dataQuality: ReportDataQuality, mode: ReportMode): ReportKeyMetric[] {
  const actualStools = legacyData.stoolEvents.filter((log) => log.is_no_poop === 0);
  const redFlagCount = getRedFlagStoolCount(legacyData.stoolEvents);
  const severeSymptoms = legacyData.symptomLogs.filter((log) => log.severity === "severe").length;
  const latestStool = actualStools[0] ?? null;
  const latestWet = legacyData.diaperLogs.find(hasUrineInDiaper) ?? null;
  const latestFeed = legacyData.feedingLogs[0] ?? null;
  const latestSleep = legacyData.sleepLogs[0] ?? null;
  const common: ReportKeyMetric[] = [
    {
      id: "stool_count",
      label: "Stool count",
      value: String(actualStools.length),
      detail: `${legacyData.stats.avgPerDay} per day average`,
      tone: "default",
    },
    {
      id: "wet_diapers",
      label: "Wet diapers",
      value: String(legacyData.diaperStats.wet),
      detail: legacyData.diaperStats.darkUrine > 0 ? "Dark urine logged" : "Wet or mixed diaper output",
      tone: legacyData.diaperStats.darkUrine > 0 ? "caution" : "info",
    },
    {
      id: "red_flag_stools",
      label: "Red-flag stools",
      value: String(redFlagCount),
      detail: "Red, black, or white stool colour entries",
      tone: redFlagCount > 0 ? "alert" : "healthy",
    },
  ];

  if (mode === "doctor_brief") {
    return [
      {
        id: "last_poop",
        label: "Last poop",
        value: latestStool ? formatDate(latestStool.logged_at) : "None",
        detail: formatLastPoopForHandoff(latestStool),
        tone: latestStool ? "default" : "caution",
      },
      {
        id: "last_wet_diaper",
        label: "Last wet diaper",
        value: latestWet ? formatDate(latestWet.logged_at) : "None",
        detail: latestWet?.urine_color ? `Urine ${latestWet.urine_color}` : "Urine colour not recorded",
        tone: latestWet ? "info" : "caution",
      },
      {
        id: "recent_symptoms",
        label: "Recent symptoms",
        value: String(legacyData.symptomLogs.length),
        detail: severeSymptoms > 0 ? `${severeSymptoms} severe` : "No severe symptoms logged",
        tone: severeSymptoms > 0 ? "alert" : "info",
      },
      {
        id: "data_quality",
        label: "Data quality",
        value: dataQuality.isSparse ? "Sparse" : "Usable",
        detail: `${dataQuality.activeDays}/${dataQuality.totalDays} days logged`,
        tone: dataQuality.isSparse ? "caution" : "info",
      },
    ];
  }

  if (mode === "symptoms_episodes") {
    return [
      {
        id: "symptoms",
        label: "Symptoms",
        value: String(legacyData.symptomLogs.length),
        detail: severeSymptoms > 0 ? `${severeSymptoms} severe` : "Severity details included",
        tone: severeSymptoms > 0 ? "alert" : "info",
      },
      {
        id: "episodes",
        label: "Episodes",
        value: String(legacyData.episodeGroups.length),
        detail: legacyData.activeEpisodeGroup ? "Active episode present" : "No active episode",
        tone: legacyData.activeEpisodeGroup ? "caution" : "info",
      },
      {
        id: "episode_updates",
        label: "Episode updates",
        value: String(legacyData.episodeGroups.reduce((sum, group) => sum + group.events.length, 0)),
        detail: "Dated care-context updates",
        tone: "default",
      },
    ];
  }

  if (mode === "caregiver_handoff") {
    return [
      {
        id: "last_poop",
        label: "Last poop",
        value: latestStool ? formatDate(latestStool.logged_at) : "None",
        detail: formatLastPoopForHandoff(latestStool),
        tone: latestStool ? "default" : "caution",
      },
      {
        id: "last_feed",
        label: "Last feed",
        value: latestFeed ? formatDate(latestFeed.logged_at) : "None",
        detail: latestFeed ? "Feed context included" : "No feed logged",
        tone: latestFeed ? "info" : "caution",
      },
      {
        id: "last_sleep",
        label: "Last sleep",
        value: latestSleep ? formatDate(latestSleep.started_at) : "None",
        detail: latestSleep ? (latestSleep.sleep_type === "night" ? "Night sleep" : "Nap") : "No sleep logged",
        tone: latestSleep ? "info" : "caution",
      },
    ];
  }

  return [
    ...common,
    {
      id: "symptoms",
      label: "Symptoms",
      value: String(legacyData.symptomLogs.length),
      detail: severeSymptoms > 0 ? `${severeSymptoms} severe` : "Symptom context",
      tone: severeSymptoms > 0 ? "alert" : "info",
    },
    {
      id: "active_episode",
      label: "Active episode",
      value: legacyData.activeEpisodeGroup ? getEpisodeTypeLabel(legacyData.activeEpisodeGroup.episode.episode_type) : "None",
      detail: legacyData.activeEpisodeGroup ? "Episode details included" : "No active episode",
      tone: legacyData.activeEpisodeGroup ? "caution" : "healthy",
    },
  ];
}

function buildSectionsForMode(
  legacyData: LegacyReportDataFields,
  source: PreparedReportSourceData,
  options: ReportOptions,
  dataQuality: ReportDataQuality,
  attachmentPolicy: ReportAttachmentPolicy,
  unitSystem: UnitSystem,
): TinyTummyReportSections {
  const sections: TinyTummyReportSections = {};
  const add = (section: TinyTummyReportSection | undefined) => {
    if (section) sections[section.id] = section;
  };

  if (options.mode === "caregiver_handoff") {
    add(buildCaregiverHandoffSection(legacyData, source, unitSystem));
    add(buildPoopSummarySection(legacyData, options));
    add(buildDiaperSummarySection(legacyData));
    add(buildNotesSection(dataQuality, attachmentPolicy));
    return sections;
  }

  if (options.mode === "symptoms_episodes") {
    add(buildSymptomsSummarySection(legacyData, options, unitSystem));
    add(buildEpisodeSummarySection(legacyData, options));
    if (options.includeFeedingContext) add(buildFeedingContextSection(legacyData, unitSystem));
    if (options.includeSleepContext) add(buildSleepContextSection(legacyData));
    add(buildNotesSection(dataQuality, attachmentPolicy));
    return sections;
  }

  add(buildPoopSummarySection(legacyData, options));
  add(buildDiaperSummarySection(legacyData));

  if (options.mode === "doctor_brief") {
    add(buildSymptomsSummarySection(legacyData, options, unitSystem));
    add(buildEpisodeSummarySection(legacyData, options));
    add(buildNotesSection(dataQuality, attachmentPolicy));
    return sections;
  }

  if (options.includeSymptoms) add(buildSymptomsSummarySection(legacyData, options, unitSystem));
  if (options.includeEpisodes || options.includeEpisodeSummary) add(buildEpisodeSummarySection(legacyData, options));
  if (options.includeFeedingContext) add(buildFeedingContextSection(legacyData, unitSystem));
  if (options.includeSleepContext) add(buildSleepContextSection(legacyData));
  if (options.includeGrowthContext) add(buildGrowthContextSection(legacyData, options, unitSystem));
  if (options.includeMilestones) add(buildMilestonesContextSection(legacyData, options));

  if (options.mode === "pediatrician_full" || options.mode === "poop_diaper" || options.mode === "clinical_export") {
    add(buildChartsSection(legacyData));
  }

  add(buildNotesSection(dataQuality, attachmentPolicy));
  return sections;
}

function buildTinyTummyReportDataFromLegacy(
  source: PreparedReportSourceData,
  legacyData: LegacyReportDataFields,
  options: ReportOptions,
  unitSystem: UnitSystem,
): TinyTummyReportData {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const resolvedOptions = { ...options, generatedAt };
  const dataQuality = buildReportDataQuality(legacyData, resolvedOptions);
  const attachmentPolicy = buildReportAttachmentPolicy(source, resolvedOptions);
  const mode = resolvedOptions.mode ?? DEFAULT_REPORT_MODE;

  return {
    schemaVersion: "tiny_tummy_report_v1",
    reportId: buildReportId(resolvedOptions),
    mode,
    generatedAt,
    child: buildReportChildSummary(source, resolvedOptions),
    dateRange: resolvedOptions.dateRange ?? { start: "", end: "" },
    dataQuality,
    disclaimer: "Tiny Tummy reports are observational tracking summaries. They do not diagnose, treat, or replace medical advice.",
    brief: buildReportBrief(legacyData, dataQuality, mode),
    keyMetrics: buildKeyMetricsForMode(legacyData, dataQuality, mode),
    sections: buildSectionsForMode(legacyData, source, resolvedOptions, dataQuality, attachmentPolicy, unitSystem),
    timeline: buildStableTimeline(legacyData, resolvedOptions),
    questions: buildQuestionsForReport(legacyData, dataQuality, mode),
    privacyNote: "Generated locally by Tiny Tummy. Data stays on this device unless a caregiver chooses to export or share it.",
    attachmentPolicy,
  };
}

function buildReportForMode(
  mode: ReportMode,
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  const dateRange = resolveReportDateRange(source, options);
  const childId = options.childId ?? source.child?.id ?? source.logs[0]?.child_id ?? source.diaperLogs[0]?.child_id ?? "";
  const normalizedOptions = normalizeReportOptions(options, {
    mode,
    childId,
    dateRange,
  });
  const filteredSource = prepareReportSourceData(source, normalizedOptions);
  const legacySource = scrubReportPhotos(filteredSource, normalizedOptions.includePhotos);
  const legacyData = buildLegacyReportDataFields(
    legacySource,
    normalizedOptions.dateRange?.start ?? dateRange.start,
    normalizedOptions.dateRange?.end ?? dateRange.end,
    normalizedOptions,
    unitSystem,
    getReportKindForMode(mode),
  );

  return buildTinyTummyReportDataFromLegacy(filteredSource, legacyData, normalizedOptions, unitSystem);
}

export function buildPediatricianFullReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("pediatrician_full", source, options, unitSystem);
}

export function buildDoctorBriefReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("doctor_brief", source, options, unitSystem);
}

export function buildPoopDiaperReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("poop_diaper", source, options, unitSystem);
}

export function buildSymptomsEpisodesReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("symptoms_episodes", source, options, unitSystem);
}

export function buildCaregiverHandoffReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("caregiver_handoff", source, options, unitSystem);
}

export function buildClinicalExportReport(
  source: ReportSourceData,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
): TinyTummyReportData {
  return buildReportForMode("clinical_export", source, options, unitSystem);
}

export function buildReportData(
  source: ReportSourceData,
  startDate: string,
  endDate: string,
  options: Partial<ReportOptions> = {},
  unitSystem: UnitSystem = "metric",
  reportKind: ReportKind = DEFAULT_REPORT_KIND,
): ReportData {
  const hasExplicitOptions = Object.keys(options).length > 0;
  const baseOptions = hasExplicitOptions ? options : defaultReportOptions;
  const mode = baseOptions.mode ?? getReportModeForKind(reportKind);
  const normalizedOptions = normalizeReportOptions(baseOptions, {
    mode,
    childId: baseOptions.childId ?? source.child?.id ?? source.logs[0]?.child_id ?? source.diaperLogs[0]?.child_id ?? "",
    dateRange: { start: startDate, end: endDate },
  });
  const filteredSource = prepareReportSourceData(source, normalizedOptions);
  const legacySource = scrubReportPhotos(filteredSource, normalizedOptions.includePhotos);
  const legacyData = buildLegacyReportDataFields(
    legacySource,
    startDate,
    endDate,
    normalizedOptions,
    unitSystem,
    reportKind,
  );

  return {
    reportKind,
    reportMode: normalizedOptions.mode ?? mode,
    report: buildTinyTummyReportDataFromLegacy(filteredSource, legacyData, normalizedOptions, unitSystem),
    ...legacyData,
  };
}
