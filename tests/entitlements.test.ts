import test from "node:test";
import assert from "node:assert/strict";
import { setDbConnectionForTests } from "../src/lib/db/connection.ts";
import {
  PREMIUM_PLATFORM_KEY,
  PREMIUM_PRODUCT_ID_KEY,
  PREMIUM_UNLOCKED_KEY,
  TRIAL_LAST_SEEN_AT_KEY,
  TRIAL_STARTED_AT_KEY,
  getEntitlementState,
  markPremiumUnlocked,
} from "../src/lib/entitlements.ts";
import {
  FAMILY_SYNC_MONTHLY_PRODUCT_ID,
  LEGACY_PREMIUM_UNLOCK_PRODUCT_ID,
  LIFETIME_PRIVATE_PRODUCT_ID,
} from "../src/lib/billing/products.ts";

class SettingsDb {
  readonly settings = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.settings.set(key, value);
    }
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    if (query.includes("SELECT value FROM app_settings WHERE key = ?")) {
      const key = String(bindValues[0] ?? "");
      const value = this.settings.get(key);
      return (value === undefined ? [] : [{ value }]) as T;
    }

    throw new Error(`Unsupported test select: ${query}`);
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    if (query.includes("INSERT OR REPLACE INTO app_settings")) {
      this.settings.set(String(bindValues[0] ?? ""), String(bindValues[1] ?? ""));
      return {};
    }

    if (query.includes("DELETE FROM app_settings WHERE key = ?")) {
      this.settings.delete(String(bindValues[0] ?? ""));
      return {};
    }

    throw new Error(`Unsupported test execute: ${query}`);
  }
}

async function withSettingsDb<T>(seed: Record<string, string>, action: (db: SettingsDb) => Promise<T>): Promise<T> {
  const db = new SettingsDb(seed);
  setDbConnectionForTests(db as never);

  try {
    return await action(db);
  } finally {
    setDbConnectionForTests(null);
  }
}

const EXPIRED_TRIAL_START = "2026-04-01T00:00:00.000Z";
const NOW = new Date("2026-05-06T00:00:00.000Z");

test("stored canonical Lifetime Private unlock returns premium entitlement", async () => {
  await withSettingsDb({
    [PREMIUM_UNLOCKED_KEY]: "1",
    [PREMIUM_PLATFORM_KEY]: "apple",
    [PREMIUM_PRODUCT_ID_KEY]: LIFETIME_PRIVATE_PRODUCT_ID,
    [TRIAL_STARTED_AT_KEY]: EXPIRED_TRIAL_START,
  }, async () => {
    const entitlement = await getEntitlementState(NOW);

    assert.equal(entitlement.kind, "premium_unlocked");
    assert.equal(entitlement.platform, "apple");
    assert.equal(entitlement.productId, LIFETIME_PRIVATE_PRODUCT_ID);
  });
});

test("legacy premium_unlock storage remains compatible", async () => {
  await withSettingsDb({
    [PREMIUM_UNLOCKED_KEY]: "1",
    [PREMIUM_PLATFORM_KEY]: "debug",
    [PREMIUM_PRODUCT_ID_KEY]: LEGACY_PREMIUM_UNLOCK_PRODUCT_ID,
    [TRIAL_STARTED_AT_KEY]: EXPIRED_TRIAL_START,
  }, async () => {
    const entitlement = await getEntitlementState(NOW);

    assert.equal(entitlement.kind, "premium_unlocked");
    assert.equal(entitlement.productId, LEGACY_PREMIUM_UNLOCK_PRODUCT_ID);
  });
});

test("unknown stored product ID does not unlock", async () => {
  await withSettingsDb({
    [PREMIUM_UNLOCKED_KEY]: "1",
    [PREMIUM_PLATFORM_KEY]: "apple",
    [PREMIUM_PRODUCT_ID_KEY]: "wrong_product",
    [TRIAL_STARTED_AT_KEY]: EXPIRED_TRIAL_START,
  }, async () => {
    const entitlement = await getEntitlementState(NOW);

    assert.equal(entitlement.kind, "trial_expired");
  });
});

test("future Family Sync product ID does not unlock Lifetime Private", async () => {
  await withSettingsDb({
    [PREMIUM_UNLOCKED_KEY]: "1",
    [PREMIUM_PLATFORM_KEY]: "google",
    [PREMIUM_PRODUCT_ID_KEY]: FAMILY_SYNC_MONTHLY_PRODUCT_ID,
    [TRIAL_STARTED_AT_KEY]: EXPIRED_TRIAL_START,
  }, async () => {
    const entitlement = await getEntitlementState(NOW);

    assert.equal(entitlement.kind, "trial_expired");
  });
});

test("markPremiumUnlocked writes Lifetime Private store metadata and rejects wrong products", async () => {
  await withSettingsDb({}, async (db) => {
    await markPremiumUnlocked({
      platform: "google",
      productId: LIFETIME_PRIVATE_PRODUCT_ID,
    });

    assert.equal(db.settings.get(PREMIUM_UNLOCKED_KEY), "1");
    assert.equal(db.settings.get(PREMIUM_PLATFORM_KEY), "google");
    assert.equal(db.settings.get(PREMIUM_PRODUCT_ID_KEY), LIFETIME_PRIVATE_PRODUCT_ID);

    await assert.rejects(
      markPremiumUnlocked({ platform: "google", productId: "wrong_product" }),
      /Unsupported premium product ID/,
    );
  });
});

test("trial bookkeeping remains separate from Lifetime Private mapping", async () => {
  await withSettingsDb({
    [TRIAL_STARTED_AT_KEY]: EXPIRED_TRIAL_START,
  }, async (db) => {
    const entitlement = await getEntitlementState(NOW);

    assert.equal(entitlement.kind, "trial_expired");
    assert.equal(db.settings.has(PREMIUM_UNLOCKED_KEY), false);
    assert.equal(db.settings.has(PREMIUM_PRODUCT_ID_KEY), false);
    assert.equal(db.settings.has(TRIAL_LAST_SEEN_AT_KEY), true);
  });
});
