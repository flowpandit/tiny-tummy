import test from "node:test";
import assert from "node:assert/strict";
import type {
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
import {
  addDaysToDateKey,
  formatHistoryDayHeader,
  formatHistorySleepDuration,
  getEarliestHistoryDate,
  getHistoryDisplayDays,
  getHistoryRange,
  getVisiblePoopLogs,
  groupTimelineByDay,
  hasHistoryEntries,
  summarizeTimelineEvents,
} from "../src/lib/history-timeline.ts";
import { formatLocalDateKey } from "../src/lib/utils.ts";

function createDiaperEntry(
  id: string,
  loggedAt: string,
  linkedPoopLogId: string | null = null,
  diaperType: DiaperEntry["diaper_type"] = "dirty",
): DiaperEntry {
  return {
    id,
    child_id: "child-1",
    logged_at: loggedAt,
    diaper_type: diaperType,
    urine_color: null,
    stool_type: null,
    color: null,
    size: null,
    notes: null,
    photo_path: null,
    linked_poop_log_id: linkedPoopLogId,
    created_at: loggedAt,
    updated_at: loggedAt,
  };
}

function createPoopEntry(id: string, loggedAt: string, isNoPoop = 0): PoopEntry {
  return {
    id,
    child_id: "child-1",
    logged_at: loggedAt,
    stool_type: null,
    color: null,
    size: null,
    is_no_poop: isNoPoop,
    notes: null,
    photo_path: null,
    created_at: loggedAt,
    updated_at: loggedAt,
  };
}

function createFeedingEntry(id: string, loggedAt: string): FeedingEntry {
  return {
    id,
    child_id: "child-1",
    logged_at: loggedAt,
    food_type: "formula",
    food_name: null,
    amount_ml: 120,
    duration_minutes: null,
    breast_side: null,
    bottle_content: "formula",
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: loggedAt,
  };
}

function createSleepEntry(startedAt: string, endedAt: string): SleepEntry {
  return {
    id: "sleep-1",
    child_id: "child-1",
    sleep_type: "nap",
    started_at: startedAt,
    ended_at: endedAt,
    notes: null,
    created_at: startedAt,
  };
}

function createSymptomEntry(id: string, loggedAt: string, episodeId: string | null = null): SymptomEntry {
  return {
    id,
    child_id: "child-1",
    episode_id: episodeId,
    symptom_type: "cough_congestion",
    severity: "moderate",
    temperature_c: null,
    logged_at: loggedAt,
    notes: null,
    created_at: loggedAt,
  };
}

function createEpisodeEvent(id: string, loggedAt: string, episodeId = "episode-1"): EpisodeEvent {
  return {
    id,
    episode_id: episodeId,
    child_id: "child-1",
    event_type: "symptom",
    title: "Cough / Congestion · Moderate",
    notes: null,
    logged_at: loggedAt,
    created_at: loggedAt,
  };
}

test("filters out poop logs already linked from diaper logs", () => {
  const diaperLogs = [createDiaperEntry("diaper-1", "2026-04-14T09:00:00", "poop-1")];
  const poopLogs = [
    createPoopEntry("poop-1", "2026-04-14T08:00:00"),
    createPoopEntry("poop-2", "2026-04-14T07:00:00"),
  ];

  assert.deepEqual(
    getVisiblePoopLogs(diaperLogs, poopLogs).map((log) => log.id),
    ["poop-2"],
  );
});

test("groups mixed timeline events by day and sorts events within each day chronologically", () => {
  const diaperLogs = [createDiaperEntry("diaper-1", "2026-04-14T09:00:00")];
  const poopLogs = [createPoopEntry("poop-1", "2026-04-14T08:00:00")];
  const feedingLogs: FeedingEntry[] = [{
    id: "feed-1",
    child_id: "child-1",
    logged_at: "2026-04-13T07:00:00",
    food_type: "formula",
    food_name: null,
    amount_ml: 120,
    duration_minutes: null,
    breast_side: null,
    bottle_content: "formula",
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: "2026-04-13T07:00:00",
  }];
  const sleepLogs = [createSleepEntry("2026-04-14T06:00:00", "2026-04-14T07:30:00")];
  const symptomLogs: SymptomEntry[] = [];
  const growthLogs: GrowthEntry[] = [];
  const milestoneLogs: MilestoneEntry[] = [];
  const episodes: Episode[] = [];
  const episodeEvents: EpisodeEvent[] = [];

  const grouped = groupTimelineByDay({
    diaperLogs,
    poopLogs,
    feedingLogs,
    sleepLogs,
    symptomLogs,
    growthLogs,
    milestoneLogs,
    episodes,
    episodeEvents,
  });

  assert.deepEqual([...grouped.keys()], ["2026-04-14", "2026-04-13"]);
  assert.deepEqual(
    grouped.get("2026-04-14")?.map((event) => event.kind),
    ["sleep", "poop", "diaper"],
  );
});

test("groups UTC-backed timeline events by the local day instead of the raw ISO date prefix", () => {
  const diaperLogs = [createDiaperEntry("diaper-1", "2026-04-23T23:19:00.000Z")];
  const poopLogs: PoopEntry[] = [];
  const feedingLogs: FeedingEntry[] = [{
    id: "feed-1",
    child_id: "child-1",
    logged_at: "2026-04-23T23:22:00.000Z",
    food_type: "breast_milk",
    food_name: null,
    amount_ml: null,
    duration_minutes: 1,
    breast_side: "left",
    bottle_content: null,
    reaction_notes: null,
    is_constipation_support: 0,
    notes: "Timed breastfeeding session • Left 23s",
    created_at: "2026-04-23T23:22:00.000Z",
  }];
  const sleepLogs = [createSleepEntry("2026-04-23T22:21:00.000Z", "2026-04-23T23:21:00.000Z")];
  const symptomLogs: SymptomEntry[] = [];
  const growthLogs: GrowthEntry[] = [];
  const milestoneLogs: MilestoneEntry[] = [];
  const episodes: Episode[] = [];
  const episodeEvents: EpisodeEvent[] = [];

  const grouped = groupTimelineByDay({
    diaperLogs,
    poopLogs,
    feedingLogs,
    sleepLogs,
    symptomLogs,
    growthLogs,
    milestoneLogs,
    episodes,
    episodeEvents,
    timeZoneOffsetMinutes: -600,
  });

  assert.deepEqual([...grouped.keys()], ["2026-04-24"]);
  assert.deepEqual(
    grouped.get("2026-04-24")?.map((event) => event.kind),
    ["sleep", "diaper", "meal"],
  );
});

test("groups linked symptoms without duplicating their episode event in global history", () => {
  const loggedAt = "2026-05-03T09:47:00.000Z";
  const symptomLogs = [createSymptomEntry("symptom-1", loggedAt, "episode-1")];
  const episodeEvents = [
    createEpisodeEvent("event-linked", loggedAt),
    {
      ...createEpisodeEvent("event-progress", "2026-05-03T10:15:00.000Z"),
      event_type: "progress" as const,
      title: "Settled after fluids",
    },
  ];

  const grouped = groupTimelineByDay({
    diaperLogs: [],
    poopLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    symptomLogs,
    growthLogs: [],
    milestoneLogs: [],
    episodes: [],
    episodeEvents,
  });

  assert.deepEqual(
    grouped.get(formatLocalDateKey(new Date(loggedAt)))?.map((event) => `${event.kind}:${event.entry.id}`),
    ["symptom:symptom-1", "episode_event:event-progress"],
  );
});

test("formats sleep durations using hours and minutes", () => {
  assert.equal(
    formatHistorySleepDuration(createSleepEntry("2026-04-14T06:00:00", "2026-04-14T07:30:00")),
    "1h 30m",
  );
  assert.equal(
    formatHistorySleepDuration(createSleepEntry("2026-04-14T06:00:00", "2026-04-14T06:45:00")),
    "45m",
  );
});

test("summarizes timeline events for the lightweight history overview", () => {
  const summary = summarizeTimelineEvents([
    { kind: "meal", entry: createFeedingEntry("feed-1", "2026-04-14T06:30:00") },
    { kind: "sleep", entry: createSleepEntry("2026-04-14T07:00:00", "2026-04-14T08:00:00") },
    { kind: "diaper", entry: createDiaperEntry("dirty-1", "2026-04-14T08:30:00") },
    { kind: "diaper", entry: createDiaperEntry("wet-1", "2026-04-14T09:30:00", null, "wet") },
    { kind: "poop", entry: createPoopEntry("poop-1", "2026-04-14T10:30:00") },
    { kind: "poop", entry: createPoopEntry("no-poop-1", "2026-04-14T11:30:00", 1) },
  ]);

  assert.deepEqual(summary, {
    feeds: 1,
    poops: 2,
    sleep: 1,
    diapers: 2,
    other: 1,
    total: 6,
  });
});

test("builds history ranges and display slices from grouped data", () => {
  const range = getHistoryRange("2026-04-14", 7, null);
  assert.deepEqual(range, {
    rangeStart: "2026-04-08",
    rangeEnd: "2026-04-14",
  });

  const grouped = new Map([
    ["2026-04-14", [{ kind: "poop", entry: createPoopEntry("poop-1", "2026-04-14T08:00:00") }]],
    ["2026-04-13", [{ kind: "poop", entry: createPoopEntry("poop-2", "2026-04-13T08:00:00") }]],
  ]);

  assert.equal(getHistoryDisplayDays(grouped, null).length, 2);
  assert.deepEqual(getHistoryDisplayDays(grouped, "2026-04-13").map(([day]) => day), ["2026-04-13"]);
  assert.deepEqual(getHistoryDisplayDays(grouped, "2026-04-10"), []);
});

test("reports whether history contains any entries and returns the earliest available date", () => {
  const emptyInput = {
    diaperLogs: [],
    poopLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    symptomLogs: [],
    growthLogs: [],
    milestoneLogs: [],
    episodes: [],
    episodeEvents: [],
  };

  assert.equal(hasHistoryEntries(emptyInput), false);
  assert.equal(
    hasHistoryEntries({
      ...emptyInput,
      poopLogs: [createPoopEntry("poop-1", "2026-04-14T08:00:00")],
    }),
    true,
  );

  const grouped = new Map([
    ["2026-04-14", []],
    ["2026-04-10", []],
  ]);
  assert.equal(getEarliestHistoryDate(grouped, "2026-04-14"), "2026-04-10");
  assert.equal(getEarliestHistoryDate(new Map(), "2026-04-14"), "2026-04-14");
});

test("formats relative day headers around the current local day", () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  assert.equal(formatHistoryDayHeader(formatLocalDateKey(today)), "Today");
  assert.equal(formatHistoryDayHeader(formatLocalDateKey(yesterday)), "Yesterday");
});

test("adds day offsets to a date key", () => {
  assert.equal(addDaysToDateKey("2026-04-14", -6), "2026-04-08");
});
