import test from "node:test";
import assert from "node:assert/strict";
import { buildHandoffSummary, deriveHandoffOverview } from "../src/lib/handoff.ts";
import type { Alert, Episode, EpisodeEvent, SymptomEntry } from "../src/lib/types.ts";

function createEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: "episode-1",
    child_id: "child-1",
    episode_type: "constipation",
    status: "active",
    started_at: "2026-04-24T10:14:00.000Z",
    ended_at: null,
    summary: "Hard stools since yesterday and lower appetite.",
    outcome: null,
    created_at: "2026-04-24T10:14:00.000Z",
    updated_at: "2026-04-24T10:14:00.000Z",
    ...overrides,
  };
}

function createEpisodeEvent(overrides: Partial<EpisodeEvent> = {}): EpisodeEvent {
  return {
    id: "event-1",
    episode_id: "episode-1",
    child_id: "child-1",
    event_type: "hydration",
    title: "Offered extra water after breakfast.",
    notes: null,
    logged_at: "2026-04-24T10:15:00.000Z",
    created_at: "2026-04-24T10:15:00.000Z",
    ...overrides,
  };
}

function createSymptom(overrides: Partial<SymptomEntry> = {}): SymptomEntry {
  return {
    id: "symptom-1",
    child_id: "child-1",
    episode_id: "episode-1",
    symptom_type: "straining",
    severity: "moderate",
    logged_at: "2026-04-24T10:15:00.000Z",
    notes: null,
    created_at: "2026-04-24T10:15:00.000Z",
    ...overrides,
  };
}

function createAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    child_id: "child-1",
    alert_type: "red_flag",
    severity: "warning",
    title: "Red-flag stool follow-up",
    message: "A recent stool needs closer follow-up.",
    is_dismissed: 0,
    triggered_at: "2026-04-24T10:16:00.000Z",
    related_log_id: "poop-1",
    ...overrides,
  };
}

test("deriveHandoffOverview elevates the hero state when an episode is active", () => {
  const overview = deriveHandoffOverview({
    baseStatus: "healthy",
    baseDescription: "Toddlers typically poop 1-2 times per day",
    alerts: [],
    activeEpisode: createEpisode(),
    latestEpisodeUpdate: createEpisodeEvent(),
    recentSymptoms: [createSymptom()],
  });

  assert.deepEqual(overview, {
    status: "caution",
    description: "Hard stools since yesterday and lower appetite.",
  });
});

test("deriveHandoffOverview prioritizes urgent alerts over the baseline status", () => {
  const overview = deriveHandoffOverview({
    baseStatus: "healthy",
    baseDescription: "Toddlers typically poop 1-2 times per day",
    alerts: [createAlert({ severity: "urgent", title: "Blood in stool", message: "Contact your doctor now." })],
    activeEpisode: null,
    latestEpisodeUpdate: null,
    recentSymptoms: [],
  });

  assert.deepEqual(overview, {
    status: "alert",
    description: "Blood in stool: Contact your doctor now.",
  });
});

test("buildHandoffSummary uses a focus line instead of a normal-range line for active concerns", () => {
  const summary = buildHandoffSummary({
    childName: "Milo",
    status: "caution",
    statusDescription: "Hard stools since yesterday and lower appetite.",
    alerts: [],
    lastPoop: null,
    lastFeed: null,
    activeEpisode: createEpisode(),
    latestEpisodeUpdate: createEpisodeEvent({ title: "Straining", event_type: "symptom" }),
    recentSymptoms: [createSymptom()],
    todayPoops: 1,
    todayFeeds: 1,
    hasNoPoopDay: false,
    handoffNote: null,
  });

  assert.match(summary, /Right now: Keep an eye on it/);
  assert.match(summary, /Focus: Hard stools since yesterday and lower appetite\./);
  assert.doesNotMatch(summary, /Expected range:/);
});
