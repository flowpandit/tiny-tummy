import { platform } from "@tauri-apps/plugin-os";
import { appleBillingAdapter } from "./apple";
import { googleBillingAdapter } from "./google";
import type { BillingAdapter } from "./types";

export {
  FAMILY_SYNC_MONTHLY_PRODUCT_ID,
  FAMILY_SYNC_YEARLY_PRODUCT_ID,
  LEGACY_PREMIUM_UNLOCK_PRODUCT_ID,
  LIFETIME_PRIVATE_PRODUCT_ID,
  getEntitlementForStoreProduct,
  isCanonicalLifetimePrivateProductId,
  isFamilySyncStoreProductId,
  isLegacyLifetimePrivateProductId,
  isLifetimePrivateStoreProductId,
} from "./products";
export type { StoreProductEntitlementId } from "./products";

export function getBillingPlatform(): string {
  try {
    return platform();
  } catch {
    return "unknown";
  }
}

export function isDesktopDevBillingSimulation(): boolean {
  const currentPlatform = getBillingPlatform();
  return Boolean(import.meta.env?.DEV) && ["macos", "windows", "linux"].includes(currentPlatform);
}

export function getBillingAdapter(): BillingAdapter | null {
  const currentPlatform = getBillingPlatform();

  if (currentPlatform === "ios") return appleBillingAdapter;
  if (currentPlatform === "android") return googleBillingAdapter;

  return null;
}
