import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllowedEliminationViewPreferences,
  normalizeEliminationViewPreference,
  resolveEliminationExperience,
} from "../src/lib/diaper.ts";

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
