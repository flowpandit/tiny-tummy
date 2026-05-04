import { formatLocalDateKey, getAgeLabelFromDob } from "./utils.ts";
import type { Child } from "./types.ts";
import type { ReportData, ReportOptions } from "./reporting.ts";

export interface ReportOptionToggle {
  key: keyof ReportOptions;
  label: string;
}

export const REPORT_OPTION_TOGGLES: ReportOptionToggle[] = [
  { key: "includeFeeds", label: "Feeds" },
  { key: "includeSymptoms", label: "Symptoms" },
  { key: "includeMilestones", label: "Milestones" },
  { key: "includeEpisodes", label: "Episodes" },
  { key: "includeEpisodeSummary", label: "Active episode" },
  { key: "includeGrowth", label: "Growth" },
  { key: "includeNotes", label: "Notes" },
];

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
    detail: "The exported PDF uses a 3-part layout: executive summary, clinical context, and a chronological appendix.",
  };
}
