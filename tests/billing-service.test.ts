import test from "node:test";
import assert from "node:assert/strict";
import { createBillingService, type BillingServiceDependencies } from "../src/lib/billing-service.ts";
import { LIFETIME_PRIVATE_PRODUCT_ID } from "../src/lib/billing/products.ts";
import type { BillingAdapter, BillingPlatform, BillingPurchaseResult, BillingResultCode } from "../src/lib/billing/types.ts";
import type { EntitlementState, PremiumPlatform } from "../src/lib/entitlements.ts";

const freeAccess: EntitlementState = {
  kind: "free",
  daysRemaining: 0,
  trialStartedAt: "2026-04-01T00:00:00.000Z",
};

function billingResult(input: {
  code?: BillingResultCode;
  ok?: boolean;
  platform?: BillingPlatform;
  productId?: string | null;
  restored?: boolean;
  message?: string;
}): BillingPurchaseResult {
  const ok = input.ok ?? input.code === "success";
  return {
    ok,
    code: input.code ?? (ok ? "success" : "failed"),
    restored: input.restored ?? false,
    platform: input.platform ?? "apple",
    productId: input.productId ?? null,
    message: input.message,
  };
}

function createAdapter(resultByMethod: Partial<Record<keyof BillingAdapter, BillingPurchaseResult>>): BillingAdapter {
  const fallback = billingResult({ code: "failed", ok: false, message: "Unexpected adapter call." });

  return {
    async purchasePremium() {
      return resultByMethod.purchasePremium ?? fallback;
    },
    async restorePremium() {
      return resultByMethod.restorePremium ?? fallback;
    },
    async checkOwnedPremium() {
      return resultByMethod.checkOwnedPremium ?? fallback;
    },
  };
}

function createTestService(input: {
  adapter: BillingAdapter | null;
  desktopDev?: boolean;
  entitlement?: EntitlementState;
}) {
  const writes: Array<{ platform: PremiumPlatform; productId?: string | null }> = [];
  const dependencies: BillingServiceDependencies = {
    getBillingAdapter: () => input.adapter,
    getEntitlementState: async () => input.entitlement ?? freeAccess,
    isDesktopDevBillingSimulation: () => input.desktopDev ?? false,
    markPremiumUnlocked: async (write) => {
      writes.push(write);
    },
  };

  return {
    service: createBillingService(dependencies),
    writes,
  };
}

test("purchase success queries canonical Lifetime Private and writes store entitlement", async () => {
  let requestedProductId: string | null = null;
  const adapter: BillingAdapter = {
    async purchasePremium(productId) {
      requestedProductId = productId;
      return billingResult({
        code: "success",
        productId,
        platform: "apple",
      });
    },
    async restorePremium() {
      throw new Error("restore should not be called");
    },
    async checkOwnedPremium() {
      throw new Error("sync should not be called");
    },
  };
  const { service, writes } = createTestService({ adapter });

  const result = await service.purchasePremium();

  assert.equal(requestedProductId, LIFETIME_PRIVATE_PRODUCT_ID);
  assert.equal(result.ok, true);
  assert.deepEqual(writes, [{ platform: "apple", productId: LIFETIME_PRIVATE_PRODUCT_ID }]);
});

test("cancelled purchase does not unlock and is not treated as success", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      purchasePremium: billingResult({
        code: "cancelled",
        ok: false,
        platform: "google",
        message: "Purchase cancelled.",
      }),
    }),
  });

  const result = await service.purchasePremium();

  assert.equal(result.ok, false);
  assert.equal(result.code, "cancelled");
  assert.deepEqual(writes, []);
});

test("pending purchase does not unlock", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      purchasePremium: billingResult({
        code: "pending",
        ok: false,
        platform: "google",
        productId: LIFETIME_PRIVATE_PRODUCT_ID,
      }),
    }),
  });

  const result = await service.purchasePremium();

  assert.equal(result.code, "pending");
  assert.deepEqual(writes, []);
});

test("wrong product returned by store success does not unlock", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      purchasePremium: billingResult({
        code: "success",
        ok: true,
        productId: "wrong_product",
        platform: "apple",
      }),
    }),
  });

  const result = await service.purchasePremium();

  assert.equal(result.ok, false);
  assert.equal(result.code, "failed");
  assert.deepEqual(writes, []);
});

test("restore success validates exact canonical product before writing entitlement", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      restorePremium: billingResult({
        code: "success",
        ok: true,
        restored: true,
        productId: LIFETIME_PRIVATE_PRODUCT_ID,
        platform: "google",
      }),
    }),
  });

  const result = await service.restorePurchases();

  assert.equal(result.ok, true);
  assert.deepEqual(writes, [{ platform: "google", productId: LIFETIME_PRIVATE_PRODUCT_ID }]);
});

test("restore no purchase found does not unlock", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      restorePremium: billingResult({
        code: "no_purchase_found",
        ok: false,
        restored: false,
        platform: "apple",
      }),
    }),
  });

  const result = await service.restorePurchases();

  assert.equal(result.code, "no_purchase_found");
  assert.deepEqual(writes, []);
});

test("offline restore does not overwrite existing local unlock", async () => {
  const existingPremium: EntitlementState = {
    kind: "premium_unlocked",
    daysRemaining: 14,
    platform: "apple",
    productId: LIFETIME_PRIVATE_PRODUCT_ID,
    trialStartedAt: "2026-04-01T00:00:00.000Z",
  };
  const { service, writes } = createTestService({
    entitlement: existingPremium,
    adapter: createAdapter({
      restorePremium: billingResult({
        code: "offline",
        ok: false,
        restored: false,
        platform: "apple",
      }),
    }),
  });

  const result = await service.restorePurchases();

  assert.equal(result.code, "offline");
  assert.deepEqual(writes, []);
});

test("startup ownership sync writes only verified canonical Lifetime Private ownership", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      checkOwnedPremium: billingResult({
        code: "success",
        ok: true,
        restored: true,
        productId: LIFETIME_PRIVATE_PRODUCT_ID,
        platform: "apple",
      }),
    }),
  });

  await service.syncOwnedPurchase();

  assert.deepEqual(writes, [{ platform: "apple", productId: LIFETIME_PRIVATE_PRODUCT_ID }]);
});

test("startup ownership sync ignores pending or wrong products", async () => {
  const pending = createTestService({
    adapter: createAdapter({
      checkOwnedPremium: billingResult({
        code: "pending",
        ok: false,
        productId: LIFETIME_PRIVATE_PRODUCT_ID,
        platform: "google",
      }),
    }),
  });
  await pending.service.syncOwnedPurchase();
  assert.deepEqual(pending.writes, []);

  const wrongProduct = createTestService({
    adapter: createAdapter({
      checkOwnedPremium: billingResult({
        code: "success",
        ok: true,
        productId: "premium_unlock",
        platform: "google",
      }),
    }),
  });
  await wrongProduct.service.syncOwnedPurchase();
  assert.deepEqual(wrongProduct.writes, []);
});
