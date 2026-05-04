import { formatDate, formatLocalDateKey } from "./utils";
import { STOOL_COLORS } from "./constants";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getFeedingEntryDisplayLabel } from "./feeding";
import { getMilestoneTypeLabel } from "./milestone-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "./symptom-constants";
import { formatGrowthValue, formatTemperatureValue, formatVolumeValue, getDefaultTemperatureUnit, volumeMlToDisplay } from "./units";
import * as db from "./db";
import type {
  Episode,
  EpisodeEvent,
  DiaperEntry,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
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

export type ReportKind = "poopTummy" | "fullHealth";

export const DEFAULT_REPORT_KIND: ReportKind = "poopTummy";

export interface ReportOptions {
  includeFeeds: boolean;
  includeEpisodes: boolean;
  includeEpisodeSummary: boolean;
  includeSymptoms: boolean;
  includeMilestones: boolean;
  includeGrowth: boolean;
  includeNotes: boolean;
  includePhotos: boolean;
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
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  stoolEvents: ReportStoolEvent[];
  diaperStats: ReportDiaperStats;
  feedingLogs: FeedingEntry[];
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
  logs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  growthLogs: GrowthEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
}

export const defaultReportOptions: ReportOptions = {
  includeFeeds: true,
  includeEpisodes: true,
  includeEpisodeSummary: true,
  includeSymptoms: true,
  includeMilestones: true,
  includeGrowth: true,
  includeNotes: true,
  includePhotos: true,
};

export const defaultPoopTummyReportOptions: ReportOptions = {
  includeFeeds: true,
  includeEpisodes: true,
  includeEpisodeSummary: true,
  includeSymptoms: true,
  includeMilestones: false,
  includeGrowth: false,
  includeNotes: true,
  includePhotos: true,
};

export function getDefaultReportOptionsForKind(reportKind: ReportKind): ReportOptions {
  return reportKind === "poopTummy"
    ? { ...defaultPoopTummyReportOptions }
    : { ...defaultReportOptions };
}

export async function fetchReportSourceData(
  childId: string,
  startDate: string,
  endDate: string,
  options: ReportOptions = defaultReportOptions,
): Promise<ReportSourceData> {
  const [logs, diaperLogs, feedingLogs, episodes, episodeEvents, symptomLogs, milestoneLogs, growthLogs] = await Promise.all([
    db.getPoopLogsForRange(childId, startDate, endDate),
    db.getDiaperLogsForRange(childId, startDate, endDate),
    db.getFeedingLogsForRange(childId, startDate, endDate),
    db.getEpisodesForRange(childId, startDate, endDate),
    db.getEpisodeEventsForRange(childId, startDate, endDate),
    db.getSymptomsForRange(childId, startDate, endDate),
    db.getMilestonesForRange(childId, startDate, endDate),
    options.includeGrowth ? db.getGrowthLogsForRange(childId, startDate, endDate) : Promise.resolve([]),
  ]);

  return {
    logs,
    diaperLogs,
    feedingLogs,
    growthLogs,
    episodes,
    episodeEvents,
    symptomLogs,
    milestoneLogs,
  };
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
  return logs.filter((log) => !linkedPoopIds.has(log.id));
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
      label: "Longest no-poop streak",
      value: longestNoPoopStreak > 0 ? `${longestNoPoopStreak}d` : "None",
      detail: longestNoPoopStreak > 0 ? "Based on marked no-poop days" : "No streak logged",
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
      ? [
          {
            title: `${getEpisodeTypeLabel(input.activeEpisodeGroup.episode.episode_type)} (active)`,
            meta: `Started ${formatDate(input.activeEpisodeGroup.episode.started_at)}`,
            detail: [
              input.activeEpisodeGroup.episode.summary,
              `${input.symptomLogs.filter((log) => log.episode_id === input.activeEpisodeGroup?.episode.id).length} linked symptom${input.symptomLogs.filter((log) => log.episode_id === input.activeEpisodeGroup?.episode.id).length === 1 ? "" : "s"}`,
              `${input.activeEpisodeGroup.events.length} update${input.activeEpisodeGroup.events.length === 1 ? "" : "s"} in range`,
              input.activeEpisodeGroup.events[0]
                ? `Latest update: ${input.activeEpisodeGroup.events[0].title} on ${formatDate(input.activeEpisodeGroup.events[0].logged_at)}`
                : null,
              input.activeEpisodeGroup.episode.outcome ? `Outcome: ${input.activeEpisodeGroup.episode.outcome}` : null,
            ].filter(Boolean).join(" "),
          },
        ]
      : input.episodeGroups.slice(0, 3).map(({ episode, events }) => ({
          title: getEpisodeTypeLabel(episode.episode_type),
          meta: [
            episode.status === "active" ? "Active" : "Resolved",
            `Started ${formatDate(episode.started_at)}`,
            episode.ended_at ? `Ended ${formatDate(episode.ended_at)}` : null,
          ].filter(Boolean).join(" · "),
          detail: [
            `${input.symptomLogs.filter((log) => log.episode_id === episode.id).length} linked symptom${input.symptomLogs.filter((log) => log.episode_id === episode.id).length === 1 ? "" : "s"}`,
            `${events.length} update${events.length === 1 ? "" : "s"} in range`,
            events[0] ? `Latest update: ${events[0].title}` : null,
            episode.outcome ? `Outcome: ${episode.outcome}` : null,
          ].filter(Boolean).join(" · "),
        }));

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

export function buildReportData(
  source: ReportSourceData,
  startDate: string,
  endDate: string,
  options: ReportOptions = defaultReportOptions,
  unitSystem: UnitSystem = "metric",
  reportKind: ReportKind = DEFAULT_REPORT_KIND,
): ReportData {
  const dayCount = getDateRangeLength(startDate, endDate);
  const stoolEvents = buildReportStoolEvents(source.logs, source.diaperLogs);
  const diaperStats = buildDiaperStats(source.diaperLogs);
  const episodeGroups: EpisodeReportGroup[] = source.episodes.map((episode) => ({
    episode,
    events: source.episodeEvents.filter((event) => event.episode_id === episode.id),
  }));
  const activeEpisodeGroup = episodeGroups.find((group) => group.episode.status === "active") ?? null;

  return {
    reportKind,
    logs: source.logs,
    diaperLogs: source.diaperLogs,
    stoolEvents,
    diaperStats,
    feedingLogs: source.feedingLogs,
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
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
      growthLogs: source.growthLogs,
      episodeGroups,
      options,
      unitSystem,
    }),
  };
}

export async function generateReportData(
  childId: string,
  startDate: string,
  endDate: string,
  options: ReportOptions = defaultReportOptions,
  unitSystem: UnitSystem = "metric",
  reportKind: ReportKind = DEFAULT_REPORT_KIND,
): Promise<ReportData> {
  const source = await fetchReportSourceData(childId, startDate, endDate, options);
  return buildReportData(source, startDate, endDate, options, unitSystem, reportKind);
}
