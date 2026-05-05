import { formatLocalDateKey, getAgeLabelFromDob } from "./utils.ts";
import type { Child } from "./types.ts";
import { DEFAULT_REPORT_KIND, type ReportData, type ReportKind, type ReportOptions } from "./reporting.ts";

export interface ReportOptionToggle {
  key: keyof ReportOptions;
  label: string;
}

export interface ReportKindOption {
  value: ReportKind;
  label: string;
  description: string;
}

export const REPORT_KIND_OPTIONS: ReportKindOption[] = [
  {
    value: "poopTummy",
    label: "Poop & tummy",
    description: "Poop, diapers, stool patterns, and tummy context.",
  },
  {
    value: "fullHealth",
    label: "Full health",
    description: "The broader pediatric health summary across every log type.",
  },
];

export const REPORT_CORE_ITEMS_BY_KIND: Record<ReportKind, string[]> = {
  poopTummy: ["Poop logs", "Diapers", "Stool colors", "No-poop days"],
  fullHealth: ["Poop logs", "Diapers", "Daily timeline"],
};

export const FULL_HEALTH_REPORT_OPTION_TOGGLES: ReportOptionToggle[] = [
  { key: "includeFeeds", label: "Feeds" },
  { key: "includeSymptoms", label: "Symptoms" },
  { key: "includeMilestones", label: "Milestones" },
  { key: "includeEpisodes", label: "Episodes" },
  { key: "includeEpisodeSummary", label: "Active episode" },
  { key: "includeGrowth", label: "Growth" },
  { key: "includePhotos", label: "Photos" },
  { key: "includeNotes", label: "Notes" },
];

export const POOP_TUMMY_REPORT_OPTION_TOGGLES: ReportOptionToggle[] = [
  { key: "includeFeeds", label: "Feeds" },
  { key: "includeSymptoms", label: "Symptoms" },
  { key: "includeEpisodes", label: "Episodes" },
  { key: "includeEpisodeSummary", label: "Active episode" },
  { key: "includePhotos", label: "Photos" },
  { key: "includeNotes", label: "Notes" },
];

export const REPORT_OPTION_TOGGLES = FULL_HEALTH_REPORT_OPTION_TOGGLES;

export function getReportKindOption(reportKind: ReportKind) {
  return REPORT_KIND_OPTIONS.find((item) => item.value === reportKind) ?? REPORT_KIND_OPTIONS.find((item) => item.value === DEFAULT_REPORT_KIND)!;
}

export function getReportOptionToggles(reportKind: ReportKind): ReportOptionToggle[] {
  return reportKind === "poopTummy"
    ? POOP_TUMMY_REPORT_OPTION_TOGGLES
    : FULL_HEALTH_REPORT_OPTION_TOGGLES;
}

export function getReportCoreItems(reportKind: ReportKind): string[] {
  return REPORT_CORE_ITEMS_BY_KIND[reportKind];
}

export function addDays(dateString: string, delta: number): string {
  const next = new Date(`${dateString}T00:00:00`);
  next.setDate(next.getDate() + delta);
  return formatLocalDateKey(next);
}

export function getDefaultReportDateRange(now = new Date()) {
  const today = formatLocalDateKey(now);
  const thirtyDaysAgo = formatLocalDateKey(new Date(now.getTime() - 30 * 86400000));
  return { today, thirtyDaysAgo };
}

export function getReportDateRangeFromLatestActivity(latestActivity: string | null) {
  if (!latestActivity) return null;
  const latestDay = latestActivity.split("T")[0];
  return {
    startDate: addDays(latestDay, -29),
    endDate: latestDay,
  };
}

export function hasReportableData(reportData: ReportData | null) {
  if (!reportData) return false;

  return [
    reportData.logs,
    reportData.diaperLogs,
    reportData.stoolEvents,
    reportData.feedingLogs,
    reportData.growthLogs,
    reportData.symptomLogs,
    reportData.milestoneLogs,
    reportData.episodeGroups,
    reportData.timeline,
  ].some((items) => items.length > 0);
}

export function getReportSaveLabel(isAndroid: boolean) {
  return isAndroid ? "Save PDF to Downloads" : "Save PDF";
}

export function getReportSaveHelpText(isAndroid: boolean) {
  return isAndroid
    ? "Generates an ink-friendly PDF and saves it directly to your Downloads folder."
    : "Generates an ink-friendly PDF and lets you choose where to save it.";
}

export function buildReportPatientSummary(child: Child, startDate: string, endDate: string) {
  return {
    title: child.name,
    subtitle: `${getAgeLabelFromDob(child.date_of_birth)} · ${startDate} to ${endDate}`,
    detail: "The exported PDF includes a focused summary, clinical context, and a chronological appendix.",
  };
}
