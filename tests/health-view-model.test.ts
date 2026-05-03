import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildHealthTimeline,
  formatHealthDateTime,
  formatHealthElapsedDuration,
  formatHealthStartedLine,
} from "../src/lib/health-view-model";
import type { Episode, EpisodeEvent, SymptomEntry } from "../src/lib/types";

test("formats compact health date and duration labels", () => {
  const startedAt = "2026-05-03T10:02:00.000Z";
  const referenceDate = new Date("2026-05-04T12:20:00.000Z");

  assert.equal(formatHealthDateTime(startedAt, { locale: "en-AU", timeZone: "UTC" }), "3 May at 10:02 am");
  assert.equal(formatHealthElapsedDuration(startedAt, referenceDate), "1d 2h");
  assert.equal(
    formatHealthStartedLine(startedAt, referenceDate, { locale: "en-AU", timeZone: "UTC" }),
    "Started 3 May at 10:02 am \u00b7 1d 2h",
  );
});

test("builds a sorted health timeline and de-duplicates linked symptom episode events", () => {
  const episode: Episode = {
    id: "episode-1",
    child_id: "child-1",
    episode_type: "fever_illness",
    status: "active",
    started_at: "2026-05-03T10:02:00.000Z",
    ended_at: null,
    summary: "Fever, low appetite",
    outcome: null,
    created_at: "2026-05-03T10:02:00.000Z",
    updated_at: "2026-05-03T10:02:00.000Z",
  };
  const linkedSymptom: SymptomEntry = {
    id: "symptom-1",
    child_id: "child-1",
    episode_id: "episode-1",
    symptom_type: "fever",
    severity: "moderate",
    temperature_c: 38.2,
    logged_at: "2026-05-03T11:15:00.000Z",
    notes: "Warm after nap",
    created_at: "2026-05-03T11:15:00.000Z",
  };
  const linkedEpisodeEvent: EpisodeEvent = {
    id: "event-1",
    episode_id: "episode-1",
    child_id: "child-1",
    event_type: "symptom",
    title: "Fever \u00b7 Moderate \u00b7 38.2 \u00b0C",
    notes: "Warm after nap",
    logged_at: "2026-05-03T11:15:00.000Z",
    created_at: "2026-05-03T11:15:00.000Z",
  };
  const progressEvent: EpisodeEvent = {
    id: "event-2",
    episode_id: "episode-1",
    child_id: "child-1",
    event_type: "progress",
    title: "Settled after fluids",
    notes: null,
    logged_at: "2026-05-03T12:00:00.000Z",
    created_at: "2026-05-03T12:00:00.000Z",
  };

  const timeline = buildHealthTimeline({
    episodes: [episode],
    episodeEvents: [linkedEpisodeEvent, progressEvent],
    symptomLogs: [linkedSymptom],
    temperatureUnit: "celsius",
  });

  assert.deepEqual(timeline.map((item) => item.title), [
    "Settled after fluids",
    "Fever",
    "Fever / Illness started",
  ]);
  assert.equal(timeline[1]?.detail, "38.2 \u00b0C \u00b7 Warm after nap");
});
