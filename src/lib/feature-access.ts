import type { EntitlementState } from "./entitlements";
import type { Child } from "./types";

export const FREE_HISTORY_WINDOW_DAYS = 7;

export const PREMIUM_FEATURE_IDS = [
  "doctorReports",
  "fullHistory",
  "advancedInsights",
  "photoCapture",
  "multiChild",
  "smartReminders",
] as const;

export type PremiumFeatureId = (typeof PREMIUM_FEATURE_IDS)[number];
export type AccessKind = "trial" | "premium" | "free";

export function isPremiumFeatureId(value: unknown): value is PremiumFeatureId {
  return typeof value === "string" && PREMIUM_FEATURE_IDS.includes(value as PremiumFeatureId);
}

export function getAccessKind(entitlement: EntitlementState | null): AccessKind {
  if (entitlement?.kind === "premium_unlocked") return "premium";
  if (entitlement?.kind === "trial_expired") return "free";
  return "trial";
}

export function hasFullAccess(entitlement: EntitlementState | null): boolean {
  return getAccessKind(entitlement) !== "free";
}

export function canUsePremiumFeature(
  entitlement: EntitlementState | null,
  _featureId: PremiumFeatureId,
): boolean {
  return hasFullAccess(entitlement);
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
  if (hasFullAccess(entitlement)) return true;
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
