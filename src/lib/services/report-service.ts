import { buildReportData, defaultReportOptions, DEFAULT_REPORT_KIND, type ReportData, type ReportKind, type ReportOptions } from "../reporting";
import type { UnitSystem } from "../types";
import type { ReportSourceRepository } from "../repositories";

export interface GenerateReportInput {
  childId: string;
  startDate: string;
  endDate: string;
  options?: ReportOptions;
  unitSystem?: UnitSystem;
  reportKind?: ReportKind;
}

export interface ReportService {
  getLatestActivityDate(childId: string): Promise<string | null>;
  generateReport(input: GenerateReportInput): Promise<ReportData>;
}

export function createReportService(reportSourceRepository: ReportSourceRepository): ReportService {
  return {
    getLatestActivityDate: (childId) => reportSourceRepository.getLatestActivityDate(childId),
    async generateReport(input) {
      const options = input.options ?? defaultReportOptions;
      const unitSystem = input.unitSystem ?? "metric";
      const reportKind = input.reportKind ?? DEFAULT_REPORT_KIND;
      const source = await reportSourceRepository.getSourceData({
        childId: input.childId,
        startDate: input.startDate,
        endDate: input.endDate,
        options,
      });

      return buildReportData(source, input.startDate, input.endDate, options, unitSystem, reportKind);
    },
  };
}
