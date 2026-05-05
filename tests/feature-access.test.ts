import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_HISTORY_WINDOW_DAYS,
  PREMIUM_FEATURE_IDS,
  canAccessChild,
  canUsePremiumFeature,
  getAccessKind,
  getAllowedActiveChildId,
  getFirstFreeChild,
  getFreeHistoryStartDate,
} from "../src/lib/feature-access.ts";
import type { EntitlementState } from "../src/lib/entitlements.ts";
import type { Child } from "../src/lib/types.ts";

const trialActive: EntitlementState = {
  kind: "trial_active",
  daysRemaining: 8,
  trialStartedAt: "2026-04-01T00:00:00.000Z",
};

const trialExpired: EntitlementState = {
  kind: "trial_expired",
  daysRemaining: 0,
  trialStartedAt: "2026-04-01T00:00:00.000Z",
};

const premiumUnlocked: EntitlementState = {
  kind: "premium_unlocked",
  daysRemaining: 14,
  platform: "apple",
  productId: "premium_unlock",
  trialStartedAt: "2026-04-01T00:00:00.000Z",
};

const firstChild: Child = {
  id: "child-1",
  name: "Mila",
  date_of_birth: "2026-01-01",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#f6b26b",
  is_active: 1,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const secondChild: Child = {
  ...firstChild,
  id: "child-2",
  name: "Noah",
  created_at: "2026-04-03T00:00:00.000Z",
};

test("trial and premium access unlock every premium feature", () => {
  assert.equal(getAccessKind(trialActive), "trial");
  assert.equal(getAccessKind(premiumUnlocked), "premium");

  for (const featureId of PREMIUM_FEATURE_IDS) {
    assert.equal(canUsePremiumFeature(trialActive, featureId), true);
    assert.equal(canUsePremiumFeature(premiumUnlocked, featureId), true);
  }
});

test("expired trials become free basic and block premium features", () => {
  assert.equal(getAccessKind(trialExpired), "free");

  for (const featureId of PREMIUM_FEATURE_IDS) {
    assert.equal(canUsePremiumFeature(trialExpired, featureId), false);
  }
});

test("free plan keeps the first-created child available and locks later children", () => {
  const children = [secondChild, firstChild];

  assert.equal(getFirstFreeChild(children)?.id, "child-1");
  assert.equal(canAccessChild("child-1", children, trialExpired), true);
  assert.equal(canAccessChild("child-2", children, trialExpired), false);
  assert.equal(canAccessChild("child-2", children, trialActive), true);
  assert.equal(getAllowedActiveChildId("child-2", children, trialExpired), "child-1");
});

test("free history window stays at exactly seven calendar days including today", () => {
  assert.equal(FREE_HISTORY_WINDOW_DAYS, 7);
  assert.equal(getFreeHistoryStartDate("2026-04-14"), "2026-04-08");
  assert.equal(getFreeHistoryStartDate("2026-03-02"), "2026-02-24");
});
