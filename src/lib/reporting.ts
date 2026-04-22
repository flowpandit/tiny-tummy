import { formatDate, formatLocalDateKey } from "./utils";
import { STOOL_COLORS } from "./constants";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getFeedingEntryDisplayLabel } from "./feeding";
import { getMilestoneTypeLabel } from "./milestone-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "./symptom-constants";
import { formatGrowthValue, formatVolumeValue, volumeMlToDisplay } from "./units";
import * as db from "./db";
import type {
  Episode,
  EpisodeEvent,
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

export interface ReportOptions {
  includeFeeds: boolean;
  includeEpisodes: boolean;
  includeEpisodeSummary: boolean;
  includeSymptoms: boolean;
  includeMilestones: boolean;
  includeGrowth: boolean;
  includeNotes: boolean;
  includeCaregiverNote: boolean;
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

export interface ReportData {
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  caregiverNote: string | null;
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
    feedActivity: ReportChartPoint[];
    stoolConsistency: ReportChartPoint[];
    symptomActivity: ReportChartPoint[];
  };
  contextSections: ReportContextSection[];
  timeline: ReportTimelineRow[];
}

export interface ReportSourceData {
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  growthLogs: GrowthEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  caregiverNote: string | null;
}

export const defaultReportOptions: ReportOptions = {
  includeFeeds: true,
  includeEpisodes: true,
  includeEpisodeSummary: true,
  includeSymptoms: true,
  includeMilestones: true,
  includeGrowth: true,
  includeNotes: true,
  includeCaregiverNote: true,
  includePhotos: true,
};

export async function fetchReportSourceData(
  childId: string,
  startDate: string,
  endDate: string,
  options: ReportOptions = defaultReportOptions,
): Promise<ReportSourceData> {
  const [logs, feedingLogs, episodes, episodeEvents, symptomLogs, milestoneLogs, caregiverNote, growthLogs] = await Promise.all([
    db.getPoopLogsForRange(childId, startDate, endDate),
    db.getFeedingLogsForRange(childId, startDate, endDate),
    db.getEpisodesForRange(childId, startDate, endDate),
    db.getEpisodeEventsForRange(childId, startDate, endDate),
    db.getSymptomsForRange(childId, startDate, endDate),
    db.getMilestonesForRange(childId, startDate, endDate),
    db.getSetting(`handoff_note:${childId}`),
    options.includeGrowth ? db.getGrowthLogsForRange(childId, startDate, endDate) : Promise.resolve([]),
  ]);

  return {
    logs,
    feedingLogs,
    growthLogs,
    episodes,
    episodeEvents,
    symptomLogs,
    milestoneLogs,
    caregiverNote,
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

function getLongestNoPoopStreak(logs: PoopEntry[]): number {
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
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  episodeGroups: EpisodeReportGroup[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
}): ReportHighlight[] {
  const highlights: ReportHighlight[] = [];
  const redFlagLogs = data.logs.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return log.is_no_poop === 0 && colorInfo?.isRedFlag;
  });
  const hardStoolCount = data.logs.filter((log) => (log.stool_type ?? 99) <= 2).length;
  const looseStoolCount = data.logs.filter((log) => (log.stool_type ?? 0) >= 6).length;
  const longestNoPoopStreak = getLongestNoPoopStreak(data.logs);
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
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  dayCount: number;
  unitSystem: UnitSystem;
}): ReportDashboardStat[] {
  const actualPoops = input.logs.filter((log) => log.is_no_poop === 0);
  const avgStoolsPerDay = actualPoops.length / input.dayCount;
  const longestNoPoopStreak = getLongestNoPoopStreak(input.logs);
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
      label: "Feed sessions / day",
      value: feedSessionsPerDay.toFixed(feedSessionsPerDay >= 1 ? 1 : 2),
      detail: `${input.feedingLogs.length} feed${input.feedingLogs.length === 1 ? "" : "s"} in range`,
    },
  ];

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

function buildLegacyStats(logs: PoopEntry[], dayCount: number) {
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
  logs: PoopEntry[],
  feedingLogs: FeedingEntry[],
  symptomLogs: SymptomEntry[],
  unitSystem: UnitSystem,
) {
  const dates = buildLastNDates(endDate, 7);
  const actualPoopsWithType = logs
    .filter((log) => log.is_no_poop === 0 && log.stool_type !== null)
    .sort((left, right) => (left.logged_at < right.logged_at ? -1 : 1))
    .slice(-7);

  return {
    stoolOutput: dates.map((day) => ({
      label: formatShortDayLabel(day),
      primaryValue: logs.filter((log) => dateKey(log.logged_at) === day && log.is_no_poop === 0).length,
      secondaryValue: logs.filter((log) => dateKey(log.logged_at) === day && log.is_no_poop === 1).length,
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
  feedingLogs: FeedingEntry[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  caregiverNote: string | null;
  options: ReportOptions;
  dayCount: number;
  unitSystem: UnitSystem;
}): ReportContextSection[] {
  const sections: ReportContextSection[] = [];

  if (input.options.includeEpisodeSummary || input.options.includeEpisodes) {
    const rows = input.activeEpisodeGroup
      ? [
          {
            title: `${getEpisodeTypeLabel(input.activeEpisodeGroup.episode.episode_type)} (active)`,
            meta: `Started ${formatDate(input.activeEpisodeGroup.episode.started_at)}`,
            detail: [
              input.activeEpisodeGroup.episode.summary,
              input.activeEpisodeGroup.events[0]
                ? `Latest update: ${input.activeEpisodeGroup.events[0].title} on ${formatDate(input.activeEpisodeGroup.events[0].logged_at)}`
                : null,
              input.activeEpisodeGroup.episode.outcome ? `Outcome: ${input.activeEpisodeGroup.episode.outcome}` : null,
            ].filter(Boolean).join(" "),
          },
        ]
      : input.episodeGroups.slice(0, 3).map(({ episode, events }) => ({
          title: getEpisodeTypeLabel(episode.episode_type),
          meta: `${episode.status === "active" ? "Active" : "Resolved"} · ${formatDate(episode.started_at)}`,
          detail: `${events.length} update${events.length === 1 ? "" : "s"} in range`,
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
        detail: log.notes ?? undefined,
      })),
    });
  }

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

  if (input.options.includeCaregiverNote && input.caregiverNote) {
    sections.push({
      title: "Caregiver Note",
      emptyText: "No caregiver note was included for this report.",
      rows: input.caregiverNote ? [{ title: "Parent handoff note", detail: input.caregiverNote }] : [],
    });
  }

  return sections;
}

function buildTimeline(input: {
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  growthLogs: GrowthEntry[];
  episodeGroups: EpisodeReportGroup[];
  options: ReportOptions;
  unitSystem: UnitSystem;
}): ReportTimelineRow[] {
  const rows: Array<ReportTimelineRow & { sortAt: string }> = [];

  for (const log of input.logs) {
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
        details: `${getSymptomTypeLabel(log.symptom_type)} · ${getSymptomSeverityLabel(log.severity)}`,
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
): ReportData {
  const dayCount = getDateRangeLength(startDate, endDate);
  const episodeGroups: EpisodeReportGroup[] = source.episodes.map((episode) => ({
    episode,
    events: source.episodeEvents.filter((event) => event.episode_id === episode.id),
  }));
  const activeEpisodeGroup = episodeGroups.find((group) => group.episode.status === "active") ?? null;

  return {
    logs: source.logs,
    feedingLogs: source.feedingLogs,
    growthLogs: source.growthLogs,
    episodeGroups,
    activeEpisodeGroup,
    symptomLogs: source.symptomLogs,
    milestoneLogs: source.milestoneLogs,
    caregiverNote: source.caregiverNote,
    photoUrls: {},
    highlights: buildReportHighlights({
      logs: source.logs,
      feedingLogs: source.feedingLogs,
      episodeGroups,
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
    }),
    stats: buildLegacyStats(source.logs, dayCount),
    dashboardStats: buildDashboardStats({
      logs: source.logs,
      feedingLogs: source.feedingLogs,
      symptomLogs: source.symptomLogs,
      growthLogs: source.growthLogs,
      activeEpisodeGroup,
      dayCount,
      unitSystem,
    }),
    chartData: buildChartData(endDate, source.logs, source.feedingLogs, source.symptomLogs, unitSystem),
    contextSections: buildContextSections({
      feedingLogs: source.feedingLogs,
      symptomLogs: source.symptomLogs,
      milestoneLogs: source.milestoneLogs,
      growthLogs: source.growthLogs,
      episodeGroups,
      activeEpisodeGroup,
      caregiverNote: source.caregiverNote,
      options,
      dayCount,
      unitSystem,
    }),
    timeline: buildTimeline({
      logs: source.logs,
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
): Promise<ReportData> {
  const source = await fetchReportSourceData(childId, startDate, endDate, options);
  return buildReportData(source, startDate, endDate, options, unitSystem);
}
