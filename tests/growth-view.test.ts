import test from "node:test";
import assert from "node:assert/strict";
import { countGrowthMeasures, formatCompactGrowthSummary, formatGrowthAgeLabel } from "../src/lib/growth-view.ts";
import type { GrowthEntry } from "../src/lib/types.ts";

function growth(overrides: Partial<GrowthEntry>): GrowthEntry {
  return {
    id: "growth-1",
    child_id: "child-1",
    measured_at: "2026-05-03T10:00:00",
    weight_kg: null,
    height_cm: null,
    head_circumference_cm: null,
    notes: null,
    created_at: "2026-05-03T10:00:00",
    ...overrides,
  };
}

test("growth view helpers count only captured measures", () => {
  assert.equal(countGrowthMeasures(null), 0);
  assert.equal(countGrowthMeasures(growth({ weight_kg: 4, head_circumference_cm: 40 })), 2);
});

test("compact growth summary keeps measurements label-free for cards", () => {
  assert.equal(
    formatCompactGrowthSummary(growth({ weight_kg: 4, height_cm: 56, head_circumference_cm: 40 }), "metric"),
    "4 kg • 56 cm • 40 cm",
  );
});

test("growth age labels stay compact for measurement history", () => {
  assert.equal(formatGrowthAgeLabel("2026-01-01", "2026-05-01T00:00:00"), "3.9 months");
  assert.equal(formatGrowthAgeLabel("2024-05-01", "2026-05-01T00:00:00"), "2 years");
});
