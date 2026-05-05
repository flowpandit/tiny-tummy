import test from "node:test";
import assert from "node:assert/strict";
import { getAgeLabelFromDob, getUtcIsoBoundsForLocalDateRange, nowISO } from "../src/lib/utils.ts";

test("labels exact calendar month boundaries using full months, not approximate day buckets", () => {
  assert.equal(
    getAgeLabelFromDob("2026-02-24", new Date(2026, 3, 24, 9, 0, 0, 0)),
    "2 months old",
  );

  assert.equal(
    getAgeLabelFromDob("2026-03-25", new Date(2026, 3, 24, 9, 0, 0, 0)),
    "1 month old",
  );
});

test("builds UTC ISO bounds from local date-range selections", () => {
  const bounds = getUtcIsoBoundsForLocalDateRange("2026-04-24", "2026-04-24");

  assert.deepEqual(bounds, {
    startUtcIso: new Date(2026, 3, 24, 0, 0, 0, 0).toISOString(),
    endUtcIso: new Date(2026, 3, 24, 23, 59, 59, 999).toISOString(),
  });
});

test("nowISO returns a UTC ISO timestamp with timezone marker", () => {
  assert.match(nowISO(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});
