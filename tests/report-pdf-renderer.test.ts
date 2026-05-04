import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReportPdfRenderer,
  REPORT_PDF_RENDERER_STORAGE_KEY,
} from "../src/lib/report-pdf-renderer.ts";
import { buildNativeReportPdfPayload } from "../src/lib/report-native-pdf.ts";
import { buildReportData } from "../src/lib/reporting.ts";
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

test("normalizes supported PDF renderer switch values", () => {
  assert.equal(normalizeReportPdfRenderer("react"), "react");
  assert.equal(normalizeReportPdfRenderer("html"), "react");
  assert.equal(normalizeReportPdfRenderer("rust"), "rust");
  assert.equal(normalizeReportPdfRenderer("native"), "rust");
  assert.equal(normalizeReportPdfRenderer("browser"), null);
  assert.equal(REPORT_PDF_RENDERER_STORAGE_KEY, "tt.reportPdfRenderer");
});

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
  assert.equal(payload.pattern.dailyPoints.at(-1)?.stoolCount, 2);
  assert.equal(payload.pattern.dailyPoints.at(-1)?.mixed, 1);
  assert.equal(payload.context.diaperRows.some((row) => row.label === "Mixed diapers"), true);
  assert.equal(payload.timelineGroups.length > 0, true);
});
