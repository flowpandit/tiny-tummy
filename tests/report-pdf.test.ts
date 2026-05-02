import test from "node:test";
import assert from "node:assert/strict";
import { buildReportPdfPayload } from "../src/lib/report-pdf.ts";
import type { Child } from "../src/lib/types.ts";
import type { ReportData } from "../src/lib/reporting.ts";

const child: Child = {
  id: "child-1",
  name: "Luna",
  date_of_birth: "2026-04-01",
  sex: null,
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  created_at: "2026-04-01T00:00:00",
  updated_at: "2026-04-01T00:00:00",
};

const reportData: ReportData = {
  logs: [
    {
      id: "poop-1",
      child_id: child.id,
      logged_at: "2026-04-12T09:00:00",
      stool_type: 4,
      color: "yellow",
      size: "medium",
      is_no_poop: 0,
      notes: null,
      photo_path: null,
      created_at: "2026-04-12T09:00:00",
      updated_at: "2026-04-12T09:00:00",
    },
  ],
  feedingLogs: [
    {
      id: "feed-1",
      child_id: child.id,
      logged_at: "2026-04-12T08:00:00",
      food_type: "formula",
      food_name: null,
      amount_ml: 90,
      duration_minutes: null,
      breast_side: null,
      bottle_content: "formula",
      reaction_notes: null,
      is_constipation_support: 0,
      notes: null,
      created_at: "2026-04-12T08:00:00",
    },
  ],
  growthLogs: [],
  episodeGroups: [],
  activeEpisodeGroup: null,
  symptomLogs: [],
  milestoneLogs: [],
  photoUrls: {},
  highlights: [
    {
      tone: "info",
      title: "Episode history recorded",
      detail: "1 episode captured in this date range.",
    },
  ],
  stats: {
    totalPoops: 1,
    totalNoPoop: 0,
    avgPerDay: 0.14,
    mostCommonType: 4,
    mostCommonColor: "yellow",
  },
  dashboardStats: [
    {
      label: "Avg stools / day",
      value: "0.14",
      detail: "1 stool logged",
    },
    {
      label: "Feed sessions / day",
      value: "0.14",
      detail: "1 feed in range",
    },
  ],
  chartData: {
    stoolOutput: [{ label: "Sat", primaryValue: 1, secondaryValue: 0 }],
    feedActivity: [{ label: "Sat", primaryValue: 1, secondaryValue: 90 }],
    stoolConsistency: [{ label: "Apr 12", primaryValue: 4 }],
    symptomActivity: [{ label: "Sat", primaryValue: 0 }],
  },
  contextSections: [],
  timeline: [
    {
      dateTime: "Apr 12, 9:00 AM",
      eventType: "Stool",
      details: "Type 4 · Color yellow",
    },
  ],
};

test("buildReportPdfPayload returns branded white-report sections", () => {
  const payload = buildReportPdfPayload({
    child,
    startDate: "2026-03-15",
    endDate: "2026-04-13",
    data: reportData,
    unitSystem: "metric",
  });

  assert.equal(payload.title, "Baby Health Report");
  assert.equal(payload.childName, "Luna");
  assert.equal(payload.attentionChips.length, 1);
  assert.equal(payload.attentionChips[0]?.detail, "1 episode captured in this date range.");
  assert.ok(payload.summaryCards.length >= 4);
  assert.equal(payload.charts[0]?.title, "Daily stool output");
  assert.ok(payload.charts.some((chart) => chart.kind === "bar"));
});
