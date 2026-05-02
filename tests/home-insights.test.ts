import test from "node:test";
import assert from "node:assert/strict";
import { buildHomeAssistantModel } from "../src/lib/home-insights.ts";
import type { ChildDailySummary } from "../src/lib/child-summary.ts";
import type { Child } from "../src/lib/types.ts";

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
