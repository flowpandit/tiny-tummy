import {
  buildReportPreviewModel,
  type ReportPreviewModel,
  type ReportPreviewMetric,
  type ReportPreviewRow,
  type ReportPreviewTone,
} from "./report-preview-model";
import { formatHandoffTime, type HandoffSummary } from "./handoff-summary";
import type { ReportData, TinyTummyReportData } from "./reporting";
import type { Child, UnitSystem } from "./types";

export interface NativeHandoffTimelineRow {
  time: string;
  event: string;
  details: string;
  note: string;
  attributionLabel?: string | null;
  tone: ReportPreviewTone;
}

export interface NativeCaregiverHandoffPdfModel {
  todayMetrics: ReportPreviewMetric[];
  lastEventRows: ReportPreviewRow[];
  nextDueRows: ReportPreviewRow[];
  watchRows: ReportPreviewRow[];
  parentNoteRows: ReportPreviewRow[];
  timelineRows: NativeHandoffTimelineRow[];
}

export type NativeReportPdfPayload = ReportPreviewModel & {
  reportMode: TinyTummyReportData["mode"];
  dataQuality: TinyTummyReportData["dataQuality"];
  attachmentPolicySummary: string;
  includePhotos: boolean;
  includeAttachmentMetadata: boolean;
  childAvatarDataUrl?: string | null;
  handoff?: NativeCaregiverHandoffPdfModel | null;
};

export function buildNativeReportPdfPayload(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
  childAvatarDataUrl?: string | null;
  handoffSummary?: HandoffSummary | null;
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
    handoff: report.mode === "caregiver_handoff"
      ? buildNativeHandoffPdfModel(input.reportData, input.handoffSummary ?? null)
      : null,
  };
}

export async function buildNativeReportPdfPayloadWithAssets(input: {
  child: Child;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unitSystem: UnitSystem;
  generatedAt?: Date;
  handoffSummary?: HandoffSummary | null;
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
  const isCaregiverHandoff = report.mode === "caregiver_handoff";
  const stablePreview = isCaregiverHandoff ? trimPreviewForCaregiverHandoff(preview) : preview;

  return {
    ...stablePreview,
    childId: isCaregiverHandoff ? "" : stablePreview.childId,
    disclaimer: isCaregiverHandoff
      ? "This handoff is an observational summary of Tiny Tummy logs."
      : "This report summarizes logs from Tiny Tummy. It does not diagnose or replace medical advice.",
    privacyFooter: isCaregiverHandoff
      ? "Generated locally by Tiny Tummy. Your baby's data stays on your device unless you choose to export or share this report."
      : report.privacyNote,
    brief: {
      ...stablePreview.brief,
      concerns: isCaregiverHandoff ? [] : mergeStableBriefRows(stablePreview.brief.concerns, report),
      questions: isCaregiverHandoff
        ? []
        : report.questions.length > 0
          ? report.questions
          : stablePreview.brief.questions,
    },
  };
}

function trimPreviewForCaregiverHandoff(preview: ReportPreviewModel): ReportPreviewModel {
  return {
    ...preview,
    brief: {
      summary: "Caregiver handoff for the selected window.",
      concerns: [],
      questions: [],
      lastImportantEvents: [],
      metrics: [],
    },
    pattern: {
      metrics: [],
      dailyPoints: [],
      noPoopDates: [],
      stoolTypeTrend: [],
      colourBreakdown: [],
      hydrationRows: [],
      clinicalNotes: [],
    },
    context: {
      careNotes: [],
      poopSummaryRows: [],
      diaperRows: [],
      episodeRows: [],
      symptomRows: [],
      feedingRows: [],
      parentNoteRows: preview.context.parentNoteRows,
    },
    timelineGroups: [],
  };
}

function buildNativeHandoffPdfModel(
  reportData: ReportData,
  summary: HandoffSummary | null,
): NativeCaregiverHandoffPdfModel {
  if (summary) {
    return buildNativeHandoffPdfModelFromSummary(summary);
  }

  const caregiverRows = reportData.report.sections.caregiverHandoff?.rows ?? [];
  const parentNote = caregiverRows.find((row) => row.label === "Parent note");
  const fallbackTimelineRows = reportData.timeline.slice(0, 8).map((row, index) => ({
    time: row.dateTime,
    event: row.eventType,
    details: row.details,
    note: row.note ?? "",
    attributionLabel: null,
    tone: (index === 0 ? "info" : "default") as ReportPreviewTone,
  }));

  return {
    todayMetrics: caregiverRows
      .filter((row) => row.label === "Today")
      .map((row) => ({
        label: row.label,
        value: row.value,
        detail: row.detail,
        tone: "info" as ReportPreviewTone,
      })),
    lastEventRows: caregiverRows
      .filter((row) => row.label.startsWith("Last ") || row.label === "Active episode")
      .map((row) => ({
        label: row.label,
        value: row.value,
        detail: row.detail,
        tone: (row.tone ?? "default") as ReportPreviewTone,
      })),
    nextDueRows: [
      {
        label: "Next due",
        value: "No clear pattern yet",
        detail: "Based on recent logs, Tiny Tummy does not have enough data for a clearer estimate.",
        tone: "default" as ReportPreviewTone,
      },
    ],
    watchRows: caregiverRows
      .filter((row) => row.label === "Watch items")
      .map((row) => ({
        label: row.label,
        value: row.value,
        detail: row.detail,
        tone: (row.tone ?? "info") as ReportPreviewTone,
      })),
    parentNoteRows: parentNote?.detail
      ? [{
          label: "Parent note",
          value: "Provided",
          detail: parentNote.detail,
          tone: "info" as ReportPreviewTone,
        }]
      : [],
    timelineRows: fallbackTimelineRows,
  };
}

function buildNativeHandoffPdfModelFromSummary(summary: HandoffSummary): NativeCaregiverHandoffPdfModel {
  return {
    todayMetrics: [
      { label: "Poops", value: String(summary.todaySummary.poopCount), tone: "default" },
      { label: "Wet diapers", value: String(summary.todaySummary.wetDiaperCount), tone: "info" },
      {
        label: "Dirty / mixed",
        value: `${summary.todaySummary.dirtyDiaperCount} / ${summary.todaySummary.mixedDiaperCount}`,
        detail: "Dirty and mixed diapers",
        tone: "default",
      },
      { label: "Feeds", value: String(summary.todaySummary.feedCount), tone: "default" },
      { label: "Sleep", value: summary.todaySummary.sleepTotal, tone: "default" },
      { label: "Symptoms", value: String(summary.todaySummary.symptomCount), tone: summary.todaySummary.symptomCount > 0 ? "caution" : "healthy" },
    ],
    lastEventRows: [
      handoffEventRow("Last poop", summary.lastEvents.lastPoop),
      handoffEventRow("Last wet diaper", summary.lastEvents.lastWetDiaper),
      handoffEventRow("Last feed", summary.lastEvents.lastFeed),
      handoffEventRow("Last sleep", summary.lastEvents.lastSleep),
      handoffEventRow("Last symptom", summary.lastEvents.lastSymptom),
      summary.lastEvents.activeEpisode
        ? {
            label: "Active episode",
            value: summary.lastEvents.activeEpisode.title,
            detail: summary.lastEvents.activeEpisode.detail,
            tone: "caution",
          }
        : {
            label: "Active episode",
            value: "None logged",
            detail: "No active episode in the handoff summary.",
            tone: "healthy",
          },
    ],
    nextDueRows: [
      handoffDueRow("Next feed", summary.nextDue.nextFeed),
      handoffDueRow("Next sleep", summary.nextDue.nextSleep),
      handoffDueRow("Next diaper check", summary.nextDue.nextDiaperCheck),
    ],
    watchRows: summary.watchItems.length > 0
      ? summary.watchItems.map((item) => ({
          label: item.label,
          value: "Watch",
          detail: item.detail,
          tone: "caution" as ReportPreviewTone,
        }))
      : [{
          label: "Watch items",
          value: "None logged",
          detail: "No watch items logged for this window.",
          tone: "healthy" as ReportPreviewTone,
        }],
    parentNoteRows: [
      ...(summary.preparedBy
        ? [{
            label: "Prepared by",
            value: summary.preparedBy.displayName,
            detail: summary.preparedBy.roleLabel,
            tone: "info" as ReportPreviewTone,
          }]
        : []),
      ...(summary.parentNote
        ? [{
          label: "Parent note",
          value: "Provided",
          detail: summary.parentNote,
          tone: "info" as ReportPreviewTone,
        }]
        : []),
    ],
    timelineRows: summary.timeline.map((item) => ({
      time: formatHandoffTime(item.occurredAt),
      event: item.title,
      details: item.detail,
      note: "",
      attributionLabel: item.attributionLabel ?? null,
      tone: "default" as ReportPreviewTone,
    })),
  };
}

function formatHandoffPdfDetail(detail: string, attributionLabel: string | null | undefined): string {
  return [detail, attributionLabel].filter(Boolean).join(" - ");
}

function handoffEventRow(
  label: string,
  event: HandoffSummary["lastEvents"]["lastPoop"],
): ReportPreviewRow {
  if (!event) {
    return {
      label,
      value: "No log yet",
      detail: "No matching event logged in this handoff window.",
      tone: "default",
    };
  }

  return {
    label,
    value: formatHandoffTime(event.occurredAt),
    detail: formatHandoffPdfDetail(event.detail, event.attributionLabel),
    tone: event.kind === "symptom" ? "caution" : "default",
  };
}

function handoffDueRow(label: string, item: HandoffSummary["nextDue"]["nextFeed"]): ReportPreviewRow {
  const detail = item.windowStart && item.windowEnd
    ? `${formatHandoffTime(item.windowStart)} to ${formatHandoffTime(item.windowEnd)}`
    : item.detail;

  return {
    label,
    value: item.label,
    detail,
    tone: item.status === "based_on_recent_logs" ? "info" : "default",
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
