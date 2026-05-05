import {
  buildReportPreviewModel,
  type ReportPreviewModel,
  type ReportPreviewTone,
} from "./report-preview-model";
import type { ReportData, TinyTummyReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export type NativeReportPdfPayload = ReportPreviewModel & {
  reportMode: TinyTummyReportData["mode"];
  dataQuality: TinyTummyReportData["dataQuality"];
  attachmentPolicySummary: string;
  includePhotos: boolean;
  includeAttachmentMetadata: boolean;
  childAvatarDataUrl?: string | null;
};

export function buildNativeReportPdfPayload(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
  childAvatarDataUrl?: string | null;
}): NativeReportPdfPayload {
  const preview = buildReportPreviewModel({
    child: input.child,
    startDate: input.startDate,
    endDate: input.endDate,
    data: input.reportData,
    unitSystem: input.unitSystem,
    generatedAt: input.generatedAt,
  });
  const report = input.reportData.report;

  return {
    ...applyStableReportDto(preview, report),
    reportMode: report.mode,
    dataQuality: report.dataQuality,
    attachmentPolicySummary: report.attachmentPolicy.summary,
    includePhotos: report.attachmentPolicy.includePhotos,
    includeAttachmentMetadata: report.attachmentPolicy.includeAttachmentMetadata,
    childAvatarDataUrl: input.childAvatarDataUrl ?? null,
  };
}

export async function buildNativeReportPdfPayloadWithAssets(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
}): Promise<NativeReportPdfPayload> {
  const includePhotos = input.reportData.report.attachmentPolicy.includePhotos;
  return buildNativeReportPdfPayload({
    ...input,
    childAvatarDataUrl: includePhotos ? await loadChildAvatarDataUrl(input.child.id) : null,
  });
}

function applyStableReportDto(
  preview: ReportPreviewModel,
  report: TinyTummyReportData,
): ReportPreviewModel {
  return {
    ...preview,
    disclaimer: "This report summarizes logs from Tiny Tummy. It does not diagnose or replace medical advice.",
    privacyFooter: report.privacyNote,
    brief: {
      ...preview.brief,
      concerns: mergeStableBriefRows(preview.brief.concerns, report),
      questions: report.questions.length > 0 ? report.questions : preview.brief.questions,
    },
  };
}

function mergeStableBriefRows(
  previewRows: ReportPreviewModel["brief"]["concerns"],
  report: TinyTummyReportData,
): ReportPreviewModel["brief"]["concerns"] {
  const stableRows = report.brief.rows.map((row) => ({
    label: row.label === "Key concern summary" ? "Stool signal" : row.label,
    value: row.value,
    detail: row.detail ?? "",
    tone: (row.tone ?? "default") as ReportPreviewTone,
  }));
  const stableByLabel = new Map(stableRows.map((row) => [row.label, row]));

  return previewRows.map((row) => {
    const stable = stableByLabel.get(row.label);
    if (!stable) return row;

    return {
      ...row,
      value: stable.value || row.value,
      detail: stable.detail || row.detail,
      tone: stable.tone,
    };
  });
}

async function loadChildAvatarDataUrl(childId: string): Promise<string | null> {
  try {
    const { loadAvatarDataUrl } = await import("./photos");
    return await loadAvatarDataUrl(childId);
  } catch {
    return null;
  }
}
