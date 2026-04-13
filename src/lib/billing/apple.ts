import {
  checkOwnedPremiumNative,
  purchasePremiumNative,
  restorePremiumNative,
} from "./native";
import type { BillingAdapter, BillingPurchaseResult } from "./types";

function toAppleResult(result: Awaited<ReturnType<typeof purchasePremiumNative>>): BillingPurchaseResult {
  return {
    ok: result.ok,
    restored: result.restored,
    platform: "apple",
    productId: result.productId,
    message: result.message ?? undefined,
  };
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
};
