import test from "node:test";
import assert from "node:assert/strict";
import {
  HANDOFF_PRIVACY_NOTE,
  buildHandoffSummary,
  formatHandoffSummaryText,
} from "../src/lib/handoff-summary.ts";
import type {
  Alert,
  Child,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
} from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Maya",
  date_of_birth: "2026-01-15",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  created_at: "2026-01-15T00:00:00",
  updated_at: "2026-01-15T00:00:00",
};

function poop(overrides: Partial<PoopEntry> = {}): PoopEntry {
  return {
    id: "poop-1",
    child_id: child.id,
    logged_at: "2026-05-04T12:20:00",
    stool_type: 6,
    color: "red",
    size: "medium",
    is_no_poop: 0,
    notes: null,
    photo_path: "/private/photo.jpg",
    created_at: "2026-05-04T12:20:00",
    updated_at: "2026-05-04T12:20:00",
    ...overrides,
  };
}

function diaper(overrides: Partial<DiaperEntry> = {}): DiaperEntry {
  return {
    id: "diaper-1",
    child_id: child.id,
    logged_at: "2026-05-04T11:20:00",
    diaper_type: "mixed",
    urine_color: "normal",
    stool_type: 5,
    color: "brown",
    size: "large",
    notes: null,
    photo_path: "/private/diaper-photo.jpg",
    linked_poop_log_id: null,
    created_at: "2026-05-04T11:20:00",
    updated_at: "2026-05-04T11:20:00",
    ...overrides,
  };
}

function feed(overrides: Partial<FeedingEntry> = {}): FeedingEntry {
  return {
    id: "feed-1",
    child_id: child.id,
    logged_at: "2026-05-04T14:43:00",
    food_type: "breast_milk",
    food_name: null,
    amount_ml: null,
    duration_minutes: 12,
    breast_side: "left",
    bottle_content: null,
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: "2026-05-04T14:43:00",
    updated_at: "2026-05-04T14:43:00",
    ...overrides,
  };
}

function sleep(overrides: Partial<SleepEntry> = {}): SleepEntry {
  return {
    id: "sleep-1",
    child_id: child.id,
    sleep_type: "nap",
    started_at: "2026-05-04T13:50:00",
    ended_at: "2026-05-04T15:00:00",
    notes: null,
    created_at: "2026-05-04T13:50:00",
    updated_at: "2026-05-04T13:50:00",
    ...overrides,
  };
}

function symptom(overrides: Partial<SymptomEntry> = {}): SymptomEntry {
  return {
    id: "symptom-1",
    child_id: child.id,
    episode_id: "episode-1",
    symptom_type: "fever",
    severity: "moderate",
    temperature_c: null,
    temperature_method: null,
    logged_at: "2026-05-04T10:30:00",
    notes: null,
    created_at: "2026-05-04T10:30:00",
    updated_at: "2026-05-04T10:30:00",
    ...overrides,
  };
}

const episode: Episode = {
  id: "episode-1",
  child_id: child.id,
  episode_type: "fever_illness",
  status: "active",
  started_at: "2026-05-04T09:30:00",
  ended_at: null,
  summary: "Warm and quieter than usual",
  outcome: null,
  created_at: "2026-05-04T09:30:00",
  updated_at: "2026-05-04T09:30:00",
};

const episodeEvent: EpisodeEvent = {
  id: "event-1",
  episode_id: episode.id,
  child_id: child.id,
  event_type: "symptom",
  title: "Fever",
  notes: null,
  logged_at: "2026-05-04T10:30:00",
  created_at: "2026-05-04T10:30:00",
  source_kind: "symptom",
  source_id: "symptom-1",
};

const alert: Alert = {
  id: "alert-1",
  child_id: child.id,
  alert_type: "low_wet_output",
  severity: "warning",
  title: "Watch wet diapers",
  message: "Wet diaper logging is lighter than usual today.",
  is_dismissed: 0,
  triggered_at: "2026-05-04T12:00:00",
  related_log_id: "diaper-1",
};

function fullSummary() {
  return buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [poop()],
    diaperLogs: [
      diaper(),
      diaper({ id: "diaper-2", logged_at: "2026-05-04T14:00:00", diaper_type: "wet", stool_type: null, color: null, size: null }),
    ],
    feedingLogs: [
      feed(),
      feed({ id: "feed-2", logged_at: "2026-05-04T11:00:00", breast_side: "right" }),
      feed({ id: "feed-3", logged_at: "2026-05-04T07:30:00", food_type: "bottle", breast_side: null, bottle_content: "formula", amount_ml: 120, duration_minutes: null }),
      feed({ id: "feed-4", logged_at: "2026-05-04T04:30:00", food_type: "bottle", breast_side: null, bottle_content: "formula", amount_ml: 110, duration_minutes: null }),
    ],
    sleepLogs: [
      sleep(),
      sleep({ id: "sleep-2", started_at: "2026-05-04T07:45:00", ended_at: "2026-05-04T08:15:00" }),
      sleep({ id: "sleep-3", started_at: "2026-05-03T22:00:00", ended_at: "2026-05-04T01:00:00" }),
    ],
    alerts: [alert],
    activeEpisode: episode,
    episodeEvents: [episodeEvent],
    symptomLogs: [
      symptom(),
      symptom({ id: "symptom-2", symptom_type: "vomiting", severity: "mild", logged_at: "2026-05-04T12:10:00" }),
    ],
    parentNote: "Please offer fluids and watch wet diapers.",
    now: new Date("2026-05-04T15:50:00"),
  });
}

test("buildHandoffSummary builds a full caregiver handoff without photo content", () => {
  const summary = fullSummary();

  assert.equal(summary.child.name, "Maya");
  assert.equal(summary.todaySummary.poopCount, 2);
  assert.equal(summary.todaySummary.wetDiaperCount, 2);
  assert.equal(summary.todaySummary.dirtyDiaperCount, 1);
  assert.equal(summary.todaySummary.mixedDiaperCount, 1);
  assert.equal(summary.todaySummary.feedCount, 4);
  assert.equal(summary.todaySummary.sleepTotalMinutes, 160);
  assert.equal(summary.todaySummary.symptomCount, 2);
  assert.equal(summary.lastEvents.lastPoop?.detail, "red, Type 6, medium");
  assert.equal(summary.lastEvents.lastWetDiaper?.title, "Wet diaper");
  assert.equal(summary.lastEvents.lastFeed?.detail.includes("Left"), true);
  assert.equal(summary.lastEvents.lastSleep?.detail, "1h 10m");
  assert.equal(summary.lastEvents.activeEpisode?.title, "Fever / illness");
  assert.equal(summary.preparedBy, null);
  assert.equal(summary.nextDue.nextFeed.status, "based_on_recent_logs");
  assert.equal(summary.nextDue.nextSleep.status, "based_on_recent_logs");
  assert.equal(summary.watchItems.some((item) => item.label === "red stool was logged today."), true);
  assert.equal(summary.watchItems.some((item) => item.label === "Fever / illness episode is active."), true);
  assert.equal(summary.watchItems.some((item) => item.label === "Vomiting was logged today."), true);
  assert.equal(JSON.stringify(summary).includes("/private/photo.jpg"), false);
});

test("buildHandoffSummary handles sparse data and uses fallback next-due wording", () => {
  const summary = buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [],
    diaperLogs: [diaper({ diaper_type: "wet", stool_type: null, color: null, size: null })],
    feedingLogs: [feed()],
    sleepLogs: [sleep()],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [],
    now: new Date("2026-05-04T15:50:00"),
  });

  assert.equal(summary.todaySummary.poopCount, 0);
  assert.equal(summary.lastEvents.lastPoop, null);
  assert.equal(summary.nextDue.nextFeed.label, "No clear pattern yet");
  assert.equal(summary.nextDue.nextSleep.label, "No clear pattern yet");
  assert.equal(summary.watchItems.some((item) => item.id === "sparse-logging"), true);
});

test("buildHandoffSummary handles no data", () => {
  const summary = buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [],
    now: new Date("2026-05-04T15:50:00"),
  });

  assert.equal(summary.todaySummary.poopCount, 0);
  assert.equal(summary.todaySummary.wetDiaperCount, 0);
  assert.equal(summary.todaySummary.feedCount, 0);
  assert.equal(summary.todaySummary.sleepTotal, "0m");
  assert.equal(summary.timeline.length, 0);
  assert.equal(summary.nextDue.nextFeed.detail, "Not enough feed logs to estimate the next feed.");
  assert.equal(summary.nextDue.nextDiaperCheck.label, "No wet diaper logged yet");
});

test("formatHandoffSummaryText includes parent note and privacy note without hidden file data", () => {
  const summary = fullSummary();
  const text = formatHandoffSummaryText(summary, { locale: "en-AU", timeZone: "UTC" });

  assert.match(text, /Tiny Tummy handoff for Maya/);
  assert.match(text, /Today so far:/);
  assert.match(text, /Parent note:\nPlease offer fluids and watch wet diapers\./);
  assert.match(text, /Generated locally by Tiny Tummy\. Share only with people you trust\./);
  assert.equal(text.includes("/private/photo.jpg"), false);
  assert.equal(text.includes("poop-1"), false);
  assert.equal(text.includes("diaper-1"), false);
  assert.equal(text.includes(child.id), false);
});

test("formatHandoffSummaryText includes current caregiver without contact details", () => {
  const summary = buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [],
    preparedByCaregiver: {
      display_name: "Dad",
      role: "parent",
    },
    now: new Date("2026-05-04T15:50:00"),
  });
  const text = formatHandoffSummaryText(summary, { locale: "en-AU", timeZone: "UTC" });

  assert.deepEqual(summary.preparedBy, { displayName: "Dad", roleLabel: "Parent" });
  assert.match(text, /Prepared by: Dad \(Parent\)/);
  assert.equal(text.includes("email"), false);
  assert.equal(text.includes("phone"), false);
});

test("buildHandoffSummary excludes soft-deleted rows defensively", () => {
  const summary = buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [
      poop({ id: "active-poop" }),
      poop({ id: "deleted-poop", logged_at: "2026-05-04T14:00:00", deleted_at: "2026-05-04T15:00:00" }),
    ],
    diaperLogs: [
      diaper({ id: "active-diaper", diaper_type: "wet", stool_type: null, color: null, size: null }),
      diaper({ id: "deleted-diaper", logged_at: "2026-05-04T14:30:00", deleted_at: "2026-05-04T15:00:00" }),
    ],
    feedingLogs: [
      feed({ id: "active-feed" }),
      feed({ id: "deleted-feed", logged_at: "2026-05-04T14:55:00", deleted_at: "2026-05-04T15:00:00" }),
    ],
    sleepLogs: [
      sleep({ id: "active-sleep" }),
      sleep({ id: "deleted-sleep", started_at: "2026-05-04T15:10:00", ended_at: "2026-05-04T15:40:00", deleted_at: "2026-05-04T15:45:00" }),
    ],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [
      symptom({ id: "active-symptom" }),
      symptom({ id: "deleted-symptom", logged_at: "2026-05-04T14:20:00", deleted_at: "2026-05-04T15:00:00" }),
    ],
    now: new Date("2026-05-04T15:50:00"),
  });

  assert.equal(summary.todaySummary.poopCount, 1);
  assert.equal(summary.todaySummary.wetDiaperCount, 1);
  assert.equal(summary.todaySummary.feedCount, 1);
  assert.equal(summary.todaySummary.symptomCount, 1);
  assert.equal(summary.lastEvents.lastFeed?.occurredAt, "2026-05-04T14:43:00");
  assert.equal(summary.lastEvents.lastSymptom?.occurredAt, "2026-05-04T10:30:00");
});

test("privacy note stays stable", () => {
  assert.equal(HANDOFF_PRIVACY_NOTE, "Generated locally by Tiny Tummy. Share only with people you trust.");
});
