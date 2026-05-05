import { BITSS_TYPES, FEEDING_TYPES, STOOL_COLORS } from "./constants";
import { buildReportDoctorBrief, type ReportBriefRow } from "./report-doctor-brief";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getFeedingEntryDisplayLabel } from "./feeding";
import type { ReportData, ReportTimelineRow } from "./reporting";
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "./symptom-constants";
import type { Child, DiaperEntry, FeedingEntry, SymptomEntry, UnitSystem } from "./types";
import { formatDate, formatLocalDateKey, getAgeLabelFromDob } from "./utils";
import { formatTemperatureValue, formatVolumeValue, getDefaultTemperatureUnit } from "./units";

export type ReportPreviewTone = "default" | "alert" | "caution" | "info" | "healthy";
export type ReportTimelineFilter = "full" | "poopDiaper" | "symptomsEpisodes" | "doctorBrief";

export const REPORT_TIMELINE_FILTERS: Array<{ value: ReportTimelineFilter; label: string }> = [
  { value: "full", label: "Full timeline" },
  { value: "poopDiaper", label: "Poop / diaper" },
  { value: "symptomsEpisodes", label: "Symptoms / episodes" },
  { value: "doctorBrief", label: "Doctor brief" },
];

export interface ReportPreviewMetric {
  label: string;
  value: string;
  detail?: string;
  tone: ReportPreviewTone;
}

export interface ReportPreviewEvent {
  label: string;
  value: string;
  detail: string;
  tone: ReportPreviewTone;
}

export interface ReportDailyPoint {
  key: string;
  weekday: string;
  dateLabel: string;
  stoolCount: number;
  noPoopCount: number;
  wetOnly: number;
  dirtyOnly: number;
  mixed: number;
}

export interface ReportTypeTrendPoint {
  id: string;
  dateLabel: string;
  value: number;
  label: string;
  detail: string;
  tone: ReportPreviewTone;
}

export interface ReportColourBreakdownItem {
  label: string;
  value: string;
  count: number;
  percent: number;
  color: string;
  isRedFlag: boolean;
}

export interface ReportClinicalNote {
  topic: string;
  value: string;
  note: string;
  tone: ReportPreviewTone;
}

export interface ReportPreviewRow {
  label: string;
  value: string;
  detail?: string;
  tone?: ReportPreviewTone;
}

export interface ReportSymptomSummaryRow {
  symptom: string;
  severityLabel: string;
  severityScore: number;
  latest: string;
  note: string;
  tone: ReportPreviewTone;
}

export interface ReportFeedingSummaryRow {
  type: string;
  entries: string;
  notes: string;
}

export interface ReportTimelineDisplayRow {
  id: string;
  time: string;
  event: string;
  details: string;
  note: string;
  tone: ReportPreviewTone;
}

export interface ReportTimelineGroup {
  dateLabel: string;
  rows: ReportTimelineDisplayRow[];
}

export interface ReportPreviewModel {
  title: string;
  childId: string;
  childName: string;
  childAvatarColor: string;
  ageLabel: string;
  dobLabel: string;
  feedingLabel: string;
  periodLabel: string;
  generatedLabel: string;
  disclaimer: string;
  privacyFooter: string;
  brief: {
    summary: string;
    concerns: ReportBriefRow[];
    questions: string[];
    lastImportantEvents: ReportPreviewEvent[];
    metrics: ReportPreviewMetric[];
  };
  pattern: {
    metrics: ReportPreviewMetric[];
    dailyPoints: ReportDailyPoint[];
    noPoopDates: string[];
    stoolTypeTrend: ReportTypeTrendPoint[];
    colourBreakdown: ReportColourBreakdownItem[];
    hydrationRows: ReportPreviewRow[];
    clinicalNotes: ReportClinicalNote[];
  };
  context: {
    careNotes: ReportPreviewRow[];
    poopSummaryRows: ReportPreviewRow[];
    diaperRows: ReportPreviewRow[];
    episodeRows: ReportPreviewRow[];
    symptomRows: ReportSymptomSummaryRow[];
    feedingRows: ReportFeedingSummaryRow[];
    parentNoteRows: ReportPreviewRow[];
  };
  timelineGroups: ReportTimelineGroup[];
}

export function buildReportPreviewModel(input: {
  child: Child;
  startDate: string;
  endDate: string;
  data: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
}): ReportPreviewModel {
  const { child, startDate, endDate, data, unitSystem, generatedAt = new Date() } = input;
  const doctorBrief = buildReportDoctorBrief({ data, startDate, endDate, unitSystem });
  const actualStools = data.stoolEvents.filter((log) => log.is_no_poop === 0);
  const redFlagStools = getRedFlagStools(data);
  const hardStoolCount = actualStools.filter((log) => (log.stool_type ?? 99) <= 2).length;
  const looseStoolCount = actualStools.filter((log) => (log.stool_type ?? 0) >= 6).length;
  const dayCount = getDateRangeLength(startDate, endDate);
  const activeDays = collectActivityDayCount(data);
  const activeEpisode = data.activeEpisodeGroup?.episode ?? null;
  const feedingLabel = FEEDING_TYPES.find((item) => item.value === child.feeding_type)?.label ?? child.feeding_type;
  const recentDailyPoints = buildDailyPoints({ startDate, endDate, data });
  const noPoopDates = data.stoolEvents
    .filter((log) => log.is_no_poop === 1)
    .map((log) => formatDateOnly(log.logged_at));
  const generatedLabel = formatReportGeneratedAt(generatedAt);

  return {
    title: data.reportKind === "poopTummy" ? "Poop & Tummy Report" : "Pediatrician Report",
    childId: child.id,
    childName: child.name,
    childAvatarColor: child.avatar_color,
    ageLabel: getAgeLabelFromDob(child.date_of_birth, generatedAt),
    dobLabel: child.date_of_birth,
    feedingLabel,
    periodLabel: `${startDate} to ${endDate}`,
    generatedLabel,
    disclaimer: "This report summarizes logs from Tiny Tummy. It does not diagnose or replace medical advice.",
    privacyFooter: "Generated locally by Tiny Tummy. Your baby's data stays on your device unless you choose to export or share this report.",
    brief: {
      summary: buildPediatricianSummary({
        childName: child.name,
        data,
        activeDays,
        dayCount,
        redFlagCount: redFlagStools.length,
        activeEpisodeLabel: activeEpisode ? getEpisodeTypeLabel(activeEpisode.episode_type) : null,
      }),
      concerns: buildPreviewConcernCards(doctorBrief.rows),
      questions: doctorBrief.questions,
      lastImportantEvents: buildLastImportantEvents(data, unitSystem),
      metrics: buildBriefMetrics({
        data,
        actualStools,
        redFlagCount: redFlagStools.length,
        hardStoolCount,
        looseStoolCount,
      }),
    },
    pattern: {
      metrics: buildPatternMetrics({
        data,
        actualStools,
        redFlagCount: redFlagStools.length,
        hardStoolCount,
        looseStoolCount,
      }),
      dailyPoints: recentDailyPoints,
      noPoopDates,
      stoolTypeTrend: buildStoolTypeTrend(data),
      colourBreakdown: buildColourBreakdown(actualStools),
      hydrationRows: buildHydrationRows(data),
      clinicalNotes: buildClinicalNotes({
        data,
        actualStools,
        redFlagCount: redFlagStools.length,
        hardStoolCount,
        looseStoolCount,
      }),
    },
    context: {
      careNotes: buildCareNotes({
        data,
        redFlagCount: redFlagStools.length,
        looseStoolCount,
        hardStoolCount,
      }),
      poopSummaryRows: buildPoopSummaryRows({
        data,
        actualStools,
        redFlagCount: redFlagStools.length,
        hardStoolCount,
        looseStoolCount,
      }),
      diaperRows: buildDiaperRows(data),
      episodeRows: buildEpisodeRows(data, unitSystem),
      symptomRows: buildSymptomRows(data.symptomLogs, unitSystem),
      feedingRows: buildFeedingRows(data.feedingLogs, unitSystem),
      parentNoteRows: buildParentNoteRows(data),
    },
    timelineGroups: buildTimelineGroups(data.timeline, "full"),
  };
}

export function buildTimelineGroups(
  timeline: ReportTimelineRow[],
  filter: ReportTimelineFilter,
): ReportTimelineGroup[] {
  const grouped = new Map<string, ReportTimelineDisplayRow[]>();

  // ReportData currently stores timeline rows newest-first for native PDF output.
  // The HTML appendix presents them oldest-first because doctors scan chronology more naturally that way.
  const rows = [...timeline].reverse().filter((row) => matchesTimelineFilter(row, filter));

  for (const row of rows) {
    const { dateLabel, timeLabel } = splitTimelineDateTime(row.dateTime);
    const displayRow: ReportTimelineDisplayRow = {
      id: `${row.dateTime}-${row.eventType}-${row.details}-${row.note ?? ""}`,
      time: timeLabel,
      event: row.eventType,
      details: row.details,
      note: row.note ?? "-",
      tone: getTimelineTone(row),
    };
    grouped.set(dateLabel, [...(grouped.get(dateLabel) ?? []), displayRow]);
  }

  return [...grouped.entries()].map(([dateLabel, rows]) => ({ dateLabel, rows }));
}

function buildPediatricianSummary(input: {
  childName: string;
  data: ReportData;
  activeDays: number;
  dayCount: number;
  redFlagCount: number;
  activeEpisodeLabel: string | null;
}): string {
  const actualStools = input.data.stoolEvents.filter((log) => log.is_no_poop === 0).length;
  const parts = [
    `${input.childName} had ${actualStools} stool log${actualStools === 1 ? "" : "s"}`,
    `${input.data.diaperStats.wet} wet diaper${input.data.diaperStats.wet === 1 ? "" : "s"}`,
    `${input.data.diaperStats.dirty} dirty diaper${input.data.diaperStats.dirty === 1 ? "" : "s"}`,
  ];

  if (input.redFlagCount > 0) {
    parts.push(`${input.redFlagCount} red-flag stool entr${input.redFlagCount === 1 ? "y" : "ies"}`);
  }

  if (input.activeEpisodeLabel) {
    parts.push(`an active ${input.activeEpisodeLabel} episode`);
  }

  const coverage = input.activeDays < Math.max(4, Math.ceil(input.dayCount / 3))
    ? "Logging was sparse, so dated events may be more useful than averages."
    : "Logging covered enough days to compare dated events and short-term patterns.";

  return `Over this period, ${parts.join(", ")}. ${coverage}`;
}

function formatReportGeneratedAt(date: Date): string {
  const datePart = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();

  return `${datePart} at ${timePart}`;
}

function buildPreviewConcernCards(rows: ReportBriefRow[]): ReportBriefRow[] {
  return rows.map((row) => {
    if (row.label === "Related context") {
      return {
        ...row,
        label: "Symptoms / episode",
        detail: row.tone === "default"
          ? "No active episode or symptom pattern was highlighted in this period."
          : "Review current symptoms and episode updates with the stool and diaper timeline.",
      };
    }

    if (row.label === "Stool signal") {
      return {
        ...row,
        detail: row.tone === "alert"
          ? "Red-flag stool colours were recorded; review dated entries, notes, and photos."
          : "Review stool frequency, type, colour, notes, and any attached photos.",
      };
    }

    if (row.label === "Diaper / hydration") {
      return {
        ...row,
        detail: row.tone === "caution"
          ? "Dark urine was logged; compare with intake, fever, vomiting, and illness."
          : "Wet and dirty diaper output is summarized for hydration context.",
      };
    }

    if (row.label === "Data quality") {
      return {
        ...row,
        detail: row.tone === "caution"
          ? "Logging was sparse; dated events may be more useful than averages."
          : "Logging coverage supports short-term pattern review.",
      };
    }

    return row;
  });
}

function buildBriefMetrics(input: {
  data: ReportData;
  actualStools: ReportData["stoolEvents"];
  redFlagCount: number;
  hardStoolCount: number;
  looseStoolCount: number;
}): ReportPreviewMetric[] {
  const mostCommonType = input.data.stats.mostCommonType;
  return [
    {
      label: "Stool count",
      value: String(input.actualStools.length),
      detail: "Logged stool events",
      tone: "default",
    },
    {
      label: "Most common type",
      value: mostCommonType ? getStoolTextureLabel(mostCommonType) : "-",
      detail: mostCommonType ? `Bristol-style type ${mostCommonType}` : "Type not recorded",
      tone: "default",
    },
    {
      label: "Red-flag stools",
      value: String(input.redFlagCount),
      detail: "Red, black, or white entries",
      tone: input.redFlagCount > 0 ? "alert" : "healthy",
    },
    {
      label: "Wet diapers",
      value: String(input.data.diaperStats.wet),
      detail: input.data.diaperStats.darkUrine > 0 ? "Dark urine noted" : "Urine output logs",
      tone: input.data.diaperStats.darkUrine > 0 ? "caution" : "info",
    },
    {
      label: "Dirty diapers",
      value: String(input.data.diaperStats.dirty),
      detail: "Stool recorded in diapers",
      tone: "default",
    },
    {
      label: "No-poop days",
      value: String(input.data.stats.totalNoPoop),
      detail: "Marked no-poop entries",
      tone: input.data.stats.totalNoPoop > 0 ? "caution" : "healthy",
    },
    {
      label: "Feed sessions",
      value: String(input.data.feedingLogs.length),
      detail: "Context only",
      tone: "info",
    },
  ];
}

function buildPatternMetrics(input: {
  data: ReportData;
  actualStools: ReportData["stoolEvents"];
  redFlagCount: number;
  hardStoolCount: number;
  looseStoolCount: number;
}): ReportPreviewMetric[] {
  return [
    {
      label: "Stool count",
      value: String(input.actualStools.length),
      detail: "Total stool logs",
      tone: "default",
    },
    {
      label: "No-poop days",
      value: String(input.data.stats.totalNoPoop),
      detail: input.data.stats.totalNoPoop > 0 ? "Marked by parent" : "None marked",
      tone: input.data.stats.totalNoPoop > 0 ? "caution" : "healthy",
    },
    {
      label: "Longest streak",
      value: `${getLongestNoPoopStreak(input.data.stoolEvents)} day${getLongestNoPoopStreak(input.data.stoolEvents) === 1 ? "" : "s"}`,
      detail: "Based on no-poop markers",
      tone: getLongestNoPoopStreak(input.data.stoolEvents) >= 2 ? "caution" : "default",
    },
    {
      label: "Wet diapers",
      value: String(input.data.diaperStats.wet),
      detail: "Wet or mixed",
      tone: input.data.diaperStats.darkUrine > 0 ? "caution" : "info",
    },
    {
      label: "Dirty diapers",
      value: String(input.data.diaperStats.dirty),
      detail: "Dirty or mixed",
      tone: "default",
    },
    {
      label: "Mixed diapers",
      value: String(input.data.diaperStats.mixed),
      detail: "Wet and dirty",
      tone: "default",
    },
  ];
}

function buildLastImportantEvents(data: ReportData, unitSystem: UnitSystem): ReportPreviewEvent[] {
  const latestStool = sortNewest(data.stoolEvents.filter((log) => log.is_no_poop === 0))[0] ?? null;
  const latestWet = sortNewest(data.diaperLogs.filter(hasUrineInDiaper))[0] ?? null;
  const latestSymptom = sortNewest(data.symptomLogs)[0] ?? null;
  const activeEpisode = data.activeEpisodeGroup;

  return [
    latestStool
      ? {
          label: "Last poop",
          value: formatDate(latestStool.logged_at),
          detail: [
            getStoolTypeLabel(latestStool.stool_type),
            latestStool.color ? getStoolColorLabel(latestStool.color) : "Color not recorded",
            latestStool.photo_path ? "Photo attached" : null,
          ].filter(Boolean).join(" - "),
          tone: getStoolTone(latestStool),
        }
      : emptyEvent("Last poop", "No stool logged"),
    latestWet
      ? {
          label: "Last wet diaper",
          value: formatDate(latestWet.logged_at),
          detail: latestWet.urine_color ? `Urine ${latestWet.urine_color}` : "Urine color not recorded",
          tone: latestWet.urine_color === "dark" ? "caution" : "info",
        }
      : emptyEvent("Last wet diaper", "No wet diaper logged"),
    latestSymptom
      ? {
          label: "Latest symptom",
          value: formatDate(latestSymptom.logged_at),
          detail: formatSymptomDetails(latestSymptom, unitSystem),
          tone: symptomTone(latestSymptom),
        }
      : emptyEvent("Latest symptom", "No symptom logged"),
    activeEpisode
      ? {
          label: "Active episode",
          value: `Since ${formatDate(activeEpisode.episode.started_at)}`,
          detail: `${getEpisodeTypeLabel(activeEpisode.episode.episode_type)} - ${activeEpisode.events.length} update${activeEpisode.events.length === 1 ? "" : "s"}`,
          tone: "caution",
        }
      : emptyEvent("Active episode", "No active episode"),
  ];
}

function emptyEvent(label: string, detail: string): ReportPreviewEvent {
  return {
    label,
    value: "-",
    detail,
    tone: "default",
  };
}

function buildDailyPoints(input: {
  startDate: string;
  endDate: string;
  data: ReportData;
}): ReportDailyPoint[] {
  const days = buildRecentDateKeys(input.startDate, input.endDate, 7);

  return days.map((key) => {
    const date = new Date(`${key}T00:00:00`);
    const logsOnDay = input.data.stoolEvents.filter((log) => dateKey(log.logged_at) === key);
    const diapersOnDay = input.data.diaperLogs.filter((log) => dateKey(log.logged_at) === key);

    return {
      key,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      stoolCount: logsOnDay.filter((log) => log.is_no_poop === 0).length,
      noPoopCount: logsOnDay.filter((log) => log.is_no_poop === 1).length,
      wetOnly: diapersOnDay.filter((log) => log.diaper_type === "wet").length,
      dirtyOnly: diapersOnDay.filter((log) => log.diaper_type === "dirty").length,
      mixed: diapersOnDay.filter((log) => log.diaper_type === "mixed").length,
    };
  });
}

function buildStoolTypeTrend(data: ReportData): ReportTypeTrendPoint[] {
  return data.stoolEvents
    .filter((log) => log.is_no_poop === 0 && log.stool_type !== null)
    .sort((left, right) => (left.logged_at < right.logged_at ? -1 : 1))
    .slice(-7)
    .map((log) => ({
      id: log.id,
      dateLabel: formatDateOnly(log.logged_at),
      value: log.stool_type ?? 0,
      label: `T${log.stool_type}`,
      detail: getStoolTypeLabel(log.stool_type),
      tone: getStoolTone(log),
    }));
}

function buildColourBreakdown(actualStools: ReportData["stoolEvents"]): ReportColourBreakdownItem[] {
  const counts = new Map<string, number>();

  for (const log of actualStools) {
    if (!log.color) continue;
    counts.set(log.color, (counts.get(log.color) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return [...counts.entries()]
    .map(([value, count]) => {
      const color = STOOL_COLORS.find((item) => item.value === value);
      return {
        label: color?.label ?? value,
        value,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: color?.hex ?? "#6f6259",
        isRedFlag: Boolean(color?.isRedFlag),
      };
    })
    .sort((left, right) => right.count - left.count);
}

function buildHydrationRows(data: ReportData): ReportPreviewRow[] {
  const urineCounts = new Map<string, number>();
  for (const log of data.diaperLogs) {
    if (!hasUrineInDiaper(log)) continue;
    const key = log.urine_color ?? "not recorded";
    urineCounts.set(key, (urineCounts.get(key) ?? 0) + 1);
  }
  const mostCommonUrine = [...urineCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;

  return [
    {
      label: "Urine colour",
      value: mostCommonUrine ? `${mostCommonUrine[0]} (${mostCommonUrine[1]})` : "Not recorded",
      detail: mostCommonUrine ? "Most frequent urine observation" : "No urine colour logs in this period",
      tone: mostCommonUrine?.[0] === "dark" ? "caution" : "info",
    },
    {
      label: "Dark urine logged",
      value: data.diaperStats.darkUrine > 0 ? String(data.diaperStats.darkUrine) : "None",
      detail: data.diaperStats.darkUrine > 0 ? "Worth discussing if persistent or paired with other symptoms" : "None recorded in this period",
      tone: data.diaperStats.darkUrine > 0 ? "caution" : "healthy",
    },
  ];
}

function buildClinicalNotes(input: {
  data: ReportData;
  actualStools: ReportData["stoolEvents"];
  redFlagCount: number;
  hardStoolCount: number;
  looseStoolCount: number;
}): ReportClinicalNote[] {
  return [
    {
      topic: "Stool signal",
      value: `${input.actualStools.length} stool log${input.actualStools.length === 1 ? "" : "s"}`,
      note: input.actualStools.length > 0 ? "Review dated entries for type, colour, notes, and photos." : "No stool entries were logged in this range.",
      tone: "default",
    },
    {
      topic: "Hard stool pattern",
      value: `${input.hardStoolCount} Type 1-2`,
      note: input.hardStoolCount > 0 ? "Hard stool was logged and may be worth reviewing with symptoms and feeding." : "No hard stool pattern logged.",
      tone: input.hardStoolCount >= 2 ? "caution" : "default",
    },
    {
      topic: "Loose stool pattern",
      value: `${input.looseStoolCount} Type 6-7`,
      note: input.looseStoolCount > 0 ? "Loose stool was logged; compare with illness, fever, appetite, and diet changes." : "No loose stool pattern logged.",
      tone: input.looseStoolCount >= 2 ? "caution" : "default",
    },
    {
      topic: "Red-flag colours",
      value: `${input.redFlagCount}`,
      note: input.redFlagCount > 0 ? "Red, black, or white stool was logged and may be worth discussing with a clinician." : "No red, black, or white stool entries were logged.",
      tone: input.redFlagCount > 0 ? "alert" : "healthy",
    },
    {
      topic: "Diaper output",
      value: `${input.data.diaperStats.wet} wet, ${input.data.diaperStats.dirty} dirty`,
      note: `Average ${formatAverage(input.data.diaperStats.wet, input.data.diaperLogs.length)} wet-output logs per diaper entry; mixed diapers are noted separately.`,
      tone: input.data.diaperStats.darkUrine > 0 ? "caution" : "info",
    },
  ];
}

function buildCareNotes(input: {
  data: ReportData;
  redFlagCount: number;
  looseStoolCount: number;
  hardStoolCount: number;
}): ReportPreviewRow[] {
  const notes: ReportPreviewRow[] = [];
  if (input.redFlagCount > 0) {
    notes.push({
      label: "Stool colour",
      value: `${input.redFlagCount} red-flag stool colour${input.redFlagCount === 1 ? "" : "s"} logged`,
      detail: "Worth discussing with a clinician, especially with photos or repeated entries.",
      tone: "alert",
    });
  }
  if (input.looseStoolCount >= 2) {
    notes.push({
      label: "Loose stool",
      value: `${input.looseStoolCount} loose stool entries`,
      detail: "Compare with fever, vomiting, appetite, illness episodes, and diet changes.",
      tone: "caution",
    });
  }
  if (input.hardStoolCount >= 2) {
    notes.push({
      label: "Hard stool",
      value: `${input.hardStoolCount} hard stool entries`,
      detail: "Compare with straining, appetite, fluid intake, and solids changes.",
      tone: "caution",
    });
  }
  if (input.data.activeEpisodeGroup) {
    notes.push({
      label: "Episode",
      value: `${getEpisodeTypeLabel(input.data.activeEpisodeGroup.episode.episode_type)} is active`,
      detail: `${input.data.activeEpisodeGroup.events.length} update${input.data.activeEpisodeGroup.events.length === 1 ? "" : "s"} logged in range.`,
      tone: "caution",
    });
  }
  const solidsMilestone = input.data.milestoneLogs.find((log) => log.milestone_type === "started_solids");
  if (solidsMilestone) {
    notes.push({
      label: "Solids",
      value: `Started solids logged on ${formatDateOnly(solidsMilestone.logged_at)}`,
      detail: solidsMilestone.notes ?? "Useful context for stool colour, texture, and frequency changes.",
      tone: "info",
    });
  }
  const photoCount = countPhotos(input.data);
  if (photoCount > 0) {
    notes.push({
      label: "Photos",
      value: `${photoCount} poop or diaper photo${photoCount === 1 ? "" : "s"} attached`,
      detail: "Photos may help explain colour and texture if shared by the parent.",
      tone: "info",
    });
  }

  if (notes.length === 0) {
    notes.push({
      label: "Care notes",
      value: "No specific tummy concern signal was highlighted",
      detail: "Review the dated log if symptoms or feeding changes were not captured consistently.",
      tone: "default",
    });
  }

  return notes.slice(0, 5);
}

function buildPoopSummaryRows(input: {
  data: ReportData;
  actualStools: ReportData["stoolEvents"];
  redFlagCount: number;
  hardStoolCount: number;
  looseStoolCount: number;
}): ReportPreviewRow[] {
  return [
    {
      label: "Stool events",
      value: `${input.actualStools.length} stool log${input.actualStools.length === 1 ? "" : "s"}`,
    },
    {
      label: "No-poop markers",
      value: `${input.data.stats.totalNoPoop} day${input.data.stats.totalNoPoop === 1 ? "" : "s"}`,
      tone: input.data.stats.totalNoPoop > 0 ? "caution" : "healthy",
    },
    {
      label: "Consistency pattern",
      value: `${input.hardStoolCount} hard, ${input.looseStoolCount} loose, ${Math.max(0, input.actualStools.length - input.hardStoolCount - input.looseStoolCount)} other`,
      detail: "Based on recorded Bristol-style stool type.",
    },
    {
      label: "Red-flag colours",
      value: input.redFlagCount > 0 ? `${input.redFlagCount} logged` : "None logged",
      tone: input.redFlagCount > 0 ? "alert" : "healthy",
    },
    {
      label: "Photo context",
      value: `${countPhotos(input.data)} attached`,
      detail: countPhotos(input.data) > 0 ? "Poop or diaper photos exist in this range." : "No poop or diaper photos in this range.",
    },
  ];
}

function buildDiaperRows(data: ReportData): ReportPreviewRow[] {
  return [
    {
      label: "Wet diapers",
      value: `${data.diaperStats.wet}`,
      detail: "Wet or mixed diapers",
      tone: data.diaperStats.darkUrine > 0 ? "caution" : "info",
    },
    {
      label: "Dirty diapers",
      value: `${data.diaperStats.dirty}`,
      detail: "Dirty or mixed diapers",
    },
    {
      label: "Mixed diapers",
      value: `${data.diaperStats.mixed}`,
      detail: "Wet and dirty",
    },
    {
      label: "Urine colour watch",
      value: data.diaperStats.darkUrine > 0 ? `${data.diaperStats.darkUrine} dark` : "No dark urine",
      detail: data.diaperStats.darkUrine > 0 ? "Review with intake and symptoms." : "No dark urine logged.",
      tone: data.diaperStats.darkUrine > 0 ? "caution" : "healthy",
    },
  ];
}

function buildEpisodeRows(data: ReportData, unitSystem: UnitSystem): ReportPreviewRow[] {
  const group = data.activeEpisodeGroup ?? data.episodeGroups[0] ?? null;
  if (!group) {
    return [{
      label: "Episode",
      value: "None logged",
      detail: "No illness or tummy episode was recorded in this period.",
      tone: "default",
    }];
  }
  const linkedSymptoms = data.symptomLogs.filter((log) => log.episode_id === group.episode.id);
  const latestUpdate = sortNewest(group.events)[0] ?? null;

  return [
    {
      label: "Episode",
      value: getEpisodeTypeLabel(group.episode.episode_type),
      detail: group.episode.status === "active" ? "Still in progress" : "Resolved",
      tone: group.episode.status === "active" ? "caution" : "info",
    },
    {
      label: "Started",
      value: formatDate(group.episode.started_at),
      detail: group.episode.ended_at ? `Ended ${formatDate(group.episode.ended_at)}` : "No end time recorded",
    },
    {
      label: "Linked symptoms",
      value: linkedSymptoms.length > 0
        ? linkedSymptoms.slice(0, 3).map((log) => getSymptomTypeLabel(log.symptom_type)).join(", ")
        : "None linked",
      detail: linkedSymptoms.length > 0
        ? linkedSymptoms.map((log) => formatSymptomDetails(log, unitSystem)).slice(0, 2).join(" - ")
        : "Symptoms may still appear separately in the log.",
    },
    {
      label: "Latest update",
      value: latestUpdate ? formatDate(latestUpdate.logged_at) : "No update",
      detail: latestUpdate?.title ?? group.episode.summary ?? "No episode update note in this range.",
    },
  ];
}

function buildSymptomRows(symptoms: SymptomEntry[], unitSystem: UnitSystem): ReportSymptomSummaryRow[] {
  const byType = new Map<string, SymptomEntry[]>();
  for (const symptom of symptoms) {
    byType.set(symptom.symptom_type, [...(byType.get(symptom.symptom_type) ?? []), symptom]);
  }

  return [...byType.entries()].map(([type, rows]) => {
    const sorted = sortNewest(rows);
    const highest = [...rows].sort((left, right) => severityScore(right.severity) - severityScore(left.severity))[0] ?? rows[0];
    const latest = sorted[0];
    return {
      symptom: getSymptomTypeLabel(type as SymptomEntry["symptom_type"]),
      severityLabel: getSymptomSeverityLabel(highest.severity),
      severityScore: severityScore(highest.severity),
      latest: latest ? formatDate(latest.logged_at) : "-",
      note: latest ? formatSymptomDetails(latest, unitSystem, true) : "No detail",
      tone: symptomTone(highest),
    };
  }).sort((left, right) => right.severityScore - left.severityScore || left.symptom.localeCompare(right.symptom));
}

function buildFeedingRows(logs: FeedingEntry[], unitSystem: UnitSystem): ReportFeedingSummaryRow[] {
  const grouped = new Map<string, FeedingEntry[]>();
  for (const log of logs) {
    grouped.set(log.food_type, [...(grouped.get(log.food_type) ?? []), log]);
  }

  return [...grouped.entries()].map(([foodType, rows]) => {
    const totalMl = rows.reduce((sum, log) => sum + (log.amount_ml ?? 0), 0);
    const totalMinutes = rows.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0);
    const latest = sortNewest(rows)[0] ?? null;
    const notes = [
      totalMl > 0 ? `${formatVolumeValue(totalMl, unitSystem)} total logged volume` : null,
      totalMinutes > 0 ? `${Math.round(totalMinutes)} min total` : null,
      latest ? `Latest: ${getFeedingEntryDisplayLabel(latest, unitSystem)}` : null,
    ].filter(Boolean).join(" - ");
    return {
      type: getFoodTypeLabel(foodType),
      entries: String(rows.length),
      notes: notes || "Entries logged without amount or duration detail",
    };
  }).sort((left, right) => left.type.localeCompare(right.type));
}

function buildParentNoteRows(data: ReportData): ReportPreviewRow[] {
  const rows: ReportPreviewRow[] = [];
  for (const log of data.stoolEvents) {
    if (log.notes) {
      rows.push({
        label: log.is_no_poop ? "No-poop note" : "Stool note",
        value: formatDate(log.logged_at),
        detail: log.notes,
        tone: getStoolTone(log),
      });
    }
  }
  for (const log of data.diaperLogs) {
    if (log.notes) {
      rows.push({
        label: "Diaper note",
        value: formatDate(log.logged_at),
        detail: log.notes,
      });
    }
  }
  for (const log of data.symptomLogs) {
    if (log.notes) {
      rows.push({
        label: `${getSymptomTypeLabel(log.symptom_type)} note`,
        value: formatDate(log.logged_at),
        detail: log.notes,
        tone: symptomTone(log),
      });
    }
  }

  return rows.slice(0, 4);
}

function matchesTimelineFilter(row: ReportTimelineRow, filter: ReportTimelineFilter): boolean {
  if (filter === "full") return true;
  const event = row.eventType.toLowerCase();
  const details = `${row.details} ${row.note ?? ""}`.toLowerCase();

  if (filter === "poopDiaper") {
    return event.includes("stool") || event.includes("diaper");
  }

  if (filter === "symptomsEpisodes") {
    return event.includes("symptom") || event.includes("episode");
  }

  return (
    details.includes("red-flag")
    || details.includes("dark urine")
    || event.includes("symptom")
    || event.includes("episode")
  );
}

function getTimelineTone(row: ReportTimelineRow): ReportPreviewTone {
  const text = `${row.eventType} ${row.details} ${row.note ?? ""}`.toLowerCase();
  if (text.includes("red-flag") || text.includes("severe")) return "alert";
  if (text.includes("dark urine") || text.includes("moderate") || text.includes("episode")) return "caution";
  if (text.includes("symptom")) return "info";
  return "default";
}

function splitTimelineDateTime(value: string): { dateLabel: string; timeLabel: string } {
  const parts = value.split(",");
  return {
    dateLabel: parts[0]?.trim() || "Dated events",
    timeLabel: parts.slice(1).join(",").trim() || value,
  };
}

function collectActivityDayCount(data: ReportData): number {
  const dates = [
    ...data.stoolEvents.map((log) => log.logged_at),
    ...data.diaperLogs.map((log) => log.logged_at),
    ...data.feedingLogs.map((log) => log.logged_at),
    ...data.symptomLogs.map((log) => log.logged_at),
    ...data.milestoneLogs.map((log) => log.logged_at),
    ...data.episodeGroups.map((group) => group.episode.started_at),
    ...data.episodeGroups.flatMap((group) => group.events.map((event) => event.logged_at)),
    ...data.growthLogs.map((log) => log.measured_at),
  ].map(dateKey);

  return new Set(dates).size;
}

function buildRecentDateKeys(startDate: string, endDate: string, maxDays: number): string[] {
  const rangeLength = getDateRangeLength(startDate, endDate);
  const visibleCount = Math.min(maxDays, rangeLength);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];

  for (let index = visibleCount - 1; index >= 0; index -= 1) {
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

function dateKey(value: string): string {
  return value.split("T")[0];
}

function formatDateOnly(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getRedFlagStools(data: ReportData) {
  return data.stoolEvents.filter((log) => {
    const color = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
    return log.is_no_poop === 0 && Boolean(color?.isRedFlag);
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

function hasUrineInDiaper(log: DiaperEntry): boolean {
  return log.diaper_type === "wet" || log.diaper_type === "mixed";
}

function sortNewest<T extends { logged_at: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => (left.logged_at < right.logged_at ? 1 : -1));
}

function getStoolTypeLabel(value: number | null): string {
  if (value === null) return "Type not recorded";
  const label = getStoolTextureLabel(value);
  return label ? `Type ${value} - ${label}` : `Type ${value}`;
}

function getStoolTextureLabel(value: number | null): string {
  if (value === null) return "";
  return BITSS_TYPES.find((type) => type.type === value)?.label ?? "";
}

function getStoolColorLabel(value: string): string {
  return STOOL_COLORS.find((item) => item.value === value)?.label ?? value;
}

function getStoolTone(log: ReportData["stoolEvents"][number]): ReportPreviewTone {
  const color = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
  if (color?.isRedFlag) return "alert";
  if ((log.stool_type ?? 4) <= 2 || (log.stool_type ?? 4) >= 6) return "caution";
  return "default";
}

function formatSymptomDetails(log: SymptomEntry, unitSystem: UnitSystem, includeType = false): string {
  const parts = [
    includeType ? getSymptomTypeLabel(log.symptom_type) : null,
    getSymptomSeverityLabel(log.severity),
    log.temperature_c !== null ? formatTemperatureValue(log.temperature_c, getDefaultTemperatureUnit(unitSystem)) : null,
    log.temperature_c !== null ? getTemperatureMethodLabel(log.temperature_method)?.toLowerCase() : null,
    log.notes,
  ].filter(Boolean);

  return parts.join(" - ");
}

function symptomTone(log: SymptomEntry): ReportPreviewTone {
  if (log.severity === "severe") return "alert";
  if (log.severity === "moderate") return "caution";
  return "info";
}

function severityScore(value: SymptomEntry["severity"]): number {
  if (value === "severe") return 4;
  if (value === "moderate") return 3;
  return 2;
}

function countPhotos(data: ReportData): number {
  return data.stoolEvents.filter((log) => Boolean(log.photo_path)).length
    + data.diaperLogs.filter((log) => Boolean(log.photo_path)).length;
}

function formatAverage(value: number, total: number): string {
  if (total === 0) return "0";
  return (value / total).toFixed(value / total >= 1 ? 1 : 2);
}

function getFoodTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    breast_milk: "Breastfeeding",
    formula: "Formula",
    bottle: "Bottle",
    pumping: "Pumping",
    solids: "Solids",
    water: "Water",
    other: "Other",
  };

  return labels[value] ?? value;
}
