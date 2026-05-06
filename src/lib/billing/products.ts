import type { EntitlementId } from "../feature-gate-service";

export const LIFETIME_PRIVATE_PRODUCT_ID = "com.tinytummy.lifetime_private";
export const LEGACY_PREMIUM_UNLOCK_PRODUCT_ID = "premium_unlock";

/**
 * Future-only Family Sync product IDs. Keep these documented for store setup,
 * but do not query them or grant entitlements from them until Family Sync ships.
 */
export const FAMILY_SYNC_MONTHLY_PRODUCT_ID = "com.tinytummy.family_sync.monthly";
export const FAMILY_SYNC_YEARLY_PRODUCT_ID = "com.tinytummy.family_sync.yearly";

export type StoreProductEntitlementId = Extract<EntitlementId, "lifetime_private">;

const PRODUCT_ENTITLEMENT_BY_ID: Readonly<Record<string, StoreProductEntitlementId>> = {
  [LIFETIME_PRIVATE_PRODUCT_ID]: "lifetime_private",
  [LEGACY_PREMIUM_UNLOCK_PRODUCT_ID]: "lifetime_private",
};

const FAMILY_SYNC_PRODUCT_IDS = new Set<string>([
  FAMILY_SYNC_MONTHLY_PRODUCT_ID,
  FAMILY_SYNC_YEARLY_PRODUCT_ID,
]);

export function getEntitlementForStoreProduct(productId: string | null | undefined): StoreProductEntitlementId | null {
  if (!productId) return null;
  return PRODUCT_ENTITLEMENT_BY_ID[productId] ?? null;
}

export function isCanonicalLifetimePrivateProductId(productId: string | null | undefined): boolean {
  return productId === LIFETIME_PRIVATE_PRODUCT_ID;
}

export function isLegacyLifetimePrivateProductId(productId: string | null | undefined): boolean {
  return productId === LEGACY_PREMIUM_UNLOCK_PRODUCT_ID;
}

export function isLifetimePrivateStoreProductId(productId: string | null | undefined): boolean {
  return getEntitlementForStoreProduct(productId) === "lifetime_private";
}

export function isFamilySyncStoreProductId(productId: string | null | undefined): boolean {
  return typeof productId === "string" && FAMILY_SYNC_PRODUCT_IDS.has(productId);
}
