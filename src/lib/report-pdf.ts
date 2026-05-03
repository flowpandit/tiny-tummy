import type { Child, UnitSystem } from "./types";
import type {
  ReportChartPoint,
  ReportContextSection,
  ReportDashboardStat,
  ReportData,
  ReportHighlight,
  ReportTimelineRow,
} from "./reporting";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getMilestoneTypeLabel } from "./milestone-constants";
import { getAgeLabelFromDob } from "./utils";

export interface ReportPdfPayload {
  title: string;
  subtitle: string;
  childName: string;
  childMeta: string;
  childAvatarColor: string;
  childAvatarDataUrl?: string | null;
  generatedAtLabel: string;
  patientSummary: string;
  attentionChips: ReportPdfChip[];
  dashboardStats: ReportPdfStat[];
  summaryCards: ReportPdfSummaryCard[];
  charts: ReportPdfChart[];
  contextSections: ReportPdfSection[];
  timeline: ReportPdfTimelineRow[];
}

export interface ReportPdfChip {
  tone: "alert" | "caution" | "info";
  text: string;
  detail: string;
}

export interface ReportPdfStat {
  label: string;
  value: string;
  detail?: string;
}

export interface ReportPdfSummaryCard {
  title: string;
  value: string;
  detail: string;
  tone: "default" | "alert" | "caution" | "info" | "healthy";
}

export interface ReportPdfChart {
  title: string;
  kind: "bar" | "line";
  primaryLabel: string;
  secondaryLabel?: string;
  points: ReportPdfChartPoint[];
}

export interface ReportPdfChartPoint {
  label: string;
  primaryValue: number;
  secondaryValue?: number;
}

export interface ReportPdfSection {
  title: string;
  emptyText: string;
  rows: ReportPdfSectionRow[];
}

export interface ReportPdfSectionRow {
  title: string;
  meta?: string;
  detail?: string;
}

export interface ReportPdfTimelineRow {
  dateTime: string;
  eventType: string;
  details: string;
  note?: string;
}

function mapStats(stats: ReportDashboardStat[]): ReportPdfStat[] {
  return stats.slice(0, 4).map((stat) => ({
    label: stat.label,
    value: stat.value,
    detail: stat.detail,
  }));
}

function mapPoints(points: ReportChartPoint[]): ReportPdfChartPoint[] {
  return points.map((point) => ({
    label: point.label,
    primaryValue: point.primaryValue,
    secondaryValue: point.secondaryValue,
  }));
}

function mapSections(sections: ReportContextSection[]): ReportPdfSection[] {
  return sections.map((section) => ({
    title: section.title,
    emptyText: section.emptyText,
    rows: section.rows.map((row) => ({
      title: row.title,
      meta: row.meta,
      detail: row.detail,
    })),
  }));
}

function mapTimeline(rows: ReportTimelineRow[]): ReportPdfTimelineRow[] {
  return rows.map((row) => ({
    dateTime: row.dateTime,
    eventType: row.eventType,
    details: row.details,
    note: row.note,
  }));
}

function buildAttentionChips(highlights: ReportHighlight[]): ReportPdfChip[] {
  return highlights.slice(0, 4).map((highlight) => ({
    tone: highlight.tone,
    text: highlight.title,
    detail: highlight.detail,
  }));
}

function buildSummaryCards(data: ReportData): ReportPdfSummaryCard[] {
  const actualPoops = data.logs.filter((log) => log.is_no_poop === 0);
  const stoolDetailParts = [
    data.stats.mostCommonType ? `Most common type ${data.stats.mostCommonType}` : null,
    data.stats.mostCommonColor ? `Most common color ${data.stats.mostCommonColor}` : null,
  ].filter(Boolean);

  const latestMilestone = data.milestoneLogs[0] ?? null;
  const severeSymptomCount = data.symptomLogs.filter((log) => log.severity === "severe").length;
  const linkedSymptomCount = data.activeEpisodeGroup
    ? data.symptomLogs.filter((log) => log.episode_id === data.activeEpisodeGroup?.episode.id).length
    : 0;
  const symptomTone = data.symptomLogs.some((log) => log.severity === "severe")
    ? "alert"
    : data.activeEpisodeGroup
      ? "caution"
      : "info";

  return [
    {
      title: "Stool pattern",
      value: `${actualPoops.length} stool${actualPoops.length === 1 ? "" : "s"}`,
      detail: stoolDetailParts.length > 0 ? stoolDetailParts.join(" · ") : "No stool type or color trend recorded",
      tone: data.highlights.some((item) => item.tone === "alert") ? "caution" : "healthy",
    },
    {
      title: "Feed rhythm",
      value: `${data.feedingLogs.length} feed${data.feedingLogs.length === 1 ? "" : "s"}`,
      detail: data.dashboardStats.find((stat) => stat.label === "Feed sessions / day")?.detail ?? "No feed logs in range",
      tone: data.feedingLogs.length > 0 ? "info" : "default",
    },
    {
      title: "Symptoms & episodes",
      value: data.activeEpisodeGroup
        ? getEpisodeTypeLabel(data.activeEpisodeGroup.episode.episode_type)
        : `${data.symptomLogs.length} symptom${data.symptomLogs.length === 1 ? "" : "s"}`,
      detail: data.activeEpisodeGroup
        ? [
            `${linkedSymptomCount} linked symptom${linkedSymptomCount === 1 ? "" : "s"}`,
            `${data.activeEpisodeGroup.events.length} episode update${data.activeEpisodeGroup.events.length === 1 ? "" : "s"} in range`,
          ].join(" · ")
        : data.symptomLogs.length > 0
          ? `${severeSymptomCount} severe · ${data.episodeGroups.length} episode${data.episodeGroups.length === 1 ? "" : "s"}`
          : "No symptom or episode activity logged",
      tone: symptomTone,
    },
    {
      title: "Growth & milestones",
      value: `${data.growthLogs.length} growth · ${data.milestoneLogs.length} milestone${data.milestoneLogs.length === 1 ? "" : "s"}`,
      detail: latestMilestone
        ? `Latest milestone: ${getMilestoneTypeLabel(latestMilestone.milestone_type)}`
        : "No milestone context recorded in range",
      tone: latestMilestone || data.growthLogs.length > 0 ? "info" : "default",
    },
  ];
}

function buildCharts(data: ReportData, unitSystem: UnitSystem): ReportPdfChart[] {
  const charts: ReportPdfChart[] = [
    {
      title: "Daily stool output",
      kind: "bar",
      primaryLabel: "Stools",
      secondaryLabel: "No-poop days",
      points: mapPoints(data.chartData.stoolOutput),
    },
  ];

  if (data.chartData.stoolConsistency.length >= 2) {
    charts.push({
      title: "Stool type trend",
      kind: "line",
      primaryLabel: "Type",
      points: mapPoints(data.chartData.stoolConsistency),
    });
  }

  charts.push({
    title: "Daily feed activity",
    kind: "bar",
    primaryLabel: "Feeds",
    secondaryLabel: unitSystem === "imperial" ? "Logged oz" : "Logged ml",
    points: mapPoints(data.chartData.feedActivity),
  });

  if (data.chartData.symptomActivity.some((point) => point.primaryValue > 0)) {
    charts.push({
      title: "Symptom activity",
      kind: "bar",
      primaryLabel: "Entries",
      points: mapPoints(data.chartData.symptomActivity),
    });
  }

  return charts.slice(0, 4);
}

export function buildReportPdfPayload(input: {
  child: Child;
  startDate: string;
  endDate: string;
  data: ReportData;
  unitSystem: UnitSystem;
  childAvatarDataUrl?: string | null;
}): ReportPdfPayload {
  const { child, startDate, endDate, data, unitSystem, childAvatarDataUrl } = input;
  const generatedAt = new Date().toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    title: "Baby Health Report",
    subtitle: `${startDate} to ${endDate}`,
    childName: child.name,
    childMeta: `${getAgeLabelFromDob(child.date_of_birth)} · Feeding ${child.feeding_type}`,
    childAvatarColor: child.avatar_color,
    childAvatarDataUrl,
    generatedAtLabel: `Generated by Tiny Tummy | ${generatedAt}`,
    patientSummary: `${child.name} · DOB ${child.date_of_birth} · ${getAgeLabelFromDob(child.date_of_birth)} · Feeding ${child.feeding_type}`,
    attentionChips: buildAttentionChips(data.highlights),
    dashboardStats: mapStats(data.dashboardStats),
    summaryCards: buildSummaryCards(data),
    charts: buildCharts(data, unitSystem),
    contextSections: mapSections(data.contextSections),
    timeline: mapTimeline(data.timeline),
  };
}
