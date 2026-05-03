import test from "node:test";
import assert from "node:assert/strict";
import {
  getFeedPrediction,
  getUnifiedFeedTimeline,
  type FeedBaseline,
} from "../src/lib/feed-insights.ts";
import type { FeedingEntry } from "../src/lib/types.ts";

const baseline: FeedBaseline = {
  label: "Test rhythm",
  lowerHours: 2,
  upperHours: 4,
  description: "Test baseline",
};

function isoHoursAgo(hoursAgo: number) {
  return new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
}

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

test("unified feed timeline includes breast and bottle feeds but excludes pumping", () => {
  const olderBreastfeed = createFeed({
    id: "breast-1",
    logged_at: isoHoursAgo(6),
    food_type: "breast_milk",
    duration_minutes: 14,
    breast_side: "both",
  });
  const recentBottle = createFeed({
    id: "bottle-1",
    logged_at: isoHoursAgo(2),
    food_type: "bottle",
    amount_ml: 120,
    bottle_content: "breast_milk",
  });
  const pumping = createFeed({
    id: "pump-1",
    logged_at: isoHoursAgo(1),
    food_type: "pumping",
    amount_ml: 90,
  });

  assert.deepEqual(
    getUnifiedFeedTimeline([olderBreastfeed, pumping, recentBottle]).map((log) => log.id),
    ["bottle-1", "breast-1"],
  );
});

test("feed prediction uses the latest bottle in a mixed feeding timeline", () => {
  const olderBreastfeed = createFeed({
    id: "breast-1",
    logged_at: isoHoursAgo(6),
    food_type: "breast_milk",
    duration_minutes: 14,
    breast_side: "both",
  });
  const recentBottle = createFeed({
    id: "bottle-1",
    logged_at: isoHoursAgo(2),
    food_type: "bottle",
    amount_ml: 120,
    bottle_content: "formula",
  });

  const prediction = getFeedPrediction([olderBreastfeed, recentBottle], baseline);

  assert.ok(prediction);
  assert.equal(prediction.source, "history");
  assert.equal(
    prediction.predictedAt.getTime(),
    new Date(recentBottle.logged_at).getTime() + (4 * 60 * 60 * 1000),
  );
});

test("feed prediction has no estimate when only pumping has been logged", () => {
  const pumping = createFeed({
    id: "pump-1",
    logged_at: isoHoursAgo(1),
    food_type: "pumping",
    amount_ml: 90,
  });

  assert.equal(getFeedPrediction([pumping], baseline), null);
});
