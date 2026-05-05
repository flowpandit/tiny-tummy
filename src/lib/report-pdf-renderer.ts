import { buildNativeReportPdfPayloadWithAssets } from "./report-native-pdf";
import { generateNativeReportPdf } from "./tauri";
import type { ReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export interface ReportPdfRenderResult {
  base64Data: string;
  renderer: "rust";
  durationMs: number;
}

export async function renderReportPdfBase64(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
}): Promise<ReportPdfRenderResult> {
  const startedAt = performance.now();
  const base64Data = await generateNativeReportPdf(await buildNativeReportPdfPayloadWithAssets(input));

  return {
    base64Data,
    renderer: "rust",
    durationMs: performance.now() - startedAt,
  };
}
