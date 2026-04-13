import {
  checkOwnedPremiumNative,
  purchasePremiumNative,
  restorePremiumNative,
} from "./native";
import type { BillingAdapter, BillingPurchaseResult } from "./types";

function toGoogleResult(result: Awaited<ReturnType<typeof purchasePremiumNative>>): BillingPurchaseResult {
  return {
    ok: result.ok,
    restored: result.restored,
    platform: "google",
    productId: result.productId,
    message: result.message ?? undefined,
  };
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
};
