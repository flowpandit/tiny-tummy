import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedEliminationViewPreferences,
  normalizeEliminationViewPreference,
  resolveEliminationExperience,
} from "../src/lib/diaper.ts";
import { getHydrationStatus } from "../src/lib/diaper-insights.ts";
import type { DiaperEntry } from "../src/lib/types.ts";

test("infants only allow auto and diaper elimination preferences", () => {
  const infant = { date_of_birth: "2026-02-23" };

  assert.deepEqual(getAllowedEliminationViewPreferences(infant), ["auto", "diaper"]);
  assert.equal(normalizeEliminationViewPreference(infant, "poop"), "auto");
  assert.deepEqual(resolveEliminationExperience(infant, "poop"), {
    mode: "diaper",
    navLabel: "Diaper",
    route: "/diaper",
  });
});

test("older children can still use the poop elimination preference", () => {
  const olderChild = { date_of_birth: "2024-02-23" };

  assert.deepEqual(getAllowedEliminationViewPreferences(olderChild), ["auto", "diaper", "poop"]);
  assert.equal(normalizeEliminationViewPreference(olderChild, "poop"), "poop");
  assert.deepEqual(resolveEliminationExperience(olderChild, "poop"), {
    mode: "poop",
    navLabel: "Poop",
    route: "/poop",
  });
});

function isoHoursAgo(hoursAgo: number) {
  return new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
}

function createWetDiaper(id: string, loggedAt: string, urineColor: DiaperEntry["urine_color"] = "normal"): DiaperEntry {
  return {
    id,
    child_id: "child-1",
    logged_at: loggedAt,
    diaper_type: "wet",
    urine_color: urineColor,
    stool_type: null,
    color: null,
    size: null,
    notes: null,
    photo_path: null,
    linked_poop_log_id: null,
    created_at: loggedAt,
    updated_at: loggedAt,
  };
}

test("getHydrationStatus ignores a malformed newest wet log when recent valid wet logs exist", () => {
  const logs = [
    createWetDiaper("wet-invalid", "not-a-date"),
    createWetDiaper("wet-1", isoHoursAgo(1)),
    createWetDiaper("wet-2", isoHoursAgo(2)),
    createWetDiaper("wet-3", isoHoursAgo(3)),
    createWetDiaper("wet-4", isoHoursAgo(4)),
  ];

  assert.deepEqual(getHydrationStatus(logs), {
    tone: "healthy",
    title: "Wet output looks steady",
    description: "Recent wet diapers suggest hydration is staying in a normal-looking rhythm.",
  });
});

test("getHydrationStatus treats all-invalid wet timestamps as unknown instead of escalating by default", () => {
  const logs = [
    createWetDiaper("wet-invalid-1", "still-not-a-date"),
    createWetDiaper("wet-invalid-2", "bad-timestamp"),
  ];

  assert.deepEqual(getHydrationStatus(logs), {
    tone: "info",
    title: "Watch wet output",
    description: "Keep logging wet diapers so hydration changes are easier to spot early.",
  });
});
