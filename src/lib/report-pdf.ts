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
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "./symptom-constants";
import { formatDate, getAgeLabelFromDob } from "./utils";
import { STOOL_COLORS } from "./constants";
import { formatTemperatureValue, getDefaultTemperatureUnit } from "./units";

export interface ReportPdfPayload {
  title: string;
  subtitle: string;
  childName: string;
  childMeta: string;
  childAvatarColor: string;
  childAvatarDataUrl?: string | null;
  generatedAtLabel: string;
  patientSummary: string;
  doctorBrief: ReportPdfDoctorBrief;
  attentionChips: ReportPdfChip[];
  dashboardStats: ReportPdfStat[];
  summaryCards: ReportPdfSummaryCard[];
  charts: ReportPdfChart[];
  contextSections: ReportPdfSection[];
  timeline: ReportPdfTimelineRow[];
}

export interface ReportPdfDoctorBrief {
  headline: string;
  rows: ReportPdfBriefRow[];
  questions: string[];
}

export interface ReportPdfBriefRow {
  label: string;
  value: string;
  detail: string;
  tone: "default" | "alert" | "caution" | "info" | "healthy";
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

function severityRank(severity: string): number {
  if (severity === "severe") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function formatSymptomForReport(
  symptom: ReportData["symptomLogs"][number],
  unitSystem: UnitSystem,
): string {
  const details = [
    getSymptomSeverityLabel(symptom.severity),
    symptom.temperature_c !== null
      ? formatTemperatureValue(symptom.temperature_c, getDefaultTemperatureUnit(unitSystem))
      : null,
    symptom.temperature_c !== null ? getTemperatureMethodLabel(symptom.temperature_method)?.toLowerCase() : null,
  ].filter(Boolean);

  return details.length > 0
    ? `${getSymptomTypeLabel(symptom.symptom_type)} (${details.join(", ")})`
    : getSymptomTypeLabel(symptom.symptom_type);
}

function summarizeSymptoms(
  symptoms: ReportData["symptomLogs"],
  unitSystem: UnitSystem,
): string {
  if (symptoms.length === 0) return "";

  const sorted = [...symptoms].sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff !== 0) return severityDiff;
    return left.logged_at < right.logged_at ? 1 : -1;
  });

  const shown = sorted.slice(0, 3).map((symptom) => formatSymptomForReport(symptom, unitSystem));
  const remaining = sorted.length - shown.length;
  return remaining > 0
    ? `${shown.join("; ")}; +${remaining} more`
    : shown.join("; ");
}

function selectPrimaryEpisodeGroup(data: ReportData) {
  if (data.activeEpisodeGroup) return data.activeEpisodeGroup;

  return [...data.episodeGroups].sort((left, right) => {
    const leftLinked = data.symptomLogs.filter((log) => log.episode_id === left.episode.id).length;
    const rightLinked = data.symptomLogs.filter((log) => log.episode_id === right.episode.id).length;
    if (leftLinked !== rightLinked) return rightLinked - leftLinked;
    if (left.events.length !== right.events.length) return right.events.length - left.events.length;
    return left.episode.started_at < right.episode.started_at ? 1 : -1;
  })[0] ?? null;
}

function buildEpisodeInsight(data: ReportData, unitSystem: UnitSystem) {
  const episodeGroup = selectPrimaryEpisodeGroup(data);

  if (!episodeGroup) {
    const symptomSummary = summarizeSymptoms(data.symptomLogs, unitSystem);
    return {
      value: `${data.symptomLogs.length} symptom${data.symptomLogs.length === 1 ? "" : "s"}`,
      detail: symptomSummary ? `Symptoms: ${symptomSummary}` : "No symptom or episode activity logged",
      tone: data.symptomLogs.some((log) => log.severity === "severe") ? "alert" as const : "info" as const,
    };
  }

  const linkedSymptoms = data.symptomLogs.filter((log) => log.episode_id === episodeGroup.episode.id);
  const symptomSummary = summarizeSymptoms(linkedSymptoms, unitSystem);
  const latestEvent = [...episodeGroup.events].sort((left, right) => (left.logged_at < right.logged_at ? 1 : -1))[0] ?? null;
  const episodeStatus = episodeGroup.episode.status === "active" ? "active" : "resolved";
  const detailParts = [
    `Started ${formatDate(episodeGroup.episode.started_at)}`,
    symptomSummary ? `Symptoms: ${symptomSummary}` : "No linked symptoms logged",
    latestEvent ? `Latest update: ${latestEvent.title}` : null,
    episodeGroup.episode.outcome ? `Outcome: ${episodeGroup.episode.outcome}` : null,
  ].filter(Boolean);

  return {
    value: `${getEpisodeTypeLabel(episodeGroup.episode.episode_type)} (${episodeStatus})`,
    detail: detailParts.join(" · "),
    tone: linkedSymptoms.some((log) => log.severity === "severe")
      ? "alert" as const
      : episodeGroup.episode.status === "active"
        ? "caution" as const
        : "info" as const,
  };
}

function getDateKey(value: string): string {
  return value.split("T")[0];
}

function formatReportDay(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDateRangeLength(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function getStoolTypeLabel(value: number | null): string {
  if (value === null) return "type not recorded";
  const labels: Record<number, string> = {
    1: "T1 hard pellets",
    2: "T2 lumpy",
    3: "T3 cracked",
    4: "T4 smooth",
    5: "T5 soft",
    6: "T6 mushy",
    7: "T7 watery",
  };
  return labels[value] ?? `Type ${value}`;
}

function getColorLabel(value: string | null): string {
  return value ? `${value}` : "color not recorded";
}

function listUniqueDays(values: string[]): string[] {
  return [...new Set(values.map(getDateKey))].sort();
}

function summarizeStoolSignal(data: ReportData) {
  const actualStools = data.stoolEvents
    .filter((log) => log.is_no_poop === 0)
    .sort((left, right) => (left.logged_at < right.logged_at ? -1 : 1));
  const redFlagStools = actualStools.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return Boolean(colorInfo?.isRedFlag);
  });
  const looseStools = actualStools.filter((log) => (log.stool_type ?? 0) >= 6);
  const hardStools = actualStools.filter((log) => (log.stool_type ?? 99) <= 2);

  if (redFlagStools.length > 0) {
    const days = listUniqueDays(redFlagStools.map((log) => log.logged_at)).map((day) => formatReportDay(`${day}T00:00:00`));
    const types = [...new Set(redFlagStools.map((log) => getStoolTypeLabel(log.stool_type)))].join(", ");
    const colors = [...new Set(redFlagStools.map((log) => getColorLabel(log.color)))].join(", ");
    return {
      value: `${redFlagStools.length} red-flag stool${redFlagStools.length === 1 ? "" : "s"}`,
      detail: `${colors} stool${redFlagStools.length === 1 ? "" : "s"} on ${days.join(", ")}; ${types}.`,
      tone: "alert" as const,
    };
  }

  if (looseStools.length >= 2) {
    const days = listUniqueDays(looseStools.map((log) => log.logged_at)).map((day) => formatReportDay(`${day}T00:00:00`));
    return {
      value: `${looseStools.length} loose stool${looseStools.length === 1 ? "" : "s"}`,
      detail: `Type 6-7 stool pattern on ${days.join(", ")}.`,
      tone: "caution" as const,
    };
  }

  if (hardStools.length >= 2) {
    const days = listUniqueDays(hardStools.map((log) => log.logged_at)).map((day) => formatReportDay(`${day}T00:00:00`));
    return {
      value: `${hardStools.length} hard stool${hardStools.length === 1 ? "" : "s"}`,
      detail: `Type 1-2 stool pattern on ${days.join(", ")}.`,
      tone: "caution" as const,
    };
  }

  const latestStool = actualStools[actualStools.length - 1] ?? null;
  return {
    value: `${actualStools.length} stool${actualStools.length === 1 ? "" : "s"}`,
    detail: latestStool
      ? `Latest stool: ${getStoolTypeLabel(latestStool.stool_type)}, ${getColorLabel(latestStool.color)} on ${formatReportDay(latestStool.logged_at)}.`
      : "No stool events in this report range.",
    tone: "healthy" as const,
  };
}

function summarizeStoolChange(data: ReportData): string {
  const actualStools = data.stoolEvents
    .filter((log) => log.is_no_poop === 0)
    .sort((left, right) => (left.logged_at < right.logged_at ? -1 : 1));
  if (actualStools.length < 2) return "Not enough stool entries to compare pattern changes.";

  const latestDay = getDateKey(actualStools[actualStools.length - 1].logged_at);
  const latestDayStools = actualStools.filter((log) => getDateKey(log.logged_at) === latestDay);
  const earlierStools = actualStools.filter((log) => getDateKey(log.logged_at) !== latestDay);
  const latestTypes = [...new Set(latestDayStools.map((log) => getStoolTypeLabel(log.stool_type)))].join(", ");
  const latestColors = [...new Set(latestDayStools.map((log) => getColorLabel(log.color)))].join(", ");

  if (earlierStools.length === 0) {
    return `${latestDayStools.length} stool${latestDayStools.length === 1 ? "" : "s"} on ${formatReportDay(`${latestDay}T00:00:00`)}: ${latestTypes}; ${latestColors}.`;
  }

  const earlierTypes = [...new Set(earlierStools.slice(-4).map((log) => getStoolTypeLabel(log.stool_type)))].join(", ");
  const earlierColors = [...new Set(earlierStools.slice(-4).map((log) => getColorLabel(log.color)))].join(", ");
  return `Earlier recent stools: ${earlierTypes}; ${earlierColors}. Latest day (${formatReportDay(`${latestDay}T00:00:00`)}): ${latestTypes}; ${latestColors}.`;
}

function buildDoctorQuestions(input: {
  stoolSignal: ReturnType<typeof summarizeStoolSignal>;
  episodeInsight: ReturnType<typeof buildEpisodeInsight>;
  data: ReportData;
}): string[] {
  const questions: string[] = [];
  const hasRedFlag = input.stoolSignal.tone === "alert";
  const looseStools = input.data.stoolEvents.filter((log) => log.is_no_poop === 0 && (log.stool_type ?? 0) >= 6).length;
  const darkUrine = input.data.diaperStats.darkUrine;

  if (hasRedFlag) {
    questions.push("Should the red-flag stool color be reviewed urgently, with photos, or with a stool sample?");
  }
  if (looseStools >= 2 || input.episodeInsight.value !== "0 symptoms") {
    questions.push("Could the stool change be related to the fever/illness symptoms, diet, medication, or infection?");
  }
  if (darkUrine > 0 || input.data.diaperStats.wet <= 2) {
    questions.push("Is wet output enough, and are there any dehydration signs to watch for?");
  }
  questions.push("What symptoms or stool changes should trigger same-day follow-up?");

  return questions.slice(0, 4);
}

function buildDoctorBrief(input: {
  data: ReportData;
  startDate: string;
  endDate: string;
  unitSystem: UnitSystem;
}): ReportPdfDoctorBrief {
  const { data, startDate, endDate, unitSystem } = input;
  const stoolSignal = summarizeStoolSignal(data);
  const stoolChange = summarizeStoolChange(data);
  const episodeInsight = buildEpisodeInsight(data, unitSystem);
  const dayCount = getDateRangeLength(startDate, endDate);
  const activeDays = listUniqueDays([
    ...data.stoolEvents.map((log) => log.logged_at),
    ...data.diaperLogs.map((log) => log.logged_at),
    ...data.feedingLogs.map((log) => log.logged_at),
    ...data.symptomLogs.map((log) => log.logged_at),
    ...data.milestoneLogs.map((log) => log.logged_at),
    ...data.episodeGroups.map((group) => group.episode.started_at),
    ...data.episodeGroups.flatMap((group) => group.events.map((event) => event.logged_at)),
    ...data.growthLogs.map((log) => log.measured_at),
  ]).length;
  const diaperDays = listUniqueDays(data.diaperLogs.map((log) => log.logged_at)).length;
  const diaperDetail = data.diaperStats.darkUrine > 0
    ? `${data.diaperStats.darkUrine} dark urine diaper${data.diaperStats.darkUrine === 1 ? "" : "s"} logged.`
    : `No dark urine logged; diaper entries appear on ${diaperDays} day${diaperDays === 1 ? "" : "s"}.`;
  const headline = stoolSignal.tone === "alert"
    ? `${stoolSignal.value} need review in context of ${episodeInsight.value}.`
    : `${stoolSignal.value} with ${episodeInsight.value}.`;

  return {
    headline,
    rows: [
      {
        label: "Stool signal",
        value: stoolSignal.value,
        detail: `${stoolSignal.detail} ${stoolChange}`,
        tone: stoolSignal.tone,
      },
      {
        label: "Related context",
        value: episodeInsight.value,
        detail: episodeInsight.detail,
        tone: episodeInsight.tone,
      },
      {
        label: "Diaper / hydration",
        value: `${data.diaperStats.wet} wet · ${data.diaperStats.dirty} dirty`,
        detail: diaperDetail,
        tone: data.diaperStats.darkUrine > 0 ? "caution" : "info",
      },
      {
        label: "Data quality",
        value: `${activeDays}/${dayCount} days logged`,
        detail: activeDays < Math.max(4, Math.ceil(dayCount / 3))
          ? "Sparse logging: treat averages as less useful than dated events and patterns."
          : "Logging coverage is enough to compare events across the selected range.",
        tone: activeDays < Math.max(4, Math.ceil(dayCount / 3)) ? "caution" : "info",
      },
    ],
    questions: buildDoctorQuestions({ stoolSignal, episodeInsight, data }),
  };
}

function buildSummaryCards(data: ReportData, unitSystem: UnitSystem): ReportPdfSummaryCard[] {
  const actualPoops = data.stoolEvents.filter((log) => log.is_no_poop === 0);
  const hardStools = actualPoops.filter((log) => (log.stool_type ?? 99) <= 2).length;
  const looseStools = actualPoops.filter((log) => (log.stool_type ?? 0) >= 6).length;
  const redFlagStools = actualPoops.filter((log) => {
    const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return Boolean(colorInfo?.isRedFlag);
  }).length;
  const stoolDetailParts = [
    data.stats.mostCommonType ? `Most common type ${data.stats.mostCommonType}` : null,
    data.stats.mostCommonColor ? `Most common color ${data.stats.mostCommonColor}` : null,
  ].filter(Boolean);

  const latestMilestone = data.milestoneLogs[0] ?? null;
  const severeSymptomCount = data.symptomLogs.filter((log) => log.severity === "severe").length;
  const episodeInsight = buildEpisodeInsight(data, unitSystem);

  if (data.reportKind === "poopTummy") {
    return [
      {
        title: "Stool pattern",
        value: `${actualPoops.length} stool${actualPoops.length === 1 ? "" : "s"}`,
        detail: stoolDetailParts.length > 0 ? stoolDetailParts.join(" · ") : "No stool type or color trend recorded",
        tone: data.highlights.some((item) => item.tone === "alert") ? "caution" : "healthy",
      },
      {
        title: "Diaper output",
        value: `${data.diaperStats.wet} wet · ${data.diaperStats.dirty} dirty`,
        detail: data.diaperStats.darkUrine > 0
          ? `${data.diaperStats.darkUrine} dark urine diaper${data.diaperStats.darkUrine === 1 ? "" : "s"} logged`
          : `${data.diaperStats.total} total diaper${data.diaperStats.total === 1 ? "" : "s"} in range`,
        tone: data.diaperStats.darkUrine > 0 ? "caution" : data.diaperStats.total > 0 ? "info" : "default",
      },
      {
        title: "Consistency watch",
        value: `${hardStools} hard · ${looseStools} loose`,
        detail: redFlagStools > 0
          ? `${redFlagStools} red-flag color${redFlagStools === 1 ? "" : "s"} logged`
          : "No red-flag stool color highlighted",
        tone: redFlagStools > 0 || looseStools >= 2 ? "caution" : "healthy",
      },
      {
        title: "Tummy context",
        value: episodeInsight.value,
        detail: episodeInsight.detail,
        tone: episodeInsight.tone,
      },
    ];
  }

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
      value: episodeInsight.value,
      detail: episodeInsight.detail || (
        data.symptomLogs.length > 0
          ? `${severeSymptomCount} severe · ${data.episodeGroups.length} episode${data.episodeGroups.length === 1 ? "" : "s"}`
          : "No symptom or episode activity logged"
      ),
      tone: episodeInsight.tone,
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
      primaryLabel: "Bristol-style stool type",
      points: mapPoints(data.chartData.stoolConsistency),
    });
  }

  charts.push({
    title: "Daily diaper output",
    kind: "bar",
    primaryLabel: "Wet",
    secondaryLabel: "Dirty",
    points: mapPoints(data.chartData.diaperOutput),
  });

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

  if (data.reportKind === "poopTummy") {
    return charts.slice(0, 4);
  }

  return charts
    .filter((chart) => chart.title !== "Daily diaper output" || data.diaperLogs.length > 0)
    .slice(0, 4);
}

function getReportPdfTitle(data: ReportData): string {
  return data.reportKind === "poopTummy"
    ? "Baby Poop & Tummy Report"
    : "Baby Health Report";
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
    title: getReportPdfTitle(data),
    subtitle: `${startDate} to ${endDate}`,
    childName: child.name,
    childMeta: `${getAgeLabelFromDob(child.date_of_birth)} · Feeding ${child.feeding_type}`,
    childAvatarColor: child.avatar_color,
    childAvatarDataUrl,
    generatedAtLabel: `Generated by Tiny Tummy | ${generatedAt}`,
    patientSummary: `${child.name} · DOB ${child.date_of_birth} · ${getAgeLabelFromDob(child.date_of_birth)} · Feeding ${child.feeding_type}`,
    doctorBrief: buildDoctorBrief({ data, startDate, endDate, unitSystem }),
    attentionChips: buildAttentionChips(data.highlights),
    dashboardStats: mapStats(data.dashboardStats),
    summaryCards: buildSummaryCards(data, unitSystem),
    charts: buildCharts(data, unitSystem),
    contextSections: mapSections(data.contextSections),
    timeline: mapTimeline(data.timeline),
  };
}
