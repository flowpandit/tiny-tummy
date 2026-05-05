import { deleteSetting, getSetting, setSetting } from "./db";
import { isEntitlementId, type EntitlementId } from "./feature-access";

export const DEVELOPER_FEATURE_ENTITLEMENTS_KEY = "developer_feature_entitlements";

export const DEVELOPER_FEATURE_ENTITLEMENT_PRESETS = {
  reportPack: ["report_pack"],
  syncAddon: ["sync_addon"],
  familyLifetime: ["family_lifetime"],
  reportAndSync: ["report_pack", "sync_addon"],
  allFeatureAccess: ["report_pack", "family_lifetime", "sync_addon"],
} as const satisfies Record<string, readonly EntitlementId[]>;

export function parseDeveloperFeatureEntitlements(value: string | null): EntitlementId[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const entitlements: EntitlementId[] = [];
  for (const item of parsed) {
    if (!isEntitlementId(item)) continue;
    if (item === "free" || item === "trial" || item === "store_entitlement") continue;
    if (!entitlements.includes(item)) entitlements.push(item);
  }

  return entitlements;
}

export function formatDeveloperFeatureEntitlements(entitlements: readonly EntitlementId[]): string {
  const parsed = parseDeveloperFeatureEntitlements(JSON.stringify(entitlements));
  return JSON.stringify(parsed);
}

export async function getDeveloperFeatureEntitlements(): Promise<EntitlementId[]> {
  return parseDeveloperFeatureEntitlements(await getSetting(DEVELOPER_FEATURE_ENTITLEMENTS_KEY));
}

export async function setDeveloperFeatureEntitlements(entitlements: readonly EntitlementId[]): Promise<void> {
  const formatted = formatDeveloperFeatureEntitlements(entitlements);
  if (formatted === "[]") {
    await deleteSetting(DEVELOPER_FEATURE_ENTITLEMENTS_KEY);
    return;
  }

  await setSetting(DEVELOPER_FEATURE_ENTITLEMENTS_KEY, formatted);
}

export async function clearDeveloperFeatureEntitlements(): Promise<void> {
  await deleteSetting(DEVELOPER_FEATURE_ENTITLEMENTS_KEY);
}
