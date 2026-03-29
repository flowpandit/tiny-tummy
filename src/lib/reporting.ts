import { formatDate } from "./utils";
import { STOOL_COLORS } from "./constants";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getMilestoneTypeLabel } from "./milestone-constants";
import { getSymptomTypeLabel } from "./symptom-constants";
import * as db from "./db";
import { loadPhotoDataUrl } from "./photos";
import type { Episode, EpisodeEvent, FeedingEntry, MilestoneEntry, PoopEntry, SymptomEntry } from "./types";

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
  includeNotes: boolean;
  includeCaregiverNote: boolean;
  includePhotos: boolean;
}

export interface ReportData {
  logs: PoopEntry[];
  feedingLogs: FeedingEntry[];
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
}

export const defaultReportOptions: ReportOptions = {
  includeFeeds: true,
  includeEpisodes: true,
  includeEpisodeSummary: true,
  includeSymptoms: true,
  includeMilestones: true,
  includeNotes: true,
  includeCaregiverNote: true,
  includePhotos: true,
};

function getLongestNoPoopStreak(logs: PoopEntry[]): number {
  const dates = [...new Set(
    logs
      .filter((log) => log.is_no_poop === 1)
      .map((log) => log.logged_at.split("T")[0]),
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

export function buildReportHighlights(data: {
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
      title: "No major changes highlighted",
      detail: "This period does not include red-flag colors, marked no-poop streaks, severe symptoms, or episode activity.",
    });
  }

  return highlights.slice(0, 4);
}

export async function generateReportData(childId: string, startDate: string, endDate: string): Promise<ReportData> {
  const [logs, feedingLogs, episodes, episodeEvents, symptomLogs, milestoneLogs, caregiverNote, stats] = await Promise.all([
    db.getPoopLogsForRange(childId, startDate, endDate),
    db.getFeedingLogsForRange(childId, startDate, endDate),
    db.getEpisodesForRange(childId, startDate, endDate),
    db.getEpisodeEventsForRange(childId, startDate, endDate),
    db.getSymptomsForRange(childId, startDate, endDate),
    db.getMilestonesForRange(childId, startDate, endDate),
    db.getSetting(`handoff_note:${childId}`),
    db.getReportStats(childId, startDate, endDate),
  ]);

  const episodeGroups: EpisodeReportGroup[] = episodes.map((episode) => ({
    episode,
    events: episodeEvents.filter((event) => event.episode_id === episode.id),
  }));
  const activeEpisodeGroup = episodeGroups.find((group) => group.episode.status === "active") ?? null;
  const photoUrls = Object.fromEntries(
    (await Promise.all(
      logs
        .filter((log) => log.photo_path)
        .map(async (log) => {
          try {
            return [log.id, await loadPhotoDataUrl(log.photo_path!)] as const;
          } catch {
            return null;
          }
        }),
    )).filter((entry): entry is readonly [string, string] => entry !== null),
  );

  return {
    logs,
    feedingLogs,
    episodeGroups,
    activeEpisodeGroup,
    symptomLogs,
    milestoneLogs,
    caregiverNote,
    photoUrls,
    highlights: buildReportHighlights({ logs, feedingLogs, episodeGroups, symptomLogs, milestoneLogs }),
    stats,
  };
}
