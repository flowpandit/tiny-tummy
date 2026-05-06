import {
  checkOwnedPremiumNative,
  getProductMetadataNative,
  purchasePremiumNative,
  restorePremiumNative,
} from "./native";
import { createLifetimePrivateProductMetadata, LIFETIME_PRIVATE_PRODUCT_ID } from "./products";
import type { BillingAdapter, BillingProductMetadata, BillingPurchaseResult } from "./types";
import { normalizeBillingResultCode } from "./types";

function toGoogleResult(result: Awaited<ReturnType<typeof purchasePremiumNative>>): BillingPurchaseResult {
  return {
    ok: result.ok,
    code: normalizeBillingResultCode(result.code, result.ok),
    restored: result.restored,
    platform: "google",
    productId: result.productId,
    message: result.message ?? undefined,
  };
}

function toGoogleProductMetadata(result: Awaited<ReturnType<typeof getProductMetadataNative>>): BillingProductMetadata {
  const code = normalizeBillingResultCode(result.code, result.ok);
  const hasStoreMetadata = result.ok
    && result.productId === LIFETIME_PRIVATE_PRODUCT_ID
    && Boolean(result.localizedPrice?.trim());

  if (hasStoreMetadata) {
    return createLifetimePrivateProductMetadata({
      source: "store",
      title: result.title,
      description: result.description,
      localizedPrice: result.localizedPrice,
      currencyCode: result.currencyCode,
      rawPriceMicros: result.rawPriceMicros,
      rawPrice: result.rawPrice,
      available: result.available ?? true,
      message: result.message,
    });
  }

  return createLifetimePrivateProductMetadata({
    source: "fallback",
    available: false,
    errorCode: result.productId && result.productId !== LIFETIME_PRIVATE_PRODUCT_ID ? "product_unavailable" : code,
    message: result.message,
  });
}

export const googleBillingAdapter: BillingAdapter = {
  async purchasePremium(productId) {
    return toGoogleResult(await purchasePremiumNative(productId));
  },
  async restorePremium(productId) {
    return toGoogleResult(await restorePremiumNative(productId));
  },
  async checkOwnedPremium(productId) {
    return toGoogleResult(await checkOwnedPremiumNative(productId));
  },
  async getProductMetadata(productId) {
    return toGoogleProductMetadata(await getProductMetadataNative(productId));
  },
};
