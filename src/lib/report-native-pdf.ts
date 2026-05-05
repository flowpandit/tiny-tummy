import {
  buildReportPreviewModel,
  type ReportPreviewModel,
} from "./report-preview-model";
import type { ReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export type NativeReportPdfPayload = ReportPreviewModel & {
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
  return {
    ...buildReportPreviewModel({
      child: input.child,
      startDate: input.startDate,
      endDate: input.endDate,
      data: input.reportData,
      unitSystem: input.unitSystem,
      generatedAt: input.generatedAt,
    }),
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
  return buildNativeReportPdfPayload({
    ...input,
    childAvatarDataUrl: await loadChildAvatarDataUrl(input.child.id),
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
