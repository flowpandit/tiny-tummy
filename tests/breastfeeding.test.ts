import test from "node:test";
import assert from "node:assert/strict";
import { getBreastfeedingNextSideReason, getSuggestedBreastStartSide } from "../src/lib/breastfeeding.ts";

test("breastfeeding suggestion starts the next feed on the last used side", () => {
  assert.equal(getSuggestedBreastStartSide("left"), "left");
  assert.equal(getSuggestedBreastStartSide("right"), "right");
});

test("breastfeeding suggestion has no side before a tracked breastfeed", () => {
  assert.equal(getSuggestedBreastStartSide(null), null);
  assert.equal(getSuggestedBreastStartSide("both"), null);
});

test("breastfeeding next side reason stays compact and points to the last side", () => {
  assert.equal(
    getBreastfeedingNextSideReason("right", null),
    "Starting on the previously used side helps to keep milk supply balanced and prevent engorgement.",
  );
});

test("breastfeeding next side reason falls back while timing a side", () => {
  assert.equal(
    getBreastfeedingNextSideReason("right", "right"),
    "Tiny Tummy will remember the last side after you save a session.",
  );
});
