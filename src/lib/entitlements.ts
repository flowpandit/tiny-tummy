import { deleteSetting, getSetting, setSetting } from "./db";
import { nowISO } from "./utils";

export const TRIAL_LENGTH_DAYS = 14;
export const TRIAL_STARTED_AT_KEY = "trial_started_at";
export const TRIAL_LAST_SEEN_AT_KEY = "trial_last_seen_at";
export const PREMIUM_UNLOCKED_KEY = "premium_unlocked";
export const PREMIUM_PLATFORM_KEY = "premium_platform";
export const PREMIUM_PRODUCT_ID_KEY = "premium_product_id";
const LEGACY_TRIAL_STARTED_AT_KEY = "app_first_launched_at";
const LEGACY_PREMIUM_UNLOCKED_KEY = "app_is_premium";

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;

export type PremiumPlatform = "apple" | "google" | "debug" | "unknown";

export type EntitlementState =
  | { kind: "trial_active"; daysRemaining: number; trialStartedAt: string }
  | { kind: "trial_expired"; daysRemaining: 0; trialStartedAt: string }
  | { kind: "premium_unlocked"; daysRemaining: number; platform: PremiumPlatform; productId: string | null; trialStartedAt: string | null };

function parseStoredDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTrialDaysRemainingFromStart(trialStartedAt: string, now = new Date()): number {
  const startedAt = parseStoredDate(trialStartedAt);
  if (!startedAt) return TRIAL_LENGTH_DAYS;
  const diffTime = Math.max(0, now.getTime() - startedAt.getTime());
  const diffDays = Math.floor(diffTime / DAY_MS);
  return Math.max(0, TRIAL_LENGTH_DAYS - diffDays);
}

async function updateLastSeenAt(now: Date, existingLastSeenAt: string | null): Promise<void> {
  const nextLastSeenAt = now.toISOString();
  const previousLastSeen = parseStoredDate(existingLastSeenAt);

  if (previousLastSeen && now.getTime() + CLOCK_ROLLBACK_TOLERANCE_MS < previousLastSeen.getTime()) {
    return;
  }

  await setSetting(TRIAL_LAST_SEEN_AT_KEY, nextLastSeenAt);
}

export async function ensureTrialStarted(now = new Date()): Promise<string> {
  let trialStartedAt = await getSetting(TRIAL_STARTED_AT_KEY);
  const legacyTrialStartedAt = await getSetting(LEGACY_TRIAL_STARTED_AT_KEY);
  const parsed = parseStoredDate(trialStartedAt);

  if (!parsed) {
    trialStartedAt = parseStoredDate(legacyTrialStartedAt)?.toISOString() ?? now.toISOString();
    await setSetting(TRIAL_STARTED_AT_KEY, trialStartedAt);
  }

  return trialStartedAt ?? now.toISOString();
}

export async function getEntitlementState(now = new Date()): Promise<EntitlementState> {
  const [
    premiumUnlockedRaw,
    premiumPlatformRaw,
    premiumProductId,
    existingTrialStartedAt,
    existingLastSeenAt,
  ] = await Promise.all([
    getSetting(PREMIUM_UNLOCKED_KEY),
    getSetting(PREMIUM_PLATFORM_KEY),
    getSetting(PREMIUM_PRODUCT_ID_KEY),
    getSetting(TRIAL_STARTED_AT_KEY),
    getSetting(TRIAL_LAST_SEEN_AT_KEY),
  ]);
  const legacyPremiumUnlocked = await getSetting(LEGACY_PREMIUM_UNLOCKED_KEY);

  const trialStartedAt = await ensureTrialStarted(now);
  await updateLastSeenAt(now, existingLastSeenAt);

  const isPremiumUnlocked = premiumUnlockedRaw === "1" || legacyPremiumUnlocked === "1";

  if (isPremiumUnlocked) {
    if (premiumUnlockedRaw !== "1") {
      await setSetting(PREMIUM_UNLOCKED_KEY, "1");
    }

    return {
      kind: "premium_unlocked",
      daysRemaining: TRIAL_LENGTH_DAYS,
      platform: (premiumPlatformRaw as PremiumPlatform | null) ?? "unknown",
      productId: premiumProductId,
      trialStartedAt: existingTrialStartedAt ?? trialStartedAt,
    };
  }

  const daysRemaining = getTrialDaysRemainingFromStart(trialStartedAt, now);

  if (daysRemaining === 0) {
    return {
      kind: "trial_expired",
      daysRemaining: 0,
      trialStartedAt,
    };
  }

  return {
    kind: "trial_active",
    daysRemaining,
    trialStartedAt,
  };
}

export async function markPremiumUnlocked(input: {
  platform: PremiumPlatform;
  productId?: string | null;
}): Promise<void> {
  await Promise.all([
    setSetting(PREMIUM_UNLOCKED_KEY, "1"),
    setSetting(PREMIUM_PLATFORM_KEY, input.platform),
    setSetting(PREMIUM_PRODUCT_ID_KEY, input.productId ?? ""),
  ]);
}

export async function clearPremiumUnlock(): Promise<void> {
  await Promise.all([
    setSetting(PREMIUM_UNLOCKED_KEY, "0"),
    deleteSetting(PREMIUM_PLATFORM_KEY),
    deleteSetting(PREMIUM_PRODUCT_ID_KEY),
  ]);
}

export async function setTrialStartedAtForDebug(value: string): Promise<void> {
  await setSetting(TRIAL_STARTED_AT_KEY, value);
  await setSetting(TRIAL_LAST_SEEN_AT_KEY, nowISO());
}

export async function resetTrialStartingNow(): Promise<void> {
  await Promise.all([
    clearPremiumUnlock(),
    setTrialStartedAtForDebug(new Date().toISOString()),
  ]);
}

export async function setTrialDaysAgoForDebug(daysAgo: number): Promise<void> {
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  await Promise.all([
    clearPremiumUnlock(),
    setTrialStartedAtForDebug(target.toISOString()),
  ]);
}

export async function simulateExpiredTrial(): Promise<void> {
  await setTrialDaysAgoForDebug(TRIAL_LENGTH_DAYS + 1);
}
