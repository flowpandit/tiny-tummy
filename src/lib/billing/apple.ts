import {
  checkOwnedPremiumNative,
  getProductMetadataNative,
  purchasePremiumNative,
  restorePremiumNative,
} from "./native";
import { createLifetimePrivateProductMetadata, LIFETIME_PRIVATE_PRODUCT_ID } from "./products";
import type { BillingAdapter, BillingProductMetadata, BillingPurchaseResult } from "./types";
import { normalizeBillingResultCode } from "./types";

function toAppleResult(result: Awaited<ReturnType<typeof purchasePremiumNative>>): BillingPurchaseResult {
  return {
    ok: result.ok,
    code: normalizeBillingResultCode(result.code, result.ok),
    restored: result.restored,
    platform: "apple",
    productId: result.productId,
    message: result.message ?? undefined,
  };
}

function toAppleProductMetadata(result: Awaited<ReturnType<typeof getProductMetadataNative>>): BillingProductMetadata {
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

export const appleBillingAdapter: BillingAdapter = {
  async purchasePremium(productId) {
    return toAppleResult(await purchasePremiumNative(productId));
  },
  async restorePremium(productId) {
    return toAppleResult(await restorePremiumNative(productId));
  },
  async checkOwnedPremium(productId) {
    return toAppleResult(await checkOwnedPremiumNative(productId));
  },
  async getProductMetadata(productId) {
    return toAppleProductMetadata(await getProductMetadataNative(productId));
  },
};
