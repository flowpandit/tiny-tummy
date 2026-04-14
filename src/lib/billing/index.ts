import { platform } from "@tauri-apps/plugin-os";
import { appleBillingAdapter } from "./apple";
import { googleBillingAdapter } from "./google";
import type { BillingAdapter } from "./types";

export const PREMIUM_UNLOCK_PRODUCT_ID = "premium_unlock";

export function getBillingPlatform(): string {
  try {
    return platform();
  } catch {
    return "unknown";
  }
}

export function isDesktopDevBillingSimulation(): boolean {
  const currentPlatform = getBillingPlatform();
  return import.meta.env.DEV && ["macos", "windows", "linux"].includes(currentPlatform);
}

export function getBillingAdapter(): BillingAdapter | null {
  const currentPlatform = getBillingPlatform();

  if (currentPlatform === "ios") return appleBillingAdapter;
  if (currentPlatform === "android") return googleBillingAdapter;

  return null;
}
