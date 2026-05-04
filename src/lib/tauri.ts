import { invoke } from "@tauri-apps/api/core";
import type { GuidanceTip, HealthStatus } from "./types";
import type { ReportPdfPayload } from "./report-pdf";

export async function checkFrequencyAlert(
  childName: string,
  dateOfBirth: string,
  feedingType: string,
  lastPoopAt: string | null,
): Promise<[string, string, string, string] | null> {
  try {
    return await invoke("check_frequency_alert", {
      childName,
      dateOfBirth,
      feedingType,
      lastPoopAt,
    });
  } catch {
    return null;
  }
}

export async function checkColorAlert(
  childName: string,
  dateOfBirth: string,
  feedingType: string,
  color: string,
): Promise<[string, string, string, string] | null> {
  try {
    return await invoke("check_color_alert", {
      childName,
      dateOfBirth,
      feedingType,
      color,
    });
  } catch {
    return null;
  }
}

export async function getChildStatus(
  dateOfBirth: string,
  feedingType: string,
  lastPoopAt: string | null,
): Promise<[HealthStatus, string]> {
  try {
    return await invoke("get_child_status", {
      dateOfBirth,
      feedingType,
      lastPoopAt,
    });
  } catch {
    return ["unknown", "Unable to determine status"];
  }
}

export async function getGuidanceTips(): Promise<GuidanceTip[]> {
  try {
    return await invoke("get_guidance_tips");
  } catch {
    return [];
  }
}

export async function generateReportPdf(payload: ReportPdfPayload): Promise<string> {
  return await invoke("generate_report_pdf", { payload });
}

export interface SavedDownloadsPdf {
  fileName: string;
  uri: string;
}

export async function savePdfToDownloads(fileName: string, base64Data: string): Promise<SavedDownloadsPdf> {
  return await invoke("save_pdf_to_downloads", {
    fileName,
    base64Data,
  });
}

export async function openPdfFromDownloads(uri: string): Promise<void> {
  return await invoke("open_pdf_from_downloads", { uri });
}

export async function sharePdfReport(fileName: string, base64Data: string): Promise<void> {
  return await invoke("share_pdf_report", {
    fileName,
    base64Data,
  });
}
