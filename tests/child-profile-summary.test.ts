import test from "node:test";
import assert from "node:assert/strict";
import { buildChildProfileSubtitleParts, getChildProfileAgeLabel } from "../src/lib/child-profile-summary.ts";
import type { Child, GrowthEntry } from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Ava",
  date_of_birth: "2026-03-02",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#2f6fed",
  is_active: 1,
  created_at: "2026-03-02T00:00:00",
  updated_at: "2026-03-02T00:00:00",
};

function growth(overrides: Partial<GrowthEntry>): GrowthEntry {
  return {
    id: "growth-1",
    child_id: child.id,
    measured_at: "2026-04-02T10:00:00",
    weight_kg: null,
    height_cm: null,
    head_circumference_cm: null,
    notes: null,
    created_at: "2026-04-02T10:00:00",
    ...overrides,
  };
}

test("profile age label uses months before one year", () => {
  assert.equal(getChildProfileAgeLabel("2026-03-02", new Date(2026, 3, 2)), "1 month old");
  assert.equal(getChildProfileAgeLabel("2026-03-25", new Date(2026, 3, 2)), "0 months old");
});

test("profile age label switches to years at twelve months", () => {
  assert.equal(getChildProfileAgeLabel("2025-04-02", new Date(2026, 3, 2)), "1 year old");
  assert.equal(getChildProfileAgeLabel("2024-04-02", new Date(2026, 3, 2)), "2 years old");
});

test("profile subtitle includes only real growth measurements", () => {
  assert.deepEqual(
    buildChildProfileSubtitleParts({
      child,
      growthLogs: [],
      referenceDate: new Date(2026, 3, 2),
    }),
    ["1 month old"],
  );

  assert.deepEqual(
    buildChildProfileSubtitleParts({
      child,
      growthLogs: [
        growth({ id: "growth-2", measured_at: "2026-04-03T10:00:00", height_cm: 50 }),
        growth({ id: "growth-1", measured_at: "2026-04-02T10:00:00", weight_kg: 3 }),
      ],
      referenceDate: new Date(2026, 3, 2),
    }),
    ["1 month old", "3 kg", "50 cm"],
  );
});
