import type { EntitlementId } from "../feature-gate-service";
import type { BillingProductMetadata, BillingProductMetadataSource, BillingResultCode } from "./types";

export const LIFETIME_PRIVATE_PRODUCT_ID = "com.tinytummy.lifetime_private";
export const LEGACY_PREMIUM_UNLOCK_PRODUCT_ID = "premium_unlock";
export const LIFETIME_PRIVATE_PRODUCT_TITLE = "Lifetime Private";
export const LIFETIME_PRIVATE_PRODUCT_DESCRIPTION = "Full local app, one-time purchase";
export const LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE = "$14.99 USD";
export const LIFETIME_PRIVATE_LOADING_PRICE_LABEL = "One-time purchase";

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

export function createLifetimePrivateProductMetadata(input?: {
  source?: BillingProductMetadataSource;
  localizedPrice?: string | null;
  title?: string | null;
  description?: string | null;
  currencyCode?: string | null;
  rawPriceMicros?: string | number | null;
  rawPrice?: number | null;
  available?: boolean;
  errorCode?: BillingResultCode;
  message?: string | null;
}): BillingProductMetadata {
  const source = input?.source ?? "fallback";
  const rawPriceMicros = input?.rawPriceMicros;
  const rawPrice = input?.rawPrice;

  return {
    productId: LIFETIME_PRIVATE_PRODUCT_ID,
    title: input?.title?.trim() || LIFETIME_PRIVATE_PRODUCT_TITLE,
    description: input?.description?.trim() || LIFETIME_PRIVATE_PRODUCT_DESCRIPTION,
    localizedPrice: input?.localizedPrice?.trim() || LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE,
    ...(input?.currencyCode ? { currencyCode: input.currencyCode } : {}),
    ...(rawPriceMicros !== undefined && rawPriceMicros !== null ? { rawPriceMicros: String(rawPriceMicros) } : {}),
    ...(typeof rawPrice === "number" ? { rawPrice } : {}),
    available: input?.available ?? (source === "desktop_dev"),
    source,
    ...(input?.errorCode ? { errorCode: input.errorCode } : {}),
    ...(input?.message ? { message: input.message } : {}),
  };
}

export function createRejectedProductMetadata(productId: string, message: string): BillingProductMetadata {
  return {
    productId,
    title: "Unsupported product",
    description: message,
    localizedPrice: "",
    available: false,
    source: "fallback",
    errorCode: "product_unavailable",
    message,
  };
}

export function formatLifetimePrivatePrice(metadata: BillingProductMetadata | null | undefined): string {
  const price = metadata?.localizedPrice.trim() || LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE;
  return /\bonce\b/i.test(price) ? price : `${price} once`;
}
