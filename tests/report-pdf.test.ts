import test from "node:test";
import assert from "node:assert/strict";
import { buildReportPdfPayload } from "../src/lib/report-pdf.ts";
import { buildReportData } from "../src/lib/reporting.ts";
import type { Child, DiaperEntry, Episode, EpisodeEvent, PoopEntry, SymptomEntry } from "../src/lib/types.ts";
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

const poopLog: PoopEntry = {
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
};

const wetDiaper: DiaperEntry = {
  id: "diaper-1",
  child_id: child.id,
  logged_at: "2026-04-12T10:00:00",
  diaper_type: "wet",
  urine_color: "normal",
  stool_type: null,
  color: null,
  size: null,
  notes: null,
  photo_path: null,
  linked_poop_log_id: null,
  created_at: "2026-04-12T10:00:00",
  updated_at: "2026-04-12T10:00:00",
};

const reportData: ReportData = {
  reportKind: "poopTummy",
  logs: [poopLog],
  diaperLogs: [wetDiaper],
  stoolEvents: [{
    id: poopLog.id,
    source: "poop",
    logged_at: poopLog.logged_at,
    stool_type: poopLog.stool_type,
    color: poopLog.color,
    size: poopLog.size,
    is_no_poop: poopLog.is_no_poop,
    notes: poopLog.notes,
    photo_path: poopLog.photo_path,
  }],
  diaperStats: {
    total: 1,
    wet: 1,
    dirty: 0,
    mixed: 0,
    darkUrine: 0,
    photoCount: 0,
  },
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
    diaperOutput: [{ label: "Sat", primaryValue: 1, secondaryValue: 0 }],
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

  assert.equal(payload.title, "Baby Poop & Tummy Report");
  assert.equal(payload.childName, "Luna");
  assert.equal(payload.attentionChips.length, 1);
  assert.equal(payload.attentionChips[0]?.detail, "1 episode captured in this date range.");
  assert.ok(payload.summaryCards.length >= 4);
  assert.equal(payload.charts[0]?.title, "Daily stool output");
  assert.equal(payload.charts.some((chart) => chart.title === "Daily diaper output"), true);
  assert.ok(payload.charts.some((chart) => chart.kind === "bar"));
});

test("buildReportPdfPayload keeps the broad health title for full health reports", () => {
  const payload = buildReportPdfPayload({
    child,
    startDate: "2026-03-15",
    endDate: "2026-04-13",
    data: { ...reportData, reportKind: "fullHealth" },
    unitSystem: "metric",
  });

  assert.equal(payload.title, "Baby Health Report");
});

test("report data links symptom context and de-duplicates generated episode symptom events", () => {
  const episode: Episode = {
    id: "episode-1",
    child_id: child.id,
    episode_type: "fever_illness",
    status: "active",
    started_at: "2026-04-12T08:30:00",
    ended_at: null,
    summary: "Fever started overnight",
    outcome: null,
    created_at: "2026-04-12T08:30:00",
    updated_at: "2026-04-12T08:30:00",
  };
  const symptom: SymptomEntry = {
    id: "symptom-1",
    child_id: child.id,
    episode_id: episode.id,
    symptom_type: "fever",
    severity: "moderate",
    temperature_c: 38.2,
    temperature_method: "rectal",
    logged_at: "2026-04-12T09:00:00",
    notes: "Warm after nap",
    created_at: "2026-04-12T09:00:00",
    updated_at: "2026-04-12T09:00:00",
  };
  const generatedEvent: EpisodeEvent = {
    id: "event-1",
    episode_id: episode.id,
    child_id: child.id,
    event_type: "symptom",
    title: "Fever · Moderate · 38.2 °C",
    notes: "Warm after nap",
    logged_at: symptom.logged_at,
    created_at: symptom.logged_at,
    source_kind: "symptom",
    source_id: symptom.id,
  };

  const data = buildReportData({
    logs: [],
    diaperLogs: [],
    feedingLogs: [],
    growthLogs: [],
    episodes: [episode],
    episodeEvents: [generatedEvent],
    symptomLogs: [symptom],
    milestoneLogs: [],
  }, "2026-04-12", "2026-04-12");

  assert.deepEqual(data.timeline.map((row) => row.eventType), ["Symptom", "Episode"]);
  assert.match(data.timeline[0]?.details ?? "", /Rectal/);
  assert.match(data.timeline[0]?.details ?? "", /In Fever \/ illness/);
  assert.equal(data.contextSections.find((section) => section.title === "Episode Context")?.rows[0]?.detail?.includes("1 linked symptom"), true);
});

test("report data includes diaper output without duplicating linked poop timeline rows", () => {
  const linkedPoop: PoopEntry = {
    ...poopLog,
    id: "linked-poop-1",
    logged_at: "2026-04-12T11:00:00",
  };
  const dirtyDiaper: DiaperEntry = {
    ...wetDiaper,
    id: "diaper-dirty-1",
    logged_at: "2026-04-12T11:00:00",
    diaper_type: "mixed",
    stool_type: 5,
    color: "brown",
    size: "large",
    linked_poop_log_id: linkedPoop.id,
  };

  const data = buildReportData({
    logs: [linkedPoop],
    diaperLogs: [dirtyDiaper],
    feedingLogs: [],
    growthLogs: [],
    episodes: [],
    episodeEvents: [],
    symptomLogs: [],
    milestoneLogs: [],
  }, "2026-04-12", "2026-04-12");

  assert.equal(data.stats.totalPoops, 1);
  assert.equal(data.diaperStats.wet, 1);
  assert.equal(data.diaperStats.dirty, 1);
  assert.deepEqual(data.timeline.map((row) => row.eventType), ["Stool + diaper"]);
  assert.equal(data.chartData.diaperOutput.at(-1)?.primaryValue, 1);
  assert.equal(data.chartData.diaperOutput.at(-1)?.secondaryValue, 1);
});
