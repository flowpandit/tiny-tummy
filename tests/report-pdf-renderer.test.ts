import test from "node:test";
import assert from "node:assert/strict";
import { buildNativeReportPdfPayload } from "../src/lib/report-native-pdf.ts";
import { buildHandoffSummary } from "../src/lib/handoff-summary.ts";
import {
  buildReportData,
  getDefaultReportOptionsForKind,
  getDefaultReportOptionsForMode,
} from "../src/lib/reporting.ts";
import type { Child, DiaperEntry, PoopEntry } from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Maya",
  date_of_birth: "2025-10-03",
  sex: null,
  feeding_type: "mixed",
  avatar_color: "#8b9b76",
  is_active: 1,
  created_at: "2026-04-01T00:00:00",
  updated_at: "2026-04-01T00:00:00",
};

const poop: PoopEntry = {
  id: "poop-1",
  child_id: child.id,
  logged_at: "2026-05-04T08:20:00",
  stool_type: 4,
  color: "yellow",
  size: "medium",
  is_no_poop: 0,
  notes: "Soft yellow stool",
  photo_path: null,
  created_at: "2026-05-04T08:20:00",
  updated_at: "2026-05-04T08:20:00",
};

const diaper: DiaperEntry = {
  id: "diaper-1",
  child_id: child.id,
  logged_at: "2026-05-04T09:00:00",
  diaper_type: "mixed",
  urine_color: "normal",
  stool_type: 5,
  color: "brown",
  size: "small",
  notes: null,
  photo_path: null,
  linked_poop_log_id: null,
  created_at: "2026-05-04T09:00:00",
  updated_at: "2026-05-04T09:00:00",
};

test("native report payload reuses the preview model structure", () => {
  const data = buildReportData({
    logs: [poop],
    diaperLogs: [diaper],
    feedingLogs: [],
    growthLogs: [],
    episodes: [],
    episodeEvents: [],
    symptomLogs: [],
    milestoneLogs: [],
  }, "2026-05-01", "2026-05-04");

  const payload = buildNativeReportPdfPayload({
    child,
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    reportData: data,
    unitSystem: "metric",
    generatedAt: new Date("2026-05-04T15:50:00"),
  });

  assert.equal(payload.title, "Poop & Tummy Report");
  assert.equal(payload.childName, "Maya");
  assert.equal(payload.reportMode, data.report.mode);
  assert.equal(payload.dataQuality.isSparse, data.report.dataQuality.isSparse);
  assert.deepEqual(payload.brief.questions, data.report.questions);
  assert.equal(payload.privacyFooter, data.report.privacyNote);
  assert.equal(payload.includePhotos, false);
  assert.equal(payload.includeAttachmentMetadata, false);
  assert.match(payload.attachmentPolicySummary, /Photos and attachment metadata are excluded/);
  assert.equal(payload.pattern.dailyPoints.at(-1)?.stoolCount, 2);
  assert.equal(payload.pattern.dailyPoints.at(-1)?.mixed, 1);
  assert.equal(payload.context.diaperRows.some((row) => row.label === "Mixed diapers"), true);
  assert.equal(payload.timelineGroups.length > 0, true);
});

test("native report payload keeps selected date range when report-page default options have a blank range", () => {
  const data = buildReportData({
    child,
    logs: [poop],
    diaperLogs: [diaper],
    feedingLogs: [],
    growthLogs: [],
    episodes: [],
    episodeEvents: [],
    symptomLogs: [],
    milestoneLogs: [],
  }, "2026-05-01", "2026-05-04", getDefaultReportOptionsForKind("poopTummy"));

  const payload = buildNativeReportPdfPayload({
    child,
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    reportData: data,
    unitSystem: "metric",
    generatedAt: new Date("2026-05-04T15:50:00"),
  });

  assert.equal(payload.dataQuality.totalDays, 4);
  assert.equal(Number.isFinite(payload.dataQuality.totalDays), true);
});

test("native caregiver handoff payload includes parent note and excludes photo/file content", () => {
  const parentNote = "Please offer fluids and watch wet diapers.";
  const photoPoop = {
    ...poop,
    photo_path: "/private/tiny-tummy/poop.jpg",
  };
  const photoDiaper = {
    ...diaper,
    photo_path: "/private/tiny-tummy/diaper.jpg",
  };
  const options = {
    ...getDefaultReportOptionsForMode("caregiver_handoff", {
      childId: child.id,
      dateRange: { start: "2026-05-04", end: "2026-05-04" },
      generatedAt: "2026-05-04T15:50:00.000Z",
    }),
    parentNote,
    includePhotos: false,
    includeAttachmentMetadata: false,
    includeDeleted: false,
  };
  const data = buildReportData({
    child,
    logs: [photoPoop],
    diaperLogs: [photoDiaper],
    feedingLogs: [],
    growthLogs: [],
    episodes: [],
    episodeEvents: [],
    symptomLogs: [],
    milestoneLogs: [],
    handoffSummary: {
      dayKey: "2026-05-04",
      lastPoop: photoPoop,
      lastDiaper: photoDiaper,
      lastWetDiaper: photoDiaper,
      lastFeed: null,
      lastSleep: null,
      activeEpisode: null,
      latestEpisodeUpdate: null,
      latestSymptom: null,
      recentSymptoms: [],
      todayPoops: 1,
      todayWetDiapers: 1,
      todayDirtyDiapers: 1,
      todayFeeds: 0,
      hasNoPoopDay: false,
      watchItems: ["Logging is sparse"],
      parentNote,
    },
  }, "2026-05-04", "2026-05-04", options, "metric", "fullHealth");
  const handoffSummary = buildHandoffSummary({
    child,
    poopLogs: [photoPoop],
    diaperLogs: [photoDiaper],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [],
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00.000Z",
    parentNote,
  });

  const payload = buildNativeReportPdfPayload({
    child,
    startDate: "2026-05-04",
    endDate: "2026-05-04",
    reportData: data,
    unitSystem: "metric",
    generatedAt: new Date("2026-05-04T15:50:00"),
    handoffSummary,
  });
  const serializedPayload = JSON.stringify(payload);

  assert.equal(payload.title, "Caregiver Handoff");
  assert.equal(payload.reportMode, "caregiver_handoff");
  assert.equal(payload.childId, "");
  assert.equal(payload.includePhotos, false);
  assert.equal(payload.includeAttachmentMetadata, false);
  assert.equal(payload.handoff?.parentNoteRows.at(0)?.detail, parentNote);
  assert.equal(payload.handoff?.nextDueRows.length, 3);
  assert.equal(serializedPayload.includes("/private/tiny-tummy"), false);
  assert.equal(serializedPayload.includes("photo_path"), false);
  assert.doesNotMatch(serializedPayload, /diagnose|medical advice|treat/i);
});
