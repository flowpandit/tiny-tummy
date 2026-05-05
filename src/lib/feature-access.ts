import type { EntitlementState } from "./entitlements";
import type { Child } from "./types";
import {
  LEGACY_PREMIUM_FEATURE_IDS,
  createFeatureGateService,
  isFeatureIdentifier,
  type FeatureAccess,
  type FeatureGateContext,
  type FeatureIdentifier,
  type LegacyPremiumFeatureId,
} from "./feature-gate-service";

export const FREE_HISTORY_WINDOW_DAYS = 7;

export {
  FEATURE_IDS,
  createFeatureGateService,
  getFeatureDefinition,
  getReportFeatureIdForKind,
  getReportFeatureIdForMode,
  isEntitlementId,
  isFeatureId,
  normalizeFeatureId,
  parseFeatureId,
  type CurrentEntitlement,
  type EntitlementId,
  type FeatureAccess,
  type FeatureAccessReason,
  type FeatureAccessSource,
  type FeatureGateContext,
  type FeatureId,
  type FeatureIdentifier,
} from "./feature-gate-service";

export const PREMIUM_FEATURE_IDS = LEGACY_PREMIUM_FEATURE_IDS;

export type PremiumFeatureId = LegacyPremiumFeatureId;
export type AccessKind = "trial" | "premium" | "free";

export function isPremiumFeatureId(value: unknown): value is FeatureIdentifier {
  return isFeatureIdentifier(value);
}

export function getAccessKind(entitlement: EntitlementState | null): AccessKind {
  if (entitlement?.kind === "premium_unlocked") return "premium";
  if (entitlement?.kind === "trial_expired") return "free";
  return "trial";
}

export function hasFullAccess(entitlement: EntitlementState | null): boolean {
  return getAccessKind(entitlement) !== "free";
}

export function getFeatureAccess(
  entitlement: EntitlementState | null,
  featureId: FeatureIdentifier,
  context?: FeatureGateContext,
): FeatureAccess {
  return createFeatureGateService(entitlement).getFeatureAccess(featureId, context);
}

export function canUseFeature(
  entitlement: EntitlementState | null,
  featureId: FeatureIdentifier,
  context?: FeatureGateContext,
): boolean {
  return createFeatureGateService(entitlement).canUseFeature(featureId, context);
}

export function canUsePremiumFeature(
  entitlement: EntitlementState | null,
  featureId: FeatureIdentifier,
  context?: FeatureGateContext,
): boolean {
  return canUseFeature(entitlement, featureId, context);
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getFreeHistoryStartDate(todayDateKey: string): string {
  const start = parseDateKey(todayDateKey);
  start.setDate(start.getDate() - (FREE_HISTORY_WINDOW_DAYS - 1));
  return formatDateKey(start);
}

export function getFirstFreeChild(children: readonly Child[]): Child | null {
  if (children.length === 0) return null;

  return [...children].sort((left, right) => {
    const createdComparison = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (createdComparison !== 0) return createdComparison;
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

export function isChildIncludedInFreePlan(childId: string, children: readonly Child[]): boolean {
  return getFirstFreeChild(children)?.id === childId;
}

export function canAccessChild(
  childId: string,
  children: readonly Child[],
  entitlement: EntitlementState | null,
): boolean {
  if (canUseFeature(entitlement, "multi_child")) return true;
  return isChildIncludedInFreePlan(childId, children);
}

export function getAllowedActiveChildId(
  activeChildId: string | null,
  children: readonly Child[],
  entitlement: EntitlementState | null,
): string | null {
  if (children.length === 0) return null;
  if (activeChildId && canAccessChild(activeChildId, children, entitlement)) return activeChildId;
  return getFirstFreeChild(children)?.id ?? children[0]?.id ?? null;
}
