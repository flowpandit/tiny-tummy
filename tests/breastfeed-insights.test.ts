import test from "node:test";
import assert from "node:assert/strict";
import {
  getBreastfeedPatternKind,
  getBreastfeedPatternLabel,
  getBreastfeedContextHistorySummary,
  getBreastfeedContextHistoryTitle,
} from "../src/lib/breastfeed-insights.ts";
import type { FeedingEntry } from "../src/lib/types.ts";

function createFeed(input: Partial<FeedingEntry> & Pick<FeedingEntry, "id" | "food_type">): FeedingEntry {
  return {
    child_id: "child-1",
    logged_at: "2026-05-03T10:30:00.000Z",
    food_name: null,
    amount_ml: null,
    duration_minutes: null,
    breast_side: null,
    bottle_content: null,
    reaction_notes: null,
    is_constipation_support: 0,
    notes: null,
    created_at: "2026-05-03T10:30:00.000Z",
    ...input,
  };
}

test("breastfeed context history labels bottle feeds without losing bottle details", () => {
  const bottleFeed = createFeed({
    id: "bottle-1",
    food_type: "bottle",
    amount_ml: 120,
    bottle_content: "breast_milk",
  });

  assert.equal(getBreastfeedContextHistoryTitle(bottleFeed), "Bottle: Breast milk");
  assert.equal(getBreastfeedContextHistorySummary(bottleFeed, "metric"), "120 ml");
});

test("breastfeed context history keeps nursing side and duration details", () => {
  const breastfeed = createFeed({
    id: "breast-1",
    food_type: "breast_milk",
    duration_minutes: 14,
    breast_side: "both",
  });

  assert.equal(getBreastfeedContextHistoryTitle(breastfeed), "Breastfeed");
  assert.equal(getBreastfeedContextHistorySummary(breastfeed, "metric"), "Both sides · 14 min");
});

test("breastfeed pattern classifies bottle and formula feeds as visible bottle context", () => {
  const expressedBottle = createFeed({
    id: "bottle-1",
    food_type: "bottle",
    bottle_content: "breast_milk",
  });
  const formulaFeed = createFeed({
    id: "formula-1",
    food_type: "formula",
    amount_ml: 90,
  });

  assert.equal(getBreastfeedPatternKind(expressedBottle), "bottle");
  assert.equal(getBreastfeedPatternKind(formulaFeed), "bottle");
  assert.equal(getBreastfeedPatternLabel("bottle"), "Bottle");
});

test("breastfeed pattern keeps side-specific nursing feeds distinct", () => {
  const leftFeed = createFeed({
    id: "left-feed",
    food_type: "breast_milk",
    breast_side: "left",
    duration_minutes: 8,
  });
  const noSideBreastMilk = createFeed({
    id: "expressed-feed",
    food_type: "breast_milk",
    amount_ml: 80,
  });

  assert.equal(getBreastfeedPatternKind(leftFeed), "left");
  assert.equal(getBreastfeedPatternKind(noSideBreastMilk), "bottle");
});
