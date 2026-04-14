import { getEntitlementState, markPremiumUnlocked } from "./entitlements";
import { getBillingAdapter, isDesktopDevBillingSimulation, PREMIUM_UNLOCK_PRODUCT_ID } from "./billing";
import type { BillingPurchaseResult } from "./billing/types";

async function getDesktopDevRestoreState(): Promise<BillingPurchaseResult> {
  const entitlement = await getEntitlementState();
  if (entitlement.kind === "premium_unlocked") {
    return {
      ok: true,
      restored: true,
      platform: "debug",
      productId: PREMIUM_UNLOCK_PRODUCT_ID,
      message: "Simulated desktop restore succeeded.",
    };
  }

  return {
    ok: false,
    restored: false,
    platform: "debug",
    productId: null,
    message: "No simulated desktop purchase is available to restore.",
  };
}

export async function purchasePremium(): Promise<BillingPurchaseResult> {
  if (isDesktopDevBillingSimulation()) {
    await markPremiumUnlocked({ platform: "debug", productId: PREMIUM_UNLOCK_PRODUCT_ID });
    return {
      ok: true,
      restored: false,
      platform: "debug",
      productId: PREMIUM_UNLOCK_PRODUCT_ID,
      message: "Simulated desktop unlock succeeded.",
    };
  }

  const adapter = getBillingAdapter();
  if (!adapter) {
    return {
      ok: false,
      restored: false,
      platform: "unsupported",
      productId: null,
      message: "Billing is only available on supported mobile store builds.",
    };
  }

  const result = await adapter.purchasePremium(PREMIUM_UNLOCK_PRODUCT_ID);
  if (result.ok) {
    await markPremiumUnlocked({
      platform: result.platform === "apple" || result.platform === "google" ? result.platform : "unknown",
      productId: result.productId ?? PREMIUM_UNLOCK_PRODUCT_ID,
    });
  }
  return result;
}

export async function restorePurchases(): Promise<BillingPurchaseResult> {
  if (isDesktopDevBillingSimulation()) {
    return getDesktopDevRestoreState();
  }

  const adapter = getBillingAdapter();
  if (!adapter) {
    return {
      ok: false,
      restored: false,
      platform: "unsupported",
      productId: null,
      message: "Restore is only available on supported mobile store builds.",
    };
  }

  const result = await adapter.restorePremium(PREMIUM_UNLOCK_PRODUCT_ID);
  if (result.ok) {
    await markPremiumUnlocked({
      platform: result.platform === "apple" || result.platform === "google" ? result.platform : "unknown",
      productId: result.productId ?? PREMIUM_UNLOCK_PRODUCT_ID,
    });
  }
  return result;
}

export async function syncOwnedPurchase(): Promise<void> {
  if (isDesktopDevBillingSimulation()) {
    return;
  }

  const adapter = getBillingAdapter();
  if (!adapter) return;

  const result = await adapter.checkOwnedPremium(PREMIUM_UNLOCK_PRODUCT_ID);
  if (!result.ok) return;

  await markPremiumUnlocked({
    platform: result.platform === "apple" || result.platform === "google" ? result.platform : "unknown",
    productId: result.productId ?? PREMIUM_UNLOCK_PRODUCT_ID,
  });
}
