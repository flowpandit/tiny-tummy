import { getEntitlementState, markPremiumUnlocked } from "./entitlements";
import {
  LIFETIME_PRIVATE_PRODUCT_ID,
  createLifetimePrivateProductMetadata,
  createRejectedProductMetadata,
  getBillingAdapter,
  isCanonicalLifetimePrivateProductId,
  isDesktopDevBillingSimulation,
} from "./billing";
import type { BillingAdapter, BillingPlatform, BillingProductMetadata, BillingPurchaseResult } from "./billing/types";
import type { EntitlementState, PremiumPlatform } from "./entitlements";

export interface BillingServiceDependencies {
  getBillingAdapter: () => BillingAdapter | null;
  getEntitlementState: () => Promise<EntitlementState>;
  isDesktopDevBillingSimulation: () => boolean;
  markPremiumUnlocked: (input: { platform: PremiumPlatform; productId?: string | null }) => Promise<void>;
}

function result(input: {
  ok: boolean;
  code: BillingPurchaseResult["code"];
  restored: boolean;
  platform: BillingPlatform;
  productId: string | null;
  message: string;
}): BillingPurchaseResult {
  return input;
}

function billingPlatformToPremiumPlatform(platform: BillingPlatform): PremiumPlatform {
  return platform === "apple" || platform === "google" || platform === "debug" ? platform : "unknown";
}

function isVerifiedLifetimePrivateResult(result: BillingPurchaseResult): boolean {
  return result.ok
    && result.code === "success"
    && isCanonicalLifetimePrivateProductId(result.productId);
}

function unverifiedProductResult(restored: boolean, platform: BillingPlatform, productId: string | null): BillingPurchaseResult {
  return result({
    ok: false,
    code: "failed",
    restored,
    platform,
    productId,
    message: "Tiny Tummy could not verify that purchase. Please try again.",
  });
}

function alreadyUnlockedResult(): BillingPurchaseResult {
  return result({
    ok: true,
    code: "success",
    restored: true,
    platform: "debug",
    productId: LIFETIME_PRIVATE_PRODUCT_ID,
    message: "Simulated desktop restore succeeded.",
  });
}

function noDesktopPurchaseResult(): BillingPurchaseResult {
  return result({
    ok: false,
    code: "no_purchase_found",
    restored: false,
    platform: "debug",
    productId: null,
    message: "No simulated Lifetime Private purchase is available to restore.",
  });
}

export function createBillingService(dependencies: BillingServiceDependencies) {
  const getDesktopDevRestoreState = async (): Promise<BillingPurchaseResult> => {
    const entitlement = await dependencies.getEntitlementState();
    if (entitlement.kind === "premium_unlocked") {
      return alreadyUnlockedResult();
    }

    return noDesktopPurchaseResult();
  };

  const grantLifetimePrivateFromResult = async (billingResult: BillingPurchaseResult): Promise<BillingPurchaseResult> => {
    if (!isVerifiedLifetimePrivateResult(billingResult)) {
      return unverifiedProductResult(billingResult.restored, billingResult.platform, billingResult.productId);
    }

    await dependencies.markPremiumUnlocked({
      platform: billingPlatformToPremiumPlatform(billingResult.platform),
      productId: billingResult.productId,
    });
    return billingResult;
  };

  const purchasePremium = async (): Promise<BillingPurchaseResult> => {
    if (dependencies.isDesktopDevBillingSimulation()) {
      await dependencies.markPremiumUnlocked({ platform: "debug", productId: LIFETIME_PRIVATE_PRODUCT_ID });
      return result({
        ok: true,
        code: "success",
        restored: false,
        platform: "debug",
        productId: LIFETIME_PRIVATE_PRODUCT_ID,
        message: "Simulated desktop unlock succeeded.",
      });
    }

    const adapter = dependencies.getBillingAdapter();
    if (!adapter) {
      return result({
        ok: false,
        code: "unavailable",
        restored: false,
        platform: "unsupported",
        productId: null,
        message: "Billing is only available on supported mobile store builds.",
      });
    }

    const billingResult = await adapter.purchasePremium(LIFETIME_PRIVATE_PRODUCT_ID);
    if (!billingResult.ok) return billingResult;
    return grantLifetimePrivateFromResult(billingResult);
  };

  const restorePurchases = async (): Promise<BillingPurchaseResult> => {
    if (dependencies.isDesktopDevBillingSimulation()) {
      return getDesktopDevRestoreState();
    }

    const adapter = dependencies.getBillingAdapter();
    if (!adapter) {
      return result({
        ok: false,
        code: "unavailable",
        restored: false,
        platform: "unsupported",
        productId: null,
        message: "Restore is only available on supported mobile store builds.",
      });
    }

    const billingResult = await adapter.restorePremium(LIFETIME_PRIVATE_PRODUCT_ID);
    if (!billingResult.ok) return billingResult;
    return grantLifetimePrivateFromResult(billingResult);
  };

  const syncOwnedPurchase = async (): Promise<void> => {
    if (dependencies.isDesktopDevBillingSimulation()) {
      return;
    }

    const adapter = dependencies.getBillingAdapter();
    if (!adapter) return;

    const billingResult = await adapter.checkOwnedPremium(LIFETIME_PRIVATE_PRODUCT_ID);
    if (!isVerifiedLifetimePrivateResult(billingResult)) return;

    await dependencies.markPremiumUnlocked({
      platform: billingPlatformToPremiumPlatform(billingResult.platform),
      productId: billingResult.productId,
    });
  };

  const getProductMetadata = async (productId: string): Promise<BillingProductMetadata> => {
    if (!isCanonicalLifetimePrivateProductId(productId)) {
      return createRejectedProductMetadata(productId, "Tiny Tummy only supports Lifetime Private store metadata.");
    }

    if (dependencies.isDesktopDevBillingSimulation()) {
      return createLifetimePrivateProductMetadata({
        source: "desktop_dev",
        available: true,
        message: "Desktop development uses fallback Lifetime Private metadata.",
      });
    }

    const adapter = dependencies.getBillingAdapter();
    if (!adapter) {
      return createLifetimePrivateProductMetadata({
        source: "fallback",
        available: false,
        errorCode: "unavailable",
        message: "Store product metadata is only available on supported mobile store builds.",
      });
    }

    try {
      return await adapter.getProductMetadata(productId);
    } catch (error) {
      return createLifetimePrivateProductMetadata({
        source: "fallback",
        available: false,
        errorCode: "failed",
        message: error instanceof Error ? error.message : "Store product metadata could not be loaded.",
      });
    }
  };

  const getLifetimePrivateProduct = async (): Promise<BillingProductMetadata> =>
    getProductMetadata(LIFETIME_PRIVATE_PRODUCT_ID);

  return {
    getLifetimePrivateProduct,
    getProductMetadata,
    purchasePremium,
    restorePurchases,
    syncOwnedPurchase,
  };
}

const billingService = createBillingService({
  getBillingAdapter,
  getEntitlementState,
  isDesktopDevBillingSimulation,
  markPremiumUnlocked,
});

export async function purchasePremium(): Promise<BillingPurchaseResult> {
  return billingService.purchasePremium();
}

export async function getLifetimePrivateProduct(): Promise<BillingProductMetadata> {
  return billingService.getLifetimePrivateProduct();
}

export async function getProductMetadata(productId: string): Promise<BillingProductMetadata> {
  return billingService.getProductMetadata(productId);
}

export async function restorePurchases(): Promise<BillingPurchaseResult> {
  return billingService.restorePurchases();
}

export async function syncOwnedPurchase(): Promise<void> {
  return billingService.syncOwnedPurchase();
}
