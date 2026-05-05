import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCaregiverHandoffReport,
  buildClinicalExportReport,
  buildDoctorBriefReport,
  buildPediatricianFullReport,
  buildPoopDiaperReport,
  buildReportData,
  buildSymptomsEpisodesReport,
  getDefaultReportOptionsForMode,
  type ReportMode,
  type ReportOptions,
  type ReportSourceData,
} from "../src/lib/reporting.ts";
import type {
  Attachment,
  Child,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
} from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Luna",
  date_of_birth: "2026-04-01",
  sex: null,
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const poop: PoopEntry = {
  id: "poop-1",
  child_id: child.id,
  logged_at: "2026-04-12T09:00:00.000Z",
  stool_type: 4,
  color: "yellow",
  size: "medium",
  is_no_poop: 0,
  notes: "Normal morning poop",
  photo_path: "/local/poop.jpg",
  created_at: "2026-04-12T09:00:00.000Z",
  updated_at: "2026-04-12T09:00:00.000Z",
};

const deletedPoop: PoopEntry = {
  ...poop,
  id: "poop-deleted",
  logged_at: "2026-04-12T07:00:00.000Z",
  deleted_at: "2026-04-12T07:05:00.000Z",
};

const diaper: DiaperEntry = {
  id: "diaper-1",
  child_id: child.id,
  logged_at: "2026-04-12T10:00:00.000Z",
  diaper_type: "mixed",
  urine_color: "normal",
  stool_type: 5,
  color: "brown",
  size: "large",
  notes: "Mixed diaper",
  photo_path: "/local/diaper.jpg",
  linked_poop_log_id: null,
  created_at: "2026-04-12T10:00:00.000Z",
  updated_at: "2026-04-12T10:00:00.000Z",
};

const feed: FeedingEntry = {
  id: "feed-1",
  child_id: child.id,
  logged_at: "2026-04-12T08:00:00.000Z",
  food_type: "bottle",
  food_name: null,
  amount_ml: 90,
  duration_minutes: null,
  breast_side: null,
  bottle_content: "formula",
  reaction_notes: null,
  is_constipation_support: 0,
  notes: null,
  created_at: "2026-04-12T08:00:00.000Z",
};

const sleep: SleepEntry = {
  id: "sleep-1",
  child_id: child.id,
  sleep_type: "nap",
  started_at: "2026-04-12T11:00:00.000Z",
  ended_at: "2026-04-12T11:45:00.000Z",
  notes: "Short nap",
  created_at: "2026-04-12T11:00:00.000Z",
};

const episode: Episode = {
  id: "episode-1",
  child_id: child.id,
  episode_type: "constipation",
  status: "active",
  started_at: "2026-04-12T06:00:00.000Z",
  ended_at: null,
  summary: "Watching tummy",
  outcome: null,
  created_at: "2026-04-12T06:00:00.000Z",
  updated_at: "2026-04-12T06:00:00.000Z",
};

const symptom: SymptomEntry = {
  id: "symptom-1",
  child_id: child.id,
  episode_id: episode.id,
  symptom_type: "straining",
  severity: "moderate",
  temperature_c: null,
  temperature_method: null,
  logged_at: "2026-04-12T07:30:00.000Z",
  notes: "Straining before diaper",
  created_at: "2026-04-12T07:30:00.000Z",
  updated_at: "2026-04-12T07:30:00.000Z",
  created_by_caregiver_id: "caregiver-1",
};

const episodeEvent: EpisodeEvent = {
  id: "event-1",
  episode_id: episode.id,
  child_id: child.id,
  event_type: "progress",
  title: "Still straining",
  notes: null,
  logged_at: "2026-04-12T12:00:00.000Z",
  created_at: "2026-04-12T12:00:00.000Z",
  source_kind: null,
  source_id: null,
};

const growth: GrowthEntry = {
  id: "growth-1",
  child_id: child.id,
  measured_at: "2026-04-12T13:00:00.000Z",
  weight_kg: 5.2,
  height_cm: null,
  head_circumference_cm: null,
  notes: null,
  created_at: "2026-04-12T13:00:00.000Z",
};

const milestone: MilestoneEntry = {
  id: "milestone-1",
  child_id: child.id,
  milestone_type: "started_solids",
  logged_at: "2026-04-12T14:00:00.000Z",
  notes: null,
  created_at: "2026-04-12T14:00:00.000Z",
};

const attachment: Attachment = {
  id: "attachment-1",
  owner_table: "poop_logs",
  owner_id: poop.id,
  child_id: child.id,
  local_path: "/local/attachment.jpg",
  mime_type: "image/jpeg",
  file_size: 1024,
  created_at: "2026-04-12T09:00:00.000Z",
  updated_at: "2026-04-12T09:00:00.000Z",
  deleted_at: null,
  local_only: 1,
  attachment_sync_policy: "local_only",
};

function sourceData(): ReportSourceData {
  return {
    child,
    logs: [poop, deletedPoop],
    diaperLogs: [diaper],
    feedingLogs: [feed],
    sleepLogs: [sleep],
    growthLogs: [growth],
    episodes: [episode],
    episodeEvents: [episodeEvent],
    symptomLogs: [symptom],
    milestoneLogs: [milestone],
    attachments: [attachment],
    handoffSummary: {
      dayKey: "2026-04-12",
      lastPoop: poop,
      lastDiaper: diaper,
      lastWetDiaper: diaper,
      lastFeed: feed,
      lastSleep: sleep,
      activeEpisode: episode,
      latestEpisodeUpdate: episodeEvent,
      latestSymptom: symptom,
      recentSymptoms: [symptom],
      todayPoops: 1,
      todayWetDiapers: 1,
      todayDirtyDiapers: 1,
      todayFeeds: 1,
      hasNoPoopDay: false,
      watchItems: ["Watch straining"],
      parentNote: "Please offer a bottle before nap.",
    },
  };
}

function options(mode: ReportMode, overrides: Partial<ReportOptions> = {}): ReportOptions {
  return {
    ...getDefaultReportOptionsForMode(mode, {
      childId: child.id,
      dateRange: { start: "2026-04-01", end: "2026-04-12" },
      generatedAt: "2026-04-12T16:00:00.000Z",
    }),
    ...overrides,
  };
}

test("report mode defaults keep privacy and mode-specific context explicit", () => {
  const pediatrician = options("pediatrician_full");
  const poopDiaper = options("poop_diaper");
  const handoff = options("caregiver_handoff");

  assert.equal(pediatrician.includeDeleted, false);
  assert.equal(pediatrician.includePhotos, false);
  assert.equal(pediatrician.includeAttachmentMetadata, false);
  assert.equal(pediatrician.includeFeedingContext, true);
  assert.equal(pediatrician.includeTimeline, true);
  assert.equal(poopDiaper.includeSymptoms, false);
  assert.equal(poopDiaper.includeGrowthContext, false);
  assert.equal(handoff.includeSleepContext, true);
  assert.equal(handoff.maxTimelineRows, 12);
});

test("pediatrician_full builds the stable report DTO and preserves the current PDF adapter data", () => {
  const data = buildReportData(sourceData(), "2026-04-01", "2026-04-12", options("pediatrician_full"), "metric", "fullHealth");

  assert.equal(data.report.schemaVersion, "tiny_tummy_report_v1");
  assert.equal(data.report.mode, "pediatrician_full");
  assert.ok(data.report.sections.poopSummary);
  assert.ok(data.report.sections.diaperSummary);
  assert.ok(data.report.sections.feedingContext);
  assert.ok(data.report.sections.symptomsSummary);
  assert.ok(data.report.sections.growthContext);
  assert.ok(data.report.timeline.length > 0);
  assert.equal(data.report.attachmentPolicy.includePhotos, false);
  assert.equal(data.report.attachmentPolicy.attachments.length, 0);
});

test("doctor_brief is concise and excludes the long timeline by default", () => {
  const report = buildDoctorBriefReport(sourceData(), options("doctor_brief"));

  assert.equal(report.mode, "doctor_brief");
  assert.equal(report.timeline.length, 0);
  assert.equal(report.keyMetrics.some((metric) => metric.id === "last_poop"), true);
  assert.ok(report.sections.poopSummary);
  assert.ok(report.sections.symptomsSummary);
});

test("poop_diaper focuses on stool and diaper data while excluding deleted rows by default", () => {
  const report = buildPoopDiaperReport(sourceData(), options("poop_diaper"));
  const stoolCount = report.sections.poopSummary?.rows.find((row) => row.label === "Stool events")?.value;

  assert.equal(report.mode, "poop_diaper");
  assert.equal(stoolCount, "2");
  assert.ok(report.sections.poopSummary);
  assert.ok(report.sections.diaperSummary);
  assert.equal(report.sections.symptomsSummary, undefined);
  assert.equal(report.timeline.every((row) => ["Stool", "Stool + diaper", "Diaper"].includes(row.eventType)), true);
  assert.equal(report.dataQuality.includesDeleted, false);
});

test("symptoms_episodes and caregiver_handoff build focused mode sections", () => {
  const symptoms = buildSymptomsEpisodesReport(sourceData(), options("symptoms_episodes"));
  const handoff = buildCaregiverHandoffReport(sourceData(), options("caregiver_handoff"));

  assert.equal(symptoms.mode, "symptoms_episodes");
  assert.ok(symptoms.sections.symptomsSummary);
  assert.ok(symptoms.sections.episodeSummary);
  assert.equal(symptoms.sections.diaperSummary, undefined);
  assert.equal(symptoms.timeline.every((row) => ["Symptom", "Episode", "Episode update"].includes(row.eventType)), true);

  assert.equal(handoff.mode, "caregiver_handoff");
  assert.ok(handoff.sections.caregiverHandoff);
  assert.equal(handoff.sections.caregiverHandoff?.rows.some((row) => row.label === "Last sleep" && row.value !== "None"), true);
  assert.equal(handoff.sections.caregiverHandoff?.rows.some((row) => row.label === "Parent note" && row.detail?.includes("bottle")), true);
});

test("clinical_export builds and attachment metadata remains local-only and explicit", () => {
  const noMetadata = buildClinicalExportReport(sourceData(), options("clinical_export"));
  const withMetadata = buildClinicalExportReport(sourceData(), options("clinical_export", {
    includeAttachmentMetadata: true,
  }));

  assert.equal(noMetadata.mode, "clinical_export");
  assert.ok(noMetadata.sections.growthContext);
  assert.ok(noMetadata.sections.milestonesContext);
  assert.equal(noMetadata.attachmentPolicy.attachments.length, 0);
  assert.equal(withMetadata.attachmentPolicy.attachments.length, 3);
  assert.equal(withMetadata.attachmentPolicy.attachments.every((item) => item.policy === "local_only_metadata"), true);
});

test("sparse logging produces a data-quality note", () => {
  const report = buildPediatricianFullReport(sourceData(), options("pediatrician_full"));

  assert.equal(report.dataQuality.isSparse, true);
  assert.equal(report.dataQuality.notes.some((note) => note.includes("sparse")), true);
});

test("caregiver attribution is excluded unless explicitly requested", () => {
  const hidden = buildSymptomsEpisodesReport(sourceData(), options("symptoms_episodes"));
  const exposed = buildSymptomsEpisodesReport(sourceData(), options("symptoms_episodes", {
    includeCaregiverAttribution: true,
  }));

  assert.equal(hidden.sections.symptomsSummary?.rows.find((row) => row.sourceId === symptom.id)?.caregiverId, undefined);
  assert.equal(exposed.sections.symptomsSummary?.rows.find((row) => row.sourceId === symptom.id)?.caregiverId, "caregiver-1");
});
