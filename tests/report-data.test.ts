import test from "node:test";
import assert from "node:assert/strict";
import { buildReportData } from "../src/lib/reporting.ts";
import type { Child, DiaperEntry, Episode, EpisodeEvent, PoopEntry, SymptomEntry } from "../src/lib/types.ts";

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
  const episodeDetail = data.contextSections.find((section) => section.title === "Episode Context")?.rows[0]?.detail ?? "";
  assert.match(episodeDetail, /Linked symptoms: Fever/);
  assert.match(episodeDetail, /Moderate/);
  assert.match(episodeDetail, /38.2/);
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
