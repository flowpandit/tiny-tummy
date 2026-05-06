import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_SYNC_MONTHLY_PRODUCT_ID,
  FAMILY_SYNC_YEARLY_PRODUCT_ID,
  LEGACY_PREMIUM_UNLOCK_PRODUCT_ID,
  LIFETIME_PRIVATE_PRODUCT_ID,
  getEntitlementForStoreProduct,
  isCanonicalLifetimePrivateProductId,
  isFamilySyncStoreProductId,
  isLegacyLifetimePrivateProductId,
  isLifetimePrivateStoreProductId,
} from "../src/lib/billing/products.ts";

test("canonical Lifetime Private product maps to lifetime_private", () => {
  assert.equal(LIFETIME_PRIVATE_PRODUCT_ID, "com.tinytummy.lifetime_private");
  assert.equal(getEntitlementForStoreProduct(LIFETIME_PRIVATE_PRODUCT_ID), "lifetime_private");
  assert.equal(isCanonicalLifetimePrivateProductId(LIFETIME_PRIVATE_PRODUCT_ID), true);
  assert.equal(isLifetimePrivateStoreProductId(LIFETIME_PRIVATE_PRODUCT_ID), true);
});

test("legacy premium_unlock remains a compatibility-only lifetime mapping", () => {
  assert.equal(LEGACY_PREMIUM_UNLOCK_PRODUCT_ID, "premium_unlock");
  assert.equal(getEntitlementForStoreProduct(LEGACY_PREMIUM_UNLOCK_PRODUCT_ID), "lifetime_private");
  assert.equal(isLegacyLifetimePrivateProductId(LEGACY_PREMIUM_UNLOCK_PRODUCT_ID), true);
  assert.equal(isCanonicalLifetimePrivateProductId(LEGACY_PREMIUM_UNLOCK_PRODUCT_ID), false);
});

test("unknown and Family Sync product IDs do not grant entitlements", () => {
  assert.equal(getEntitlementForStoreProduct("wrong_product"), null);
  assert.equal(getEntitlementForStoreProduct(null), null);
  assert.equal(getEntitlementForStoreProduct(FAMILY_SYNC_MONTHLY_PRODUCT_ID), null);
  assert.equal(getEntitlementForStoreProduct(FAMILY_SYNC_YEARLY_PRODUCT_ID), null);
  assert.equal(isFamilySyncStoreProductId(FAMILY_SYNC_MONTHLY_PRODUCT_ID), true);
  assert.equal(isFamilySyncStoreProductId(FAMILY_SYNC_YEARLY_PRODUCT_ID), true);
  assert.equal(isLifetimePrivateStoreProductId(FAMILY_SYNC_MONTHLY_PRODUCT_ID), false);
});
