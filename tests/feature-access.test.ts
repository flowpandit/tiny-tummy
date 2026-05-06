import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_IDS,
  FREE_HISTORY_WINDOW_DAYS,
  PREMIUM_FEATURE_IDS,
  canAccessChild,
  canUseFeature,
  canUsePremiumFeature,
  createFeatureGateService,
  getAccessKind,
  getAllowedActiveChildId,
  getFeatureAccess,
  getFirstFreeChild,
  getFreeHistoryStartDate,
  getReportFeatureIdForKind,
  getReportFeatureIdForMode,
  normalizeFeatureId,
} from "../src/lib/feature-access.ts";
import {
  DEVELOPER_FEATURE_ENTITLEMENT_PRESETS,
  formatDeveloperFeatureEntitlements,
  parseDeveloperFeatureEntitlements,
} from "../src/lib/developer-feature-entitlements.ts";
import { LIFETIME_PRIVATE_PRODUCT_ID } from "../src/lib/billing/products.ts";
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
  productId: LIFETIME_PRIVATE_PRODUCT_ID,
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

test("feature ids include current, future sync, and future add-on gates", () => {
  assert.ok(FEATURE_IDS.includes("poop_logging"));
  assert.ok(FEATURE_IDS.includes("pediatrician_report"));
  assert.ok(FEATURE_IDS.includes("caregiver_handoff_pdf"));
  assert.ok(FEATURE_IDS.includes("family_sync"));
  assert.ok(FEATURE_IDS.includes("advanced_report_pack"));
});

test("free user access map keeps core local and compatibility-free features available", () => {
  const service = createFeatureGateService(trialExpired);

  assert.equal(service.canUseFeature("child_profile_basic"), true);
  assert.equal(service.canUseFeature("poop_logging"), true);
  assert.equal(service.canUseFeature("diaper_logging"), true);
  assert.equal(service.canUseFeature("feed_logging"), true);
  assert.equal(service.canUseFeature("sleep_logging"), true);
  assert.equal(service.canUseFeature("basic_history"), true);
  assert.equal(service.canUseFeature("basic_guidance"), true);
  assert.equal(service.canUseFeature("caregiver_handoff"), true);
  assert.equal(service.canUseFeature("caregiver_handoff_pdf"), true);

  assert.equal(service.canUseFeature("unlimited_history"), false);
  assert.equal(service.canUseFeature("pediatrician_report"), false);
  assert.equal(service.canUseFeature("advanced_report_modes"), false);
  assert.equal(service.canUseFeature("multi_child"), false);
  assert.equal(service.canUseFeature("stool_photo_capture"), false);
  assert.equal(service.canUseFeature("smart_reminders"), false);
  assert.equal(service.canUseFeature("family_sync"), false);
});

test("trial and lifetime private access unlock current private features without sync", () => {
  assert.equal(getAccessKind(trialActive), "trial");
  assert.equal(getAccessKind(premiumUnlocked), "premium");

  const trialService = createFeatureGateService(trialActive);
  const lifetimeService = createFeatureGateService(premiumUnlocked);

  assert.equal(trialService.canUseFeature("unlimited_history"), true);
  assert.equal(trialService.canUseFeature("pediatrician_report"), true);
  assert.equal(trialService.canUseFeature("advanced_report_modes"), true);
  assert.equal(trialService.canUseFeature("multi_child"), true);
  assert.equal(trialService.canUseFeature("advanced_trends"), true);
  assert.equal(trialService.canUseFeature("stool_photo_capture"), true);
  assert.equal(trialService.canUseFeature("smart_reminders"), true);
  assert.equal(trialService.canUseFeature("family_sync"), false);

  assert.equal(lifetimeService.canUseFeature("unlimited_history"), true);
  assert.equal(lifetimeService.canUseFeature("pediatrician_report"), true);
  assert.equal(lifetimeService.canUseFeature("export_backup"), true);
  assert.equal(lifetimeService.canUseFeature("import_backup"), true);
  assert.equal(lifetimeService.canUseFeature("csv_export"), true);
  assert.equal(lifetimeService.canUseFeature("family_sync"), false);
  assert.equal(lifetimeService.canUseFeature("caregiver_invites"), false);
  assert.equal(lifetimeService.canUseFeature("multi_device_sync"), false);
  assert.equal(lifetimeService.canUseFeature("cloud_backup"), false);
  assert.equal(lifetimeService.canUseFeature("shared_live_today"), false);
  assert.equal(lifetimeService.canUseFeature("sync_subscription"), false);
  assert.equal(
    lifetimeService.getCurrentEntitlements().some((entitlement) => entitlement.id === "sync_addon"),
    false,
  );
});

test("expired trials become free basic and legacy premium wrappers remain compatible", () => {
  assert.equal(getAccessKind(trialExpired), "free");

  for (const featureId of PREMIUM_FEATURE_IDS) {
    assert.equal(canUsePremiumFeature(trialExpired, featureId), false);
    assert.equal(canUsePremiumFeature(trialActive, featureId), true);
    assert.equal(canUsePremiumFeature(premiumUnlocked, featureId), true);
  }

  assert.equal(normalizeFeatureId("doctorReports"), "pediatrician_report");
  assert.equal(normalizeFeatureId("multiChild"), "multi_child");
});

test("canUseFeature respects feature ids for add-on access", () => {
  const reportPackService = createFeatureGateService(trialExpired, {
    entitlements: ["report_pack"],
  });

  assert.equal(reportPackService.canUseFeature("pediatrician_report"), true);
  assert.equal(reportPackService.canUseFeature("advanced_report_modes"), true);
  assert.equal(reportPackService.canUseFeature("advanced_report_pack"), true);
  assert.equal(reportPackService.canUseFeature("unlimited_history"), false);
  assert.equal(reportPackService.canUseFeature("multi_child"), false);
});

test("future sync add-on grants only sync features", () => {
  const syncService = createFeatureGateService(trialExpired, {
    entitlements: ["sync_addon"],
  });

  assert.equal(syncService.canUseFeature("family_sync"), true);
  assert.equal(syncService.canUseFeature("caregiver_invites"), true);
  assert.equal(syncService.canUseFeature("multi_device_sync"), true);
  assert.equal(syncService.canUseFeature("cloud_backup"), true);
  assert.equal(syncService.canUseFeature("shared_live_today"), true);
  assert.equal(syncService.canUseFeature("sync_subscription"), true);
  assert.equal(syncService.canUseFeature("pediatrician_report"), false);
  assert.equal(syncService.canUseFeature("multi_child"), false);
});

test("developer feature entitlement parser keeps only supported simulation entitlements", () => {
  assert.deepEqual(parseDeveloperFeatureEntitlements(null), []);
  assert.deepEqual(parseDeveloperFeatureEntitlements("not-json"), []);
  assert.deepEqual(parseDeveloperFeatureEntitlements(JSON.stringify({ report_pack: true })), []);
  assert.deepEqual(
    parseDeveloperFeatureEntitlements(JSON.stringify([
      "report_pack",
      "report_pack",
      "sync_addon",
      "free",
      "trial",
      "store_entitlement",
      "unknown",
      42,
    ])),
    ["report_pack", "sync_addon"],
  );
  assert.equal(
    formatDeveloperFeatureEntitlements(DEVELOPER_FEATURE_ENTITLEMENT_PRESETS.allFeatureAccess),
    JSON.stringify(["report_pack", "family_lifetime", "sync_addon"]),
  );
});

test("family lifetime can represent bundled local and sync access", () => {
  const familyLifetimeService = createFeatureGateService(trialExpired, {
    entitlements: ["family_lifetime"],
  });

  assert.equal(familyLifetimeService.canUseFeature("multi_child"), true);
  assert.equal(familyLifetimeService.canUseFeature("pediatrician_report"), true);
  assert.equal(familyLifetimeService.canUseFeature("family_sync"), true);
  assert.equal(familyLifetimeService.canUseFeature("cloud_backup"), true);
});

test("feature access explains required entitlement and source", () => {
  const freeReportAccess = getFeatureAccess(trialExpired, "pediatrician_report");
  assert.equal(freeReportAccess.allowed, false);
  assert.equal(freeReportAccess.requiredEntitlement, "lifetime_private");
  assert.equal(freeReportAccess.reason, "missing_entitlement");
  assert.match(freeReportAccess.upgradeMessage, /PDFs/);

  const trialReportAccess = getFeatureAccess(trialActive, "pediatrician_report");
  assert.equal(trialReportAccess.allowed, true);
  assert.equal(trialReportAccess.source, "trial");

  const debugPremium: EntitlementState = {
    ...premiumUnlocked,
    platform: "debug",
  };
  const debugAccess = getFeatureAccess(debugPremium, "pediatrician_report");
  assert.equal(debugAccess.allowed, true);
  assert.equal(debugAccess.source, "developer_override");
});

test("upgrade reason is clear for future sync features", () => {
  const service = createFeatureGateService(trialExpired);

  assert.match(service.getUpgradeReason("family_sync") ?? "", /Family Sync/);
  assert.equal(service.getUpgradeReason("poop_logging"), null);
});

test("report and handoff helpers map to clean feature ids", () => {
  assert.equal(getReportFeatureIdForKind("fullHealth"), "pediatrician_report");
  assert.equal(getReportFeatureIdForKind("poopTummy"), "pediatrician_report");
  assert.equal(getReportFeatureIdForMode("pediatrician_full"), "pediatrician_report");
  assert.equal(getReportFeatureIdForMode("doctor_brief"), "pediatrician_report");
  assert.equal(getReportFeatureIdForMode("poop_diaper"), "pediatrician_report");
  assert.equal(getReportFeatureIdForMode("symptoms_episodes"), "advanced_report_modes");
  assert.equal(getReportFeatureIdForMode("caregiver_handoff"), "caregiver_handoff_pdf");
});

test("offline default access stays compatible during entitlement loading", () => {
  const service = createFeatureGateService(null);
  const entitlements = service.getCurrentEntitlements().map((entitlement) => entitlement.id);

  assert.deepEqual(entitlements, ["free", "trial"]);
  assert.equal(canUseFeature(null, "pediatrician_report"), true);
  assert.equal(service.canUseFeature("family_sync"), false);
  assert.ok(service.listEnabledFeatures().includes("poop_logging"));
  assert.ok(service.listLockedFeatures().includes("family_sync"));
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
