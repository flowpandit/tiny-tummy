import test from "node:test";
import assert from "node:assert/strict";
import {
  buildActiveBreastfeedingInsight,
  buildActiveSleepInsight,
  buildHomeAssistantModel,
  elevateActiveFeedInsight,
  elevateActiveSleepInsight,
} from "../src/lib/home-insights.ts";
import type { ChildDailySummary } from "../src/lib/child-summary.ts";
import { FEED_PREDICTION_FALLBACK } from "../src/lib/feed-insights.ts";
import type { Child, FeedingEntry, SleepEntry } from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Mira",
  date_of_birth: "2024-01-01",
  sex: null,
  feeding_type: "solids",
  avatar_color: "#f4a261",
  is_active: 1,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const summary: ChildDailySummary = {
  lastDiaper: null,
  lastFeed: null,
  latestEpisodeUpdate: null,
  latestSymptom: null,
  todayWetDiapers: 3,
  todayDirtyDiapers: 0,
  todayPoops: 0,
  todayFeeds: 0,
  hasNoPoopDay: false,
  visibleAlerts: [],
  recentSymptoms: [],
  activeEpisode: null,
};

test("home insights can omit hydration for children using poop tracking", () => {
  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date("2026-05-03T10:00:00.000Z"),
  });

  assert.deepEqual(model.insights.map((insight) => insight.id), ["poop", "feed", "sleep"]);
  assert.notEqual(model.recommendation.accent, "hydration");
});

test("home insights include hydration when diaper tracking is active", () => {
  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    includeHydration: true,
    now: new Date("2026-05-03T10:00:00.000Z"),
  });

  assert.deepEqual(model.insights.map((insight) => insight.id), ["poop", "hydration", "feed", "sleep"]);
});

test("home feed insight falls back when there is not enough feed data", () => {
  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date("2026-05-03T10:00:00.000Z"),
  });

  const feedInsight = model.insights.find((insight) => insight.id === "feed");

  assert.equal(feedInsight?.value, "Log feeds to start predicting feeding times");
});

test("home feed insight uses the unified feed prediction", () => {
  const recentBottle = createFeed({
    id: "bottle-1",
    logged_at: new Date(Date.now() - (60 * 60 * 1000)).toISOString(),
    food_type: "bottle",
    amount_ml: 110,
    bottle_content: "breast_milk",
  });

  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [recentBottle],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date(),
  });

  const feedInsight = model.insights.find((insight) => insight.id === "feed");

  assert.match(feedInsight?.value ?? "", /^Next feed in about /);
  assert.match(feedInsight?.detail ?? "", / - /);
  assert.doesNotMatch(feedInsight?.detail ?? "", /Usually feeds around this time/);
});

test("active breastfeeding insight replaces the next feed insight", () => {
  const activeFeed = buildActiveBreastfeedingInsight({
    childName: "Mira",
    activeSide: "left",
    elapsedMs: 12 * 60 * 1000,
  });
  const elevated = elevateActiveFeedInsight([
    { id: "poop", label: "Poop", value: "1 today", detail: "Keep an eye on it", accent: "poop" },
    { id: "feed", label: "Next feed", value: "Next feed", detail: "In ~25m", accent: "feed" },
    { id: "sleep", label: "Next sleep", value: "Next sleep", detail: "In ~2h", accent: "sleep" },
  ], activeFeed);

  assert.equal(activeFeed.value, "Mira is feeding");
  assert.equal(activeFeed.detail, "12 min · Left side");
  assert.deepEqual(elevated.map((insight) => insight.id), ["feed-active", "poop", "sleep"]);
});

test("active sleep insight elevates sleep with live timer copy", () => {
  const activeSleep = buildActiveSleepInsight({
    childName: "Mira",
    startedAt: "2026-05-03T10:15:00",
    elapsedMs: 32 * 60 * 1000,
  });
  const elevated = elevateActiveSleepInsight([
    { id: "poop", label: "Poop", value: "1 today", detail: "Keep an eye on it", accent: "poop" },
    { id: "sleep", label: "Next sleep window", value: "Next sleep window", detail: "In ~2h", accent: "sleep" },
  ], activeSleep);

  assert.equal(activeSleep.value, "Mira is sleeping");
  assert.match(activeSleep.detail, /^32 min · Started at /);
  assert.equal(activeSleep.actionLabel, "End sleep");
  assert.deepEqual(elevated.map((insight) => insight.id), ["sleep-active", "poop"]);
});

test("active sleep insight formats longer timers compactly", () => {
  const activeSleep = buildActiveSleepInsight({
    childName: "Mira",
    startedAt: "2026-05-03T20:15:00",
    elapsedMs: 3 * 60 * 60 * 1000 + 12 * 60 * 1000,
  });

  assert.match(activeSleep.detail, /^3 hr 12 min · Started at /);
});

test("home timeline includes completed sleep logs", () => {
  const sleepLog: SleepEntry = {
    id: "sleep-1",
    child_id: child.id,
    sleep_type: "nap",
    started_at: "2024-05-03T09:00:00",
    ended_at: "2024-05-03T09:45:00",
    notes: null,
    created_at: "2024-05-03T09:45:00",
  };

  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [sleepLog],
    alerts: [],
    includeHydration: false,
    now: new Date("2024-05-03T10:00:00"),
  });

  assert.equal(model.timeline[0]?.kind, "sleep");
  assert.equal(model.timeline[0]?.title, "Nap");
  assert.equal(model.timeline[0]?.detail, "45m");
});

test("home timeline presents breastfeeding logs with breastfeed styling metadata", () => {
  const breastfeed = createFeed({
    id: "breastfeed-1",
    logged_at: "2024-05-03T09:55:00",
    food_type: "breast_milk",
    duration_minutes: 1,
    breast_side: "right",
    notes: "Timed breastfeeding session • Right 1m",
  });

  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [breastfeed],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date("2024-05-03T10:00:00"),
  });

  assert.equal(model.timeline[0]?.kind, "feed");
  assert.equal(model.timeline[0]?.title, "Breastfeed");
  assert.equal(model.timeline[0]?.detail, "Right side · 1 min");
  assert.equal(model.timeline[0]?.accent, "breastfeedRight");
});

test("home recommendation uses mixed feed data for next feed prediction", () => {
  const breastfedChild = {
    ...child,
    feeding_type: "breast" as const,
  };
  const recentBottle = createFeed({
    id: "bottle-1",
    logged_at: new Date(Date.now() - (60 * 60 * 1000)).toISOString(),
    food_type: "bottle",
    amount_ml: 110,
    bottle_content: "breast_milk",
  });
  const olderBreastfeed = createFeed({
    id: "breast-1",
    logged_at: new Date(Date.now() - (4 * 60 * 60 * 1000)).toISOString(),
    food_type: "breast_milk",
    duration_minutes: 16,
    breast_side: "both",
  });

  const model = buildHomeAssistantModel({
    child: breastfedChild,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [olderBreastfeed, recentBottle],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date(),
  });

  assert.equal(model.recommendation.accent, "feed");
  assert.equal(model.recommendation.action, "open-feed");
  assert.match(model.recommendation.title, /feed/i);
});

test("home recommendation shows the feed fallback when there is no feed timeline", () => {
  const model = buildHomeAssistantModel({
    child,
    summary,
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    includeHydration: false,
    now: new Date("2026-05-03T10:00:00.000Z"),
  });

  assert.equal(model.recommendation.title, FEED_PREDICTION_FALLBACK);
  assert.equal(model.recommendation.accent, "feed");
  assert.equal(model.recommendation.action, "log-feed");
});

test("home recommendations can include multiple actionable cards", () => {
  const model = buildHomeAssistantModel({
    child,
    summary: {
      ...summary,
      todayWetDiapers: 0,
    },
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    includeHydration: true,
    now: new Date("2026-05-03T10:00:00.000Z"),
  });

  assert.deepEqual(model.recommendations.map((recommendation) => recommendation.accent), ["feed", "hydration"]);
  assert.deepEqual(model.recommendations.map((recommendation) => recommendation.action), ["log-feed", "log-diaper"]);
});

function createFeed(input: Partial<FeedingEntry> & Pick<FeedingEntry, "id" | "logged_at" | "food_type">): FeedingEntry {
  return {
    child_id: "child-1",
    food_name: null,
    amount_ml: null,
    duration_minutes: null,
    breast_side: null,
    bottle_content: null,
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: input.logged_at,
    ...input,
  };
}
