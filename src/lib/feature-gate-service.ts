import type { EntitlementState } from "./entitlements";
import type { ReportKind, ReportMode } from "./reporting";

/**
 * Canonical feature IDs for local access checks.
 *
 * The effective access policy below preserves today's app behavior. Some
 * currently-free local features also carry a futureRequiredEntitlement so the
 * pricing model can move them later without inventing new IDs.
 */
export const FEATURE_IDS = [
  "child_profile_basic",
  "poop_logging",
  "diaper_logging",
  "feed_logging",
  "sleep_logging",
  "basic_history",
  "basic_guidance",
  "unlimited_history",
  "pediatrician_report",
  "advanced_report_modes",
  "caregiver_handoff",
  "caregiver_handoff_pdf",
  "export_backup",
  "import_backup",
  "csv_export",
  "multi_child",
  "growth_tracking",
  "symptoms_episodes",
  "advanced_trends",
  "stool_photo_capture",
  "smart_reminders",
  "family_sync",
  "caregiver_invites",
  "multi_device_sync",
  "cloud_backup",
  "shared_live_today",
  "advanced_report_pack",
  "family_lifetime",
  "sync_subscription",
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export const LEGACY_PREMIUM_FEATURE_IDS = [
  "doctorReports",
  "fullHistory",
  "advancedInsights",
  "photoCapture",
  "multiChild",
  "smartReminders",
] as const;

export type LegacyPremiumFeatureId = (typeof LEGACY_PREMIUM_FEATURE_IDS)[number];
export type FeatureIdentifier = FeatureId | LegacyPremiumFeatureId;

export const ENTITLEMENT_IDS = [
  "free",
  "trial",
  "lifetime_private",
  "report_pack",
  "family_lifetime",
  "sync_addon",
  "developer_override",
  "store_entitlement",
] as const;

export type EntitlementId = (typeof ENTITLEMENT_IDS)[number];
export type FeatureAccessSource = "free" | "trial" | "lifetime_private" | "addon" | "developer_override";
export type FeatureCategory = "core_local" | "private_lifetime" | "future_sync" | "future_addon";
export type FeatureAccessReason =
  | "included_free"
  | "trial_active"
  | "lifetime_private_unlocked"
  | "addon_unlocked"
  | "developer_override"
  | "missing_entitlement";

interface FeatureDefinition {
  id: FeatureId;
  category: FeatureCategory;
  label: string;
  title: string;
  description: string;
  requiredEntitlement: EntitlementId;
  futureRequiredEntitlement?: EntitlementId;
}

export interface CurrentEntitlement {
  id: EntitlementId;
  source: FeatureAccessSource;
  platform?: string | null;
  productId?: string | null;
  stateKind?: EntitlementState["kind"] | "derived";
}

export interface FeatureAccess {
  allowed: boolean;
  featureId: FeatureId;
  requiredEntitlement: EntitlementId;
  reason: FeatureAccessReason;
  upgradeMessage: string;
  source: FeatureAccessSource;
}

export interface FeatureGateContext {
  entitlements?: readonly EntitlementId[];
}

const FEATURE_ID_SET = new Set<FeatureId>(FEATURE_IDS);
const LEGACY_PREMIUM_FEATURE_ID_SET = new Set<LegacyPremiumFeatureId>(LEGACY_PREMIUM_FEATURE_IDS);

const LEGACY_FEATURE_ID_MAP: Record<LegacyPremiumFeatureId, FeatureId> = {
  doctorReports: "pediatrician_report",
  fullHistory: "unlimited_history",
  advancedInsights: "advanced_trends",
  photoCapture: "stool_photo_capture",
  multiChild: "multi_child",
  smartReminders: "smart_reminders",
};

const FEATURE_DEFINITIONS: Record<FeatureId, FeatureDefinition> = {
  child_profile_basic: {
    id: "child_profile_basic",
    category: "core_local",
    label: "Free profile",
    title: "Child profiles stay free",
    description: "Create and manage the first local child profile without an account or cloud dependency.",
    requiredEntitlement: "free",
  },
  poop_logging: {
    id: "poop_logging",
    category: "core_local",
    label: "Free poop log",
    title: "Poop logging stays free",
    description: "Keep tracking stool color, consistency, timing, and notes privately on this device.",
    requiredEntitlement: "free",
  },
  diaper_logging: {
    id: "diaper_logging",
    category: "core_local",
    label: "Free diaper log",
    title: "Diaper logging stays free",
    description: "Log wet, dirty, and mixed diapers as part of the basic local care record.",
    requiredEntitlement: "free",
  },
  feed_logging: {
    id: "feed_logging",
    category: "core_local",
    label: "Free feed log",
    title: "Feed logging stays free",
    description: "Track feeds locally so diaper and tummy patterns have useful context.",
    requiredEntitlement: "free",
  },
  sleep_logging: {
    id: "sleep_logging",
    category: "core_local",
    label: "Free sleep log",
    title: "Sleep logging stays free",
    description: "Record sleep windows locally as part of the basic care timeline.",
    requiredEntitlement: "free",
  },
  basic_history: {
    id: "basic_history",
    category: "core_local",
    label: "Free history",
    title: "Recent history stays free",
    description: "Review recent local logs without unlocking the full private history.",
    requiredEntitlement: "free",
  },
  basic_guidance: {
    id: "basic_guidance",
    category: "core_local",
    label: "Free guidance",
    title: "Basic guidance stays free",
    description: "Access local guidance and privacy information without a purchase.",
    requiredEntitlement: "free",
  },
  unlimited_history: {
    id: "unlimited_history",
    category: "private_lifetime",
    label: "Premium history",
    title: "Unlock full poop and diaper history",
    description: "Search older days, use longer ranges, and keep the whole care timeline available when patterns matter.",
    requiredEntitlement: "lifetime_private",
  },
  pediatrician_report: {
    id: "pediatrician_report",
    category: "private_lifetime",
    label: "Premium report",
    title: "Unlock doctor-ready reports",
    description: "Create private PDFs with poop, diaper, feeding, symptoms, and timeline context for pediatrician visits.",
    requiredEntitlement: "lifetime_private",
  },
  advanced_report_modes: {
    id: "advanced_report_modes",
    category: "private_lifetime",
    label: "Premium reports",
    title: "Unlock advanced report modes",
    description: "Prepare focused report modes for pediatrician visits, tummy reviews, and longer health context.",
    requiredEntitlement: "lifetime_private",
  },
  caregiver_handoff: {
    id: "caregiver_handoff",
    category: "private_lifetime",
    label: "Handoff",
    title: "Caregiver handoff is available",
    description: "Prepare a local caregiver summary from logs already stored on this device.",
    requiredEntitlement: "free",
    futureRequiredEntitlement: "lifetime_private",
  },
  caregiver_handoff_pdf: {
    id: "caregiver_handoff_pdf",
    category: "private_lifetime",
    label: "Handoff PDF",
    title: "Caregiver handoff PDFs are available",
    description: "Generate a local caregiver handoff PDF without sending baby data to a server.",
    requiredEntitlement: "free",
    futureRequiredEntitlement: "lifetime_private",
  },
  export_backup: {
    id: "export_backup",
    category: "private_lifetime",
    label: "Premium backup",
    title: "Unlock local backup export",
    description: "Export a private device backup when you want to keep a copy outside the app.",
    requiredEntitlement: "lifetime_private",
  },
  import_backup: {
    id: "import_backup",
    category: "private_lifetime",
    label: "Premium import",
    title: "Unlock local backup import",
    description: "Import a Tiny Tummy backup into this local app without using an account.",
    requiredEntitlement: "lifetime_private",
  },
  csv_export: {
    id: "csv_export",
    category: "private_lifetime",
    label: "Premium CSV",
    title: "Unlock CSV export",
    description: "Export local records as CSV when you need a spreadsheet-friendly copy.",
    requiredEntitlement: "lifetime_private",
  },
  multi_child: {
    id: "multi_child",
    category: "private_lifetime",
    label: "Premium family",
    title: "Unlock multi-child tracking",
    description: "Keep private logs for every child without accounts, ads, cloud storage, or subscriptions.",
    requiredEntitlement: "lifetime_private",
  },
  growth_tracking: {
    id: "growth_tracking",
    category: "private_lifetime",
    label: "Growth",
    title: "Growth tracking is available",
    description: "Track growth measurements locally as part of the baby health record.",
    requiredEntitlement: "free",
    futureRequiredEntitlement: "lifetime_private",
  },
  symptoms_episodes: {
    id: "symptoms_episodes",
    category: "private_lifetime",
    label: "Health episodes",
    title: "Symptoms and episodes are available",
    description: "Track symptoms, temperatures, and health episodes locally for better context.",
    requiredEntitlement: "free",
    futureRequiredEntitlement: "lifetime_private",
  },
  advanced_trends: {
    id: "advanced_trends",
    category: "private_lifetime",
    label: "Premium trends",
    title: "Unlock advanced patterns",
    description: "See poop, diaper, feed, and sleep trends beyond today so changes are easier to explain.",
    requiredEntitlement: "lifetime_private",
  },
  stool_photo_capture: {
    id: "stool_photo_capture",
    category: "private_lifetime",
    label: "Premium photos",
    title: "Unlock private stool photos",
    description: "Add poop and diaper photos to your on-device log so visual changes are easier to compare.",
    requiredEntitlement: "lifetime_private",
  },
  smart_reminders: {
    id: "smart_reminders",
    category: "private_lifetime",
    label: "Premium reminders",
    title: "Unlock smart check-ins",
    description: "Get local no-poop, stool-color follow-up, and active episode reminders without sending data anywhere.",
    requiredEntitlement: "lifetime_private",
  },
  family_sync: {
    id: "family_sync",
    category: "future_sync",
    label: "Family Sync",
    title: "Family Sync is not included in Private unlock",
    description: "Future Family Sync can keep selected family data updated across approved caregivers and devices.",
    requiredEntitlement: "sync_addon",
  },
  caregiver_invites: {
    id: "caregiver_invites",
    category: "future_sync",
    label: "Caregiver invites",
    title: "Caregiver invites need Family Sync",
    description: "Invite caregivers only when the future Family Sync add-on is available.",
    requiredEntitlement: "sync_addon",
  },
  multi_device_sync: {
    id: "multi_device_sync",
    category: "future_sync",
    label: "Multi-device sync",
    title: "Multi-device sync needs Family Sync",
    description: "Use the future sync add-on to keep the same family record available on multiple devices.",
    requiredEntitlement: "sync_addon",
  },
  cloud_backup: {
    id: "cloud_backup",
    category: "future_sync",
    label: "Cloud backup",
    title: "Cloud backup needs Family Sync",
    description: "Cloud backup is reserved for the future optional sync model, not the local Private unlock.",
    requiredEntitlement: "sync_addon",
  },
  shared_live_today: {
    id: "shared_live_today",
    category: "future_sync",
    label: "Live Today",
    title: "Shared live Today needs Family Sync",
    description: "Live shared caregiver views belong to the future optional sync add-on.",
    requiredEntitlement: "sync_addon",
  },
  advanced_report_pack: {
    id: "advanced_report_pack",
    category: "future_addon",
    label: "Report pack",
    title: "Unlock the advanced report pack",
    description: "Use a future report add-on to unlock advanced report modes without changing the local app foundation.",
    requiredEntitlement: "report_pack",
  },
  family_lifetime: {
    id: "family_lifetime",
    category: "future_addon",
    label: "Family Lifetime",
    title: "Unlock Family Lifetime",
    description: "A future Family Lifetime add-on can combine local private features with family sync capabilities.",
    requiredEntitlement: "family_lifetime",
  },
  sync_subscription: {
    id: "sync_subscription",
    category: "future_addon",
    label: "Sync add-on",
    title: "Unlock optional Family Sync",
    description: "A future sync add-on can support invites, multi-device sync, cloud backup, and shared live views.",
    requiredEntitlement: "sync_addon",
  },
};

const REPORT_PACK_FEATURES = new Set<FeatureId>([
  "pediatrician_report",
  "advanced_report_modes",
  "advanced_report_pack",
]);

const SYNC_ADDON_FEATURES = new Set<FeatureId>([
  "family_sync",
  "caregiver_invites",
  "multi_device_sync",
  "cloud_backup",
  "shared_live_today",
  "sync_subscription",
]);

const LOCAL_PRIVATE_FEATURES = new Set<FeatureId>(
  FEATURE_IDS.filter((featureId) => {
    const requiredEntitlement = FEATURE_DEFINITIONS[featureId].requiredEntitlement;
    return requiredEntitlement === "lifetime_private" || requiredEntitlement === "free";
  }),
);

export function isEntitlementId(value: unknown): value is EntitlementId {
  return typeof value === "string" && (ENTITLEMENT_IDS as readonly string[]).includes(value);
}

function uniqueEntitlements(entitlements: CurrentEntitlement[]): CurrentEntitlement[] {
  const seen = new Set<EntitlementId>();
  const result: CurrentEntitlement[] = [];

  for (const entitlement of entitlements) {
    if (seen.has(entitlement.id)) continue;
    seen.add(entitlement.id);
    result.push(entitlement);
  }

  return result;
}

function sourceForExtraEntitlement(entitlementId: EntitlementId): FeatureAccessSource {
  if (entitlementId === "trial") return "trial";
  if (entitlementId === "developer_override") return "developer_override";
  if (entitlementId === "free") return "free";
  if (entitlementId === "lifetime_private" || entitlementId === "store_entitlement") return "lifetime_private";
  return "addon";
}

function baseEntitlementsFromState(entitlement: EntitlementState | null): CurrentEntitlement[] {
  const base: CurrentEntitlement[] = [
    { id: "free", source: "free", stateKind: "derived" },
  ];

  if (entitlement?.kind === "premium_unlocked") {
    base.push({
      id: "lifetime_private",
      source: entitlement.platform === "debug" ? "developer_override" : "lifetime_private",
      platform: entitlement.platform,
      productId: entitlement.productId,
      stateKind: entitlement.kind,
    });
    base.push({
      id: entitlement.platform === "debug" ? "developer_override" : "store_entitlement",
      source: entitlement.platform === "debug" ? "developer_override" : "lifetime_private",
      platform: entitlement.platform,
      productId: entitlement.productId,
      stateKind: entitlement.kind,
    });
    return base;
  }

  if (entitlement?.kind === "trial_expired") {
    return base;
  }

  base.push({ id: "trial", source: "trial", stateKind: entitlement?.kind ?? "derived" });
  return base;
}

function buildCurrentEntitlements(
  entitlement: EntitlementState | null,
  context?: FeatureGateContext,
): CurrentEntitlement[] {
  const entitlements = baseEntitlementsFromState(entitlement);

  for (const entitlementId of context?.entitlements ?? []) {
    if (!isEntitlementId(entitlementId)) continue;
    entitlements.push({
      id: entitlementId,
      source: sourceForExtraEntitlement(entitlementId),
      stateKind: "derived",
    });
  }

  return uniqueEntitlements(entitlements);
}

function hasEntitlement(entitlements: readonly CurrentEntitlement[], entitlementId: EntitlementId): boolean {
  return entitlements.some((entitlement) => entitlement.id === entitlementId);
}

function grantsFeature(entitlementId: EntitlementId, featureId: FeatureId): boolean {
  const definition = FEATURE_DEFINITIONS[featureId];

  if (definition.requiredEntitlement === "free") {
    return entitlementId === "free"
      || entitlementId === "trial"
      || entitlementId === "lifetime_private"
      || entitlementId === "family_lifetime"
      || entitlementId === "developer_override"
      || entitlementId === "store_entitlement";
  }

  if (entitlementId === "trial") {
    return definition.category === "private_lifetime";
  }

  if (entitlementId === "lifetime_private" || entitlementId === "store_entitlement" || entitlementId === "developer_override") {
    return definition.category === "private_lifetime";
  }

  if (entitlementId === "report_pack") {
    return REPORT_PACK_FEATURES.has(featureId);
  }

  if (entitlementId === "sync_addon") {
    return SYNC_ADDON_FEATURES.has(featureId);
  }

  if (entitlementId === "family_lifetime") {
    return LOCAL_PRIVATE_FEATURES.has(featureId) || SYNC_ADDON_FEATURES.has(featureId) || featureId === "family_lifetime";
  }

  return false;
}

function accessReasonForSource(source: FeatureAccessSource): FeatureAccessReason {
  if (source === "free") return "included_free";
  if (source === "trial") return "trial_active";
  if (source === "developer_override") return "developer_override";
  if (source === "addon") return "addon_unlocked";
  return "lifetime_private_unlocked";
}

function findGrantingEntitlement(
  entitlements: readonly CurrentEntitlement[],
  featureId: FeatureId,
): CurrentEntitlement | null {
  const priority: EntitlementId[] = [
    "free",
    "developer_override",
    "trial",
    "lifetime_private",
    "store_entitlement",
    "family_lifetime",
    "report_pack",
    "sync_addon",
  ];

  for (const entitlementId of priority) {
    const entitlement = entitlements.find((item) => item.id === entitlementId);
    if (entitlement && grantsFeature(entitlement.id, featureId)) return entitlement;
  }

  return null;
}

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === "string" && FEATURE_ID_SET.has(value as FeatureId);
}

export function isLegacyPremiumFeatureId(value: unknown): value is LegacyPremiumFeatureId {
  return typeof value === "string" && LEGACY_PREMIUM_FEATURE_ID_SET.has(value as LegacyPremiumFeatureId);
}

export function isFeatureIdentifier(value: unknown): value is FeatureIdentifier {
  return isFeatureId(value) || isLegacyPremiumFeatureId(value);
}

export function normalizeFeatureId(featureId: FeatureIdentifier): FeatureId {
  if (isFeatureId(featureId)) return featureId;
  return LEGACY_FEATURE_ID_MAP[featureId];
}

export function parseFeatureId(value: unknown): FeatureId | null {
  if (isFeatureId(value)) return value;
  if (isLegacyPremiumFeatureId(value)) return normalizeFeatureId(value);
  return null;
}

export function getFeatureDefinition(featureId: FeatureIdentifier): FeatureDefinition {
  return FEATURE_DEFINITIONS[normalizeFeatureId(featureId)];
}

export function getReportFeatureIdForKind(_reportKind: ReportKind): FeatureId {
  return "pediatrician_report";
}

export function getReportFeatureIdForMode(reportMode: ReportMode): FeatureId {
  if (reportMode === "caregiver_handoff") return "caregiver_handoff_pdf";
  if (reportMode === "symptoms_episodes") return "advanced_report_modes";
  return "pediatrician_report";
}

export class FeatureGateService {
  private readonly entitlement: EntitlementState | null;
  private readonly baseContext: FeatureGateContext;

  constructor(entitlement: EntitlementState | null, context: FeatureGateContext = {}) {
    this.entitlement = entitlement;
    this.baseContext = context;
  }

  canUseFeature(featureId: FeatureIdentifier, context?: FeatureGateContext): boolean {
    return this.getFeatureAccess(featureId, context).allowed;
  }

  getFeatureAccess(featureId: FeatureIdentifier, context?: FeatureGateContext): FeatureAccess {
    const normalizedFeatureId = normalizeFeatureId(featureId);
    const definition = FEATURE_DEFINITIONS[normalizedFeatureId];
    const entitlements = this.getCurrentEntitlements(context);
    const grantingEntitlement = findGrantingEntitlement(entitlements, normalizedFeatureId);

    if (grantingEntitlement) {
      return {
        allowed: true,
        featureId: normalizedFeatureId,
        requiredEntitlement: definition.requiredEntitlement,
        reason: accessReasonForSource(grantingEntitlement.source),
        upgradeMessage: definition.description,
        source: grantingEntitlement.source,
      };
    }

    return {
      allowed: false,
      featureId: normalizedFeatureId,
      requiredEntitlement: definition.requiredEntitlement,
      reason: "missing_entitlement",
      upgradeMessage: definition.description,
      source: hasEntitlement(entitlements, "trial") ? "trial" : "free",
    };
  }

  getUpgradeReason(featureId: FeatureIdentifier, context?: FeatureGateContext): string | null {
    const access = this.getFeatureAccess(featureId, context);
    return access.allowed ? null : access.upgradeMessage;
  }

  listEnabledFeatures(context?: FeatureGateContext): FeatureId[] {
    return FEATURE_IDS.filter((featureId) => this.canUseFeature(featureId, context));
  }

  listLockedFeatures(context?: FeatureGateContext): FeatureId[] {
    return FEATURE_IDS.filter((featureId) => !this.canUseFeature(featureId, context));
  }

  getCurrentEntitlements(context?: FeatureGateContext): CurrentEntitlement[] {
    return buildCurrentEntitlements(this.entitlement, {
      entitlements: [
        ...(this.baseContext.entitlements ?? []),
        ...(context?.entitlements ?? []),
      ],
    });
  }
}

export function createFeatureGateService(
  entitlement: EntitlementState | null,
  context?: FeatureGateContext,
): FeatureGateService {
  return new FeatureGateService(entitlement, context);
}
