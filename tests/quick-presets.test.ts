import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureEssentialFeedPresets,
  getDefaultFeedDraft,
  getDefaultQuickFeedPresets,
} from "../src/lib/quick-presets.ts";

test("breast feed quick defaults avoid side-specific tiles", () => {
  const presets = getDefaultQuickFeedPresets("breast");

  assert.deepEqual(
    presets.map((preset) => preset.label),
    ["Breastfeed", "Breast milk", "Pumping", "Bottle"],
  );
  assert.deepEqual(
    presets.map((preset) => preset.draft.breast_side ?? null),
    [null, null, null, null],
  );
  assert.equal(getDefaultFeedDraft("breast").breast_side ?? null, null);
});

test("mixed feed quick defaults avoid left and right breastfeed tiles", () => {
  const presets = getDefaultQuickFeedPresets("mixed");

  assert.deepEqual(
    presets.map((preset) => preset.label),
    ["Breastfeed", "Bottle", "Solids", "Water"],
  );
  assert.deepEqual(
    presets.map((preset) => preset.draft.breast_side ?? null),
    [null, null, null, null],
  );
});

test("essential mixed feed fallback uses the neutral breastfeed tile", () => {
  const presets = ensureEssentialFeedPresets([
    {
      id: "saved-bottle",
      label: "Bottle",
      description: "Bottle feed",
      draft: { food_type: "bottle" },
    },
  ], "mixed");

  assert.equal(presets[0]?.label, "Breastfeed");
  assert.equal(presets[0]?.draft.food_type, "breast_milk");
  assert.equal(presets[0]?.draft.breast_side ?? null, null);
});
