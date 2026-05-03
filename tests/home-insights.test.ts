import test from "node:test";
import assert from "node:assert/strict";
import { buildHomeAssistantModel } from "../src/lib/home-insights.ts";
import type { ChildDailySummary } from "../src/lib/child-summary.ts";
import { FEED_PREDICTION_FALLBACK } from "../src/lib/feed-insights.ts";
import type { Child, FeedingEntry } from "../src/lib/types.ts";

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

  assert.deepEqual(model.insights.map((insight) => insight.id), ["poop", "sleep"]);
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

  assert.deepEqual(model.insights.map((insight) => insight.id), ["poop", "hydration", "sleep"]);
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
