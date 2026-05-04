import { renderReportPreviewToPdfBase64 } from "./report-html-pdf";
import { buildNativeReportPdfPayload } from "./report-native-pdf";
import { generateNativeReportPdf } from "./tauri";
import type { ReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export type ReportPdfRenderer = "react" | "rust";

export const REPORT_PDF_RENDERER_STORAGE_KEY = "tt.reportPdfRenderer";
export const REPORT_PDF_RENDERER_ENV_KEY = "VITE_TT_REPORT_PDF_RENDERER";

export interface ReportPdfRenderResult {
  base64Data: string;
  renderer: ReportPdfRenderer;
  durationMs: number;
}

export function normalizeReportPdfRenderer(value: unknown): ReportPdfRenderer | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "react" || normalized === "html") return "react";
  if (normalized === "rust" || normalized === "native") return "rust";
  return null;
}

export function getReportPdfRenderer(): ReportPdfRenderer {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const envRenderer = normalizeReportPdfRenderer(env?.[REPORT_PDF_RENDERER_ENV_KEY]);
  if (envRenderer) return envRenderer;

  if (typeof window !== "undefined") {
    try {
      const storedRenderer = normalizeReportPdfRenderer(window.localStorage.getItem(REPORT_PDF_RENDERER_STORAGE_KEY));
      if (storedRenderer) return storedRenderer;
    } catch {
      return "react";
    }
  }

  return "react";
}

export async function renderReportPdfBase64(input: {
  previewRoot: HTMLElement | null;
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  renderer?: ReportPdfRenderer;
}): Promise<ReportPdfRenderResult> {
  const renderer = input.renderer ?? getReportPdfRenderer();
  const startedAt = performance.now();
  const base64Data = renderer === "rust"
    ? await generateNativeReportPdf(buildNativeReportPdfPayload(input))
    : await renderReactReportPdf(input.previewRoot);

  return {
    base64Data,
    renderer,
    durationMs: performance.now() - startedAt,
  };
}

async function renderReactReportPdf(previewRoot: HTMLElement | null) {
  if (!previewRoot) {
    throw new Error("Report preview is still preparing. Try again in a moment.");
  }

  return await renderReportPreviewToPdfBase64(previewRoot);
}
