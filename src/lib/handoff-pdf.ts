import { getDefaultReportOptionsForMode, type ReportOptions } from "./reporting";

export const CAREGIVER_HANDOFF_PDF_ERROR_MESSAGE = "Could not generate the handoff PDF. Please try again.";

export function buildCaregiverHandoffReportOptions(input: {
  childId: string;
  dayKey: string;
  generatedAt?: string;
  parentNote?: string | null;
}): ReportOptions {
  return {
    ...getDefaultReportOptionsForMode("caregiver_handoff", {
      childId: input.childId,
      dateRange: { start: input.dayKey, end: input.dayKey },
      generatedAt: input.generatedAt,
    }),
    includePhotos: false,
    includeAttachmentMetadata: false,
    includeDeleted: false,
    includeTimeline: true,
    includeCaregiverAttribution: false,
    maxTimelineRows: 12,
    parentNote: input.parentNote?.trim() || null,
  };
}

export function getCaregiverHandoffPdfErrorMessage(): string {
  return CAREGIVER_HANDOFF_PDF_ERROR_MESSAGE;
}

export function buildCaregiverHandoffPdfFileName(childName: string, dayKey: string, generatedAt = new Date()): string {
  const timestamp = generatedAt.toISOString().replace(/[:.]/g, "-");
  const childSlug = childName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "child";

  return `tiny-tummy-caregiver-handoff-${childSlug}-${dayKey}-${timestamp}.pdf`;
}
