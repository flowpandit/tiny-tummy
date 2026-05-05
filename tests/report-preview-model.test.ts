import test from "node:test";
import assert from "node:assert/strict";
import { buildReportPreviewModel, buildTimelineGroups } from "../src/lib/report-preview-model.ts";
import { buildReportData } from "../src/lib/reporting.ts";
import type { Child, DiaperEntry, Episode, EpisodeEvent, FeedingEntry, PoopEntry, SymptomEntry } from "../src/lib/types.ts";

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

const redPoop: PoopEntry = {
  id: "poop-red",
  child_id: child.id,
  logged_at: "2026-05-04T08:20:00",
  stool_type: 6,
  color: "red",
  size: "small",
  is_no_poop: 0,
  notes: "Bright red streaks",
  photo_path: "/private/photo.jpg",
  created_at: "2026-05-04T08:20:00",
  updated_at: "2026-05-04T08:20:00",
};

const wetDiaper: DiaperEntry = {
  id: "diaper-wet",
  child_id: child.id,
  logged_at: "2026-05-04T08:35:00",
  diaper_type: "wet",
  urine_color: "normal",
  stool_type: null,
  color: null,
  size: null,
  notes: "Normal wet diaper",
  photo_path: null,
  linked_poop_log_id: null,
  created_at: "2026-05-04T08:35:00",
  updated_at: "2026-05-04T08:35:00",
};

const feed: FeedingEntry = {
  id: "feed-1",
  child_id: child.id,
  logged_at: "2026-05-04T09:15:00",
  food_type: "bottle",
  food_name: null,
  amount_ml: 120,
  duration_minutes: null,
  breast_side: null,
  bottle_content: "breast_milk",
  reaction_notes: null,
  is_constipation_support: 0,
  notes: "Took slowly",
  created_at: "2026-05-04T09:15:00",
};

const episode: Episode = {
  id: "episode-1",
  child_id: child.id,
  episode_type: "fever_illness",
  status: "active",
  started_at: "2026-05-04T11:00:00",
  ended_at: null,
  summary: "Fever started",
  outcome: null,
  created_at: "2026-05-04T11:00:00",
  updated_at: "2026-05-04T11:00:00",
};

const symptom: SymptomEntry = {
  id: "symptom-1",
  child_id: child.id,
  episode_id: episode.id,
  symptom_type: "fever",
  severity: "moderate",
  temperature_c: 38.2,
  temperature_method: "armpit",
  logged_at: "2026-05-04T11:00:00",
  notes: "More tired than usual",
  created_at: "2026-05-04T11:00:00",
  updated_at: "2026-05-04T11:00:00",
};

const episodeEvent: EpisodeEvent = {
  id: "event-1",
  episode_id: episode.id,
  child_id: child.id,
  event_type: "temperature",
  title: "Temp 38.2 C",
  notes: "Still warm",
  logged_at: "2026-05-04T11:10:00",
  created_at: "2026-05-04T11:10:00",
  source_kind: null,
  source_id: null,
};

test("report preview model builds a front-page pediatrician summary from real report data", () => {
  const data = buildReportData({
    logs: [redPoop],
    diaperLogs: [wetDiaper],
    feedingLogs: [feed],
    growthLogs: [],
    episodes: [episode],
    episodeEvents: [episodeEvent],
    symptomLogs: [symptom],
    milestoneLogs: [],
  }, "2026-04-05", "2026-05-04");

  const model = buildReportPreviewModel({
    child,
    startDate: "2026-04-05",
    endDate: "2026-05-04",
    data,
    unitSystem: "metric",
    generatedAt: new Date("2026-05-04T15:50:00"),
  });

  assert.match(model.brief.summary, /Maya had 1 stool log, 1 wet diaper, 0 dirty diapers/);
  assert.match(model.brief.summary, /1 red-flag stool entry/);
  assert.match(model.brief.summary, /active Fever \/ illness episode/);
  assert.match(model.brief.summary, /Logging was sparse/);
  assert.equal(model.brief.questions.some((question) => question.includes("red-flag stool color")), true);
  assert.equal(model.brief.metrics.find((metric) => metric.label === "Most common type")?.value, "Mushy");
  assert.equal(model.pattern.colourBreakdown[0]?.isRedFlag, true);
  assert.equal(model.context.careNotes.some((note) => note.label === "Photos"), true);
});

test("timeline grouping supports doctor-focused filters and chronological display", () => {
  const timeline = [
    {
      dateTime: "May 4, 11:00 AM",
      eventType: "Symptom",
      details: "Fever - Moderate",
      note: "More tired than usual",
    },
    {
      dateTime: "May 4, 9:15 AM",
      eventType: "Feed",
      details: "Bottle 120 ml",
      note: "Took slowly",
    },
    {
      dateTime: "May 3, 8:20 AM",
      eventType: "Stool",
      details: "Type 6 - Color red - Red-flag color",
      note: "Bright red streaks",
    },
  ];

  const full = buildTimelineGroups(timeline, "full");
  assert.equal(full[0]?.dateLabel, "May 3");
  assert.equal(full[0]?.rows[0]?.event, "Stool");

  const briefOnly = buildTimelineGroups(timeline, "doctorBrief");
  assert.deepEqual(briefOnly.flatMap((group) => group.rows.map((row) => row.event)), ["Stool", "Symptom"]);

  const poopOnly = buildTimelineGroups(timeline, "poopDiaper");
  assert.deepEqual(poopOnly.flatMap((group) => group.rows.map((row) => row.event)), ["Stool"]);
});
