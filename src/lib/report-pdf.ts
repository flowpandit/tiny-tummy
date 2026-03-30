import type { Child } from "./types";
import type { ReportData, ReportOptions } from "./reporting";
import { BITSS_TYPES, STOOL_COLORS } from "./constants";
import {
  getEpisodeEventTypeLabel,
  getEpisodeTypeLabel,
} from "./episode-constants";
import {
  getFeedingEntryDisplayLabel,
  getFeedingEntrySecondaryText,
} from "./feeding";
import { getMilestoneTypeLabel } from "./milestone-constants";
import {
  getSymptomSeverityLabel,
  getSymptomTypeLabel,
} from "./symptom-constants";
import { formatDate, getAgeLabelFromDob } from "./utils";

export interface ReportPdfPayload {
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  stats: ReportPdfStat[];
  highlights: ReportPdfHighlight[];
  sections: ReportPdfSection[];
}

interface ReportPdfStat {
  label: string;
  value: string;
}

interface ReportPdfHighlight {
  title: string;
  detail: string;
}

interface ReportPdfSection {
  title: string;
  emptyText: string;
  entries: ReportPdfEntry[];
}

interface ReportPdfEntry {
  title: string;
  meta?: string;
  body?: string;
  imageDataUrl?: string;
}

function typeLabel(type: number) {
  return BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
}

function colorLabel(color: string) {
  return STOOL_COLORS.find((c) => c.value === color)?.label ?? color;
}

function compact(parts: Array<string | null | undefined | false>): string | undefined {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(" - ") : undefined;
}

export function buildReportPdfPayload(input: {
  child: Child;
  startDate: string;
  endDate: string;
  data: ReportData;
  options: ReportOptions;
}): ReportPdfPayload {
  const { child, startDate, endDate, data, options } = input;
  const sections: ReportPdfSection[] = [];

  if (options.includeCaregiverNote) {
    sections.push({
      title: "Caregiver Note",
      emptyText: "No caregiver note for this report.",
      entries: data.caregiverNote
        ? [
            {
              title: "Caregiver handoff",
              body: data.caregiverNote,
            },
          ]
        : [],
    });
  }

  if (options.includeEpisodeSummary) {
    sections.push({
      title: "Active Episode Summary",
      emptyText: "No active episode in this report.",
      entries: data.activeEpisodeGroup
        ? [
            {
              title: getEpisodeTypeLabel(data.activeEpisodeGroup.episode.episode_type),
              meta: compact([
                "Active",
                `Started ${formatDate(data.activeEpisodeGroup.episode.started_at)}`,
              ]),
              body: compact([
                data.activeEpisodeGroup.episode.summary ?? undefined,
                data.activeEpisodeGroup.events[0]
                  ? `Latest update: ${data.activeEpisodeGroup.events[0].title} - ${formatDate(data.activeEpisodeGroup.events[0].logged_at)}`
                  : undefined,
                data.activeEpisodeGroup.episode.outcome
                  ? `Outcome: ${data.activeEpisodeGroup.episode.outcome}`
                  : undefined,
              ]),
            },
          ]
        : [],
    });
  }

  sections.push({
    title: `Log Entries (${data.logs.length})`,
    emptyText: "No entries in this date range.",
    entries: data.logs.map((log) => ({
      title: log.is_no_poop
        ? "No poop"
        : log.stool_type
          ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
          : "Logged stool",
      meta: compact([
        formatDate(log.logged_at),
        log.color ? `Color: ${colorLabel(log.color)}` : undefined,
        log.size ? `Size: ${log.size}` : undefined,
        log.color && STOOL_COLORS.find((c) => c.value === log.color)?.isRedFlag ? "Red flag" : undefined,
      ]),
      body: options.includeNotes ? log.notes ?? undefined : undefined,
    })),
  });

  if (options.includeFeeds) {
    sections.push({
      title: `Feeds & Meals (${data.feedingLogs.length})`,
      emptyText: "No feeds or meals in this date range.",
      entries: data.feedingLogs.map((log) => ({
        title: getFeedingEntryDisplayLabel(log),
        meta: formatDate(log.logged_at),
        body: options.includeNotes ? getFeedingEntrySecondaryText(log) ?? undefined : undefined,
      })),
    });
  }

  if (options.includeSymptoms) {
    sections.push({
      title: `Symptoms (${data.symptomLogs.length})`,
      emptyText: "No symptoms in this date range.",
      entries: data.symptomLogs.map((log) => ({
        title: getSymptomTypeLabel(log.symptom_type),
        meta: compact([
          formatDate(log.logged_at),
          getSymptomSeverityLabel(log.severity),
          log.episode_id ? "Episode-linked" : "Standalone",
        ]),
        body: options.includeNotes ? log.notes ?? undefined : undefined,
      })),
    });
  }

  if (options.includeMilestones) {
    sections.push({
      title: `Milestones (${data.milestoneLogs.length})`,
      emptyText: "No milestones in this date range.",
      entries: data.milestoneLogs.map((log) => ({
        title: getMilestoneTypeLabel(log.milestone_type),
        meta: formatDate(log.logged_at),
        body: options.includeNotes ? log.notes ?? undefined : undefined,
      })),
    });
  }

  if (options.includePhotos) {
    sections.push({
      title: "Photos",
      emptyText: "No photos in this date range.",
      entries: data.logs
        .filter((log) => log.photo_path && data.photoUrls[log.id])
        .map((log) => ({
          title: formatDate(log.logged_at),
          meta: compact([
            log.is_no_poop
              ? "No poop day"
              : log.stool_type
                ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
                : "Logged stool",
            log.color ? `Color: ${colorLabel(log.color)}` : undefined,
          ]),
          body: options.includeNotes ? log.notes ?? undefined : undefined,
          imageDataUrl: data.photoUrls[log.id],
        })),
    });
  }

  if (options.includeEpisodes) {
    sections.push({
      title: `Episodes (${data.episodeGroups.length})`,
      emptyText: "No episodes in this date range.",
      entries: data.episodeGroups.map(({ episode, events }) => ({
        title: getEpisodeTypeLabel(episode.episode_type),
        meta: compact([
          episode.status === "active" ? "Active" : "Resolved",
          formatDate(episode.started_at),
          episode.ended_at ? `Ended ${formatDate(episode.ended_at)}` : undefined,
        ]),
        body: compact([
          options.includeNotes ? episode.summary ?? undefined : undefined,
          options.includeNotes && episode.outcome ? `Outcome: ${episode.outcome}` : undefined,
          events.length > 0
            ? `Updates: ${events
                .map((event) =>
                  compact([
                    event.title,
                    getEpisodeEventTypeLabel(event.event_type),
                    formatDate(event.logged_at),
                    options.includeNotes ? event.notes ?? undefined : undefined,
                  ]),
                )
                .filter(Boolean)
                .join(" | ")}`
            : undefined,
        ]),
      })),
    });
  }

  return {
    title: `${child.name} Report`,
    subtitle: `${getAgeLabelFromDob(child.date_of_birth)} - ${startDate} to ${endDate}`,
    generatedAtLabel: `Generated by Tiny Tummy on ${new Date().toLocaleDateString()}`,
    stats: [
      { label: "Total poops", value: String(data.stats.totalPoops) },
      { label: "Avg per day", value: String(data.stats.avgPerDay) },
      {
        label: "Most common type",
        value: data.stats.mostCommonType ? typeLabel(data.stats.mostCommonType) : "N/A",
      },
      {
        label: "Most common color",
        value: data.stats.mostCommonColor ? colorLabel(data.stats.mostCommonColor) : "N/A",
      },
      ...(data.stats.totalNoPoop > 0
        ? [{ label: "No-poop days", value: String(data.stats.totalNoPoop) }]
        : []),
      ...(data.feedingLogs.length > 0
        ? [{ label: "Feeds logged", value: String(data.feedingLogs.length) }]
        : []),
      ...(data.symptomLogs.length > 0
        ? [{ label: "Symptoms logged", value: String(data.symptomLogs.length) }]
        : []),
      ...(data.episodeGroups.length > 0
        ? [{ label: "Episodes captured", value: String(data.episodeGroups.length) }]
        : []),
      ...(data.milestoneLogs.length > 0
        ? [{ label: "Milestones logged", value: String(data.milestoneLogs.length) }]
        : []),
    ],
    highlights: data.highlights.map((highlight) => ({
      title: highlight.title,
      detail: highlight.detail,
    })),
    sections,
  };
}
