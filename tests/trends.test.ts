import test from "node:test";
import assert from "node:assert/strict";
import { buildTrendsOverviewModel } from "../src/lib/trends.ts";
import { formatLocalDateKey } from "../src/lib/utils.ts";
import type { Child, DiaperEntry, FeedingEntry, PoopEntry, SleepEntry } from "../src/lib/types.ts";

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

function isoHoursAgo(hoursAgo: number) {
  return new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
}

function isoDaysAgo(daysAgo: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function createFeed(
  id: string,
  loggedAt: string,
  foodType: FeedingEntry["food_type"] = "formula",
  overrides: Partial<FeedingEntry> = {},
): FeedingEntry {
  return {
    id,
    child_id: child.id,
    logged_at: loggedAt,
    food_type: foodType,
    food_name: null,
    amount_ml: 90,
    duration_minutes: null,
    breast_side: null,
    bottle_content: "formula",
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: loggedAt,
    ...overrides,
  };
}

function createSleep(id: string, startedAt: string, endedAt: string): SleepEntry {
  return {
    id,
    child_id: child.id,
    sleep_type: "nap",
    started_at: startedAt,
    ended_at: endedAt,
    notes: null,
    created_at: startedAt,
  };
}

function createDiaper(id: string, loggedAt: string, diaperType: DiaperEntry["diaper_type"]): DiaperEntry {
  return {
    id,
    child_id: child.id,
    logged_at: loggedAt,
    diaper_type: diaperType,
    urine_color: diaperType === "wet" ? "normal" : null,
    stool_type: diaperType === "wet" ? null : 4,
    color: diaperType === "wet" ? null : "yellow",
    size: diaperType === "wet" ? null : "medium",
    notes: null,
    photo_path: null,
    linked_poop_log_id: null,
    created_at: loggedAt,
    updated_at: loggedAt,
  };
}

function createPoop(id: string, loggedAt: string, stoolType = 4): PoopEntry {
  return {
    id,
    child_id: child.id,
    logged_at: loggedAt,
    stool_type: stoolType,
    color: "yellow",
    size: "medium",
    is_no_poop: 0,
    notes: null,
    photo_path: null,
    created_at: loggedAt,
    updated_at: loggedAt,
  };
}

test("buildTrendsOverviewModel creates compact summary ring data for each domain", () => {
  const recentFeed = createFeed("feed-1", isoHoursAgo(2));
  const olderFeed = createFeed("feed-2", isoHoursAgo(5));
  const lastSleepStart = isoHoursAgo(6);
  const lastSleepEnd = isoHoursAgo(4);
  const sleepLog = createSleep("sleep-1", lastSleepStart, lastSleepEnd);
  const wetOne = createDiaper("diaper-1", isoHoursAgo(3), "wet");
  const wetTwo = createDiaper("diaper-2", isoHoursAgo(7), "wet");
  const dirty = createDiaper("diaper-3", isoHoursAgo(8), "dirty");
  const lastPoop = createPoop("poop-1", isoHoursAgo(10), 4);

  const model = buildTrendsOverviewModel({
    child,
    days: 7,
    poopLogs: [lastPoop],
    lastRealPoop: lastPoop,
    feedingLogs: [recentFeed, olderFeed],
    sleepLogs: [sleepLog],
    diaperLogs: [wetOne, wetTwo, dirty],
  });

  assert.equal(model.summaryTiles.length, 4);
  assert.deepEqual(
    model.summaryTiles.map((tile) => tile.id),
    ["feed", "sleep", "diaper", "poop"],
  );
  assert.ok(model.summaryTiles.every((tile) => tile.gradient.includes("gradient")));
  assert.ok(model.summaryTiles.every((tile) => tile.value.length > 0));
  assert.equal(model.summaryTiles.find((tile) => tile.id === "poop")?.unit, "type");
  assert.deepEqual(
    model.trendHighlights.map((highlight) => highlight.id),
    ["feed", "sleep", "wet", "stool"],
  );
  assert.ok(model.trendHighlights.every((highlight) => highlight.headline.length > 0));
});

test("buildTrendsOverviewModel shapes overview rows and day-series data", () => {
  const todayFeed = createFeed("feed-today", isoDaysAgo(0, 8, 30));
  const yesterdayFeed = createFeed("feed-yesterday", isoDaysAgo(1, 7, 15));
  const todaySleep = createSleep("sleep-today", isoDaysAgo(0, 1, 0), isoDaysAgo(0, 3, 0));
  const todayWet = createDiaper("diaper-today", isoDaysAgo(0, 9, 0), "wet");
  const todayPoop = createPoop("poop-today", isoDaysAgo(0, 10, 0), 2);

  const model = buildTrendsOverviewModel({
    child,
    days: 7,
    poopLogs: [todayPoop],
    lastRealPoop: todayPoop,
    feedingLogs: [todayFeed, yesterdayFeed],
    sleepLogs: [todaySleep],
    diaperLogs: [todayWet],
  });

  assert.equal(model.overviewRows.length, 7);
  assert.ok(model.overviewRows.some((row) => row.events.some((event) => event.kind === "sleep")));
  assert.ok(model.overviewRows.some((row) => row.events.some((event) => event.kind === "feed")));
  assert.equal(model.feedChart.data.length, 7);
  assert.equal(model.sleepChart.data.length, 7);
  assert.equal(model.diaperChart.data.length, 7);
  assert.ok(model.overviewNarrative.length >= 3);
  assert.match(model.poopNarrative, /latest stool|poop trends/i);
  assert.match(
    model.trendHighlights.find((highlight) => highlight.id === "feed")?.detail ?? "",
    /Recent days average/i,
  );
});

test("buildTrendsOverviewModel counts breastfeeding logs on the local feed chart day", () => {
  const todayKey = formatLocalDateKey(new Date());
  const todayBreastfeed = createFeed("breastfeed-today", isoDaysAgo(0, 6, 15), "breast_milk", {
    amount_ml: null,
    bottle_content: null,
    breast_side: "left",
    duration_minutes: 12,
  });
  const todayBottle = createFeed("bottle-today", isoDaysAgo(0, 8, 30), "bottle", {
    amount_ml: 90,
    bottle_content: "breast_milk",
  });

  const model = buildTrendsOverviewModel({
    child,
    days: 7,
    poopLogs: [],
    lastRealPoop: null,
    feedingLogs: [todayBottle, todayBreastfeed],
    sleepLogs: [],
    diaperLogs: [],
  });

  const todayFeedDatum = model.feedChart.data.find((datum) => datum.date === todayKey);

  assert.equal(todayFeedDatum?.feeds, 2);
  assert.ok(model.overviewRows.some((row) => row.dayKey === todayKey && row.events.some((event) => event.id === "feed-breastfeed-today")));
});
