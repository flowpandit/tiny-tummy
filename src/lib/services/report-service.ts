import {
  buildReportData,
  DEFAULT_REPORT_KIND,
  defaultReportOptions,
  getDefaultReportOptionsForMode,
  getReportModeForKind,
  normalizeReportOptions,
  type ReportData,
  type ReportHandoffSourceData,
  type ReportKind,
  type ReportMode,
  type ReportOptions,
} from "../reporting";
import { diaperIncludesWet } from "../diaper";
import type { UnitSystem } from "../types";
import type { ReportSourceRepository } from "../repositories";
import type { ChildSummarySnapshot, HandoffService } from "./handoff-service";

export interface GenerateReportInput {
  childId: string;
  startDate: string;
  endDate: string;
  options?: Partial<ReportOptions>;
  unitSystem?: UnitSystem;
  reportKind?: ReportKind;
  reportMode?: ReportMode;
}

export interface ReportService {
  getLatestActivityDate(childId: string): Promise<string | null>;
  generateReport(input: GenerateReportInput): Promise<ReportData>;
}

function mapHandoffSnapshotToReportSource(
  snapshot: ChildSummarySnapshot,
  dayKey: string,
  parentNote?: string | null,
): ReportHandoffSourceData {
  return {
    dayKey,
    lastPoop: snapshot.lastPoop,
    lastDiaper: snapshot.lastDiaper,
    lastWetDiaper: snapshot.diaperLogs.find((log) => diaperIncludesWet(log.diaper_type)) ?? null,
    lastFeed: snapshot.lastFeed,
    lastSleep: snapshot.lastSleep,
    activeEpisode: snapshot.activeEpisode,
    latestEpisodeUpdate: snapshot.latestEpisodeUpdate,
    latestSymptom: snapshot.latestSymptom,
    recentSymptoms: snapshot.recentSymptoms,
    todayPoops: snapshot.todayPoops,
    todayWetDiapers: snapshot.todayWetDiapers,
    todayDirtyDiapers: snapshot.todayDirtyDiapers,
    todayFeeds: snapshot.todayFeeds,
    hasNoPoopDay: snapshot.hasNoPoopDay,
    watchItems: snapshot.visibleAlerts.map((alert) => alert.title),
    parentNote: parentNote?.trim() || null,
  };
}

export function createReportService(
  reportSourceRepository: ReportSourceRepository,
  handoffService?: HandoffService,
): ReportService {
  return {
    getLatestActivityDate: (childId) => reportSourceRepository.getLatestActivityDate(childId),
    async generateReport(input) {
      const unitSystem = input.unitSystem ?? "metric";
      const reportKind = input.reportKind ?? DEFAULT_REPORT_KIND;
      const reportMode = input.reportMode
        ?? input.options?.mode
        ?? (input.options ? getReportModeForKind(reportKind) : defaultReportOptions.mode)
        ?? getReportModeForKind(reportKind);
      const options = normalizeReportOptions(
        input.options ?? (input.reportMode ? getDefaultReportOptionsForMode(reportMode) : defaultReportOptions),
        {
          mode: reportMode,
          childId: input.childId,
          dateRange: { start: input.startDate, end: input.endDate },
        },
      );
      const source = await reportSourceRepository.getSourceData({
        childId: input.childId,
        startDate: input.startDate,
        endDate: input.endDate,
        options,
      });
      const fallbackHandoffSummary = source.handoffSummary
        ? {
            ...source.handoffSummary,
            parentNote: options.parentNote?.trim() || (source.handoffSummary.parentNote ?? null),
          }
        : null;
      const handoffSummary = reportMode === "caregiver_handoff" && handoffService
        ? mapHandoffSnapshotToReportSource(
            await handoffService.getChildSummarySnapshot(input.childId, {
              dayKey: input.endDate,
              poopLimit: 100,
              feedingLimit: 100,
              symptomLimit: 10,
            }),
            input.endDate,
            options.parentNote,
          )
        : fallbackHandoffSummary;

      return buildReportData(
        { ...source, handoffSummary },
        input.startDate,
        input.endDate,
        options,
        unitSystem,
        reportKind,
      );
    },
  };
}
