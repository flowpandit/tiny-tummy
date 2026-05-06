import test from "node:test";
import assert from "node:assert/strict";
import { createBillingService, type BillingServiceDependencies } from "../src/lib/billing-service.ts";
import {
  FAMILY_SYNC_MONTHLY_PRODUCT_ID,
  LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE,
  LIFETIME_PRIVATE_PRODUCT_ID,
  createLifetimePrivateProductMetadata,
} from "../src/lib/billing/products.ts";
import type {
  BillingAdapter,
  BillingPlatform,
  BillingProductMetadata,
  BillingPurchaseResult,
  BillingResultCode,
} from "../src/lib/billing/types.ts";
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

function productMetadata(input?: Parameters<typeof createLifetimePrivateProductMetadata>[0]): BillingProductMetadata {
  return createLifetimePrivateProductMetadata(input);
}

function createAdapter(resultByMethod: {
  purchasePremium?: BillingPurchaseResult;
  restorePremium?: BillingPurchaseResult;
  checkOwnedPremium?: BillingPurchaseResult;
  getProductMetadata?: BillingProductMetadata;
}): BillingAdapter {
  const fallback = billingResult({ code: "failed", ok: false, message: "Unexpected adapter call." });
  const fallbackMetadata = productMetadata({
    source: "fallback",
    available: false,
    errorCode: "failed",
    message: "Unexpected metadata call.",
  });

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
    async getProductMetadata() {
      return resultByMethod.getProductMetadata ?? fallbackMetadata;
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
    async getProductMetadata() {
      throw new Error("metadata should not be called");
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

test("product metadata success queries only canonical Lifetime Private and does not unlock", async () => {
  let requestedProductId: string | null = null;
  const adapter: BillingAdapter = {
    async purchasePremium() {
      throw new Error("purchase should not be called");
    },
    async restorePremium() {
      throw new Error("restore should not be called");
    },
    async checkOwnedPremium() {
      throw new Error("sync should not be called");
    },
    async getProductMetadata(productId) {
      requestedProductId = productId;
      return productMetadata({
        source: "store",
        localizedPrice: "A$22.99",
        currencyCode: "AUD",
        rawPriceMicros: "22990000",
        rawPrice: 22.99,
        available: true,
      });
    },
  };
  const { service, writes } = createTestService({ adapter });

  const metadata = await service.getLifetimePrivateProduct();

  assert.equal(requestedProductId, LIFETIME_PRIVATE_PRODUCT_ID);
  assert.equal(metadata.source, "store");
  assert.equal(metadata.localizedPrice, "A$22.99");
  assert.equal(metadata.currencyCode, "AUD");
  assert.equal(metadata.rawPriceMicros, "22990000");
  assert.deepEqual(writes, []);
});

test("unavailable product metadata falls back without granting entitlement", async () => {
  const { service, writes } = createTestService({
    adapter: createAdapter({
      getProductMetadata: productMetadata({
        source: "fallback",
        available: false,
        errorCode: "product_unavailable",
        message: "Store product missing.",
      }),
    }),
  });

  const metadata = await service.getLifetimePrivateProduct();

  assert.equal(metadata.localizedPrice, LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE);
  assert.equal(metadata.available, false);
  assert.equal(metadata.source, "fallback");
  assert.equal(metadata.errorCode, "product_unavailable");
  assert.deepEqual(writes, []);
});

test("desktop development product metadata uses fallback without a store query", async () => {
  let metadataCalls = 0;
  const adapter: BillingAdapter = {
    async purchasePremium() {
      throw new Error("purchase should not be called");
    },
    async restorePremium() {
      throw new Error("restore should not be called");
    },
    async checkOwnedPremium() {
      throw new Error("sync should not be called");
    },
    async getProductMetadata() {
      metadataCalls += 1;
      throw new Error("metadata should not be called");
    },
  };
  const { service, writes } = createTestService({ adapter, desktopDev: true });

  const metadata = await service.getLifetimePrivateProduct();

  assert.equal(metadata.localizedPrice, LIFETIME_PRIVATE_FALLBACK_LOCALIZED_PRICE);
  assert.equal(metadata.source, "desktop_dev");
  assert.equal(metadata.available, true);
  assert.equal(metadataCalls, 0);
  assert.deepEqual(writes, []);
});

test("wrong product metadata requests are rejected and Family Sync is not queried", async () => {
  let metadataCalls = 0;
  const adapter: BillingAdapter = {
    async purchasePremium() {
      throw new Error("purchase should not be called");
    },
    async restorePremium() {
      throw new Error("restore should not be called");
    },
    async checkOwnedPremium() {
      throw new Error("sync should not be called");
    },
    async getProductMetadata() {
      metadataCalls += 1;
      throw new Error("Family Sync product metadata should not be queried");
    },
  };
  const { service, writes } = createTestService({ adapter });

  const metadata = await service.getProductMetadata(FAMILY_SYNC_MONTHLY_PRODUCT_ID);

  assert.equal(metadata.productId, FAMILY_SYNC_MONTHLY_PRODUCT_ID);
  assert.equal(metadata.available, false);
  assert.equal(metadata.errorCode, "product_unavailable");
  assert.equal(metadataCalls, 0);
  assert.deepEqual(writes, []);
});
