import {
  buildReportPreviewModel,
  type ReportPreviewModel,
} from "./report-preview-model";
import type { ReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export type NativeReportPdfPayload = ReportPreviewModel;

export function buildNativeReportPdfPayload(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
}): NativeReportPdfPayload {
  return buildReportPreviewModel({
    child: input.child,
    startDate: input.startDate,
    endDate: input.endDate,
    data: input.reportData,
    unitSystem: input.unitSystem,
    generatedAt: input.generatedAt,
  });
}
