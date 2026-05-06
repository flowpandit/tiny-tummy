import { invoke } from "@tauri-apps/api/core";
import type { NativeBillingResponse } from "./types";

function normalizeError(error: unknown, fallback: string): NativeBillingResponse {
  return {
    ok: false,
    code: "failed",
    restored: false,
    productId: null,
    message: error instanceof Error ? error.message : fallback,
  };
}

export async function purchasePremiumNative(productId: string): Promise<NativeBillingResponse> {
  try {
    return await invoke("billing_purchase_premium", { productId });
  } catch (error) {
    return normalizeError(error, "Purchase could not be completed.");
  }
}

export async function restorePremiumNative(productId: string): Promise<NativeBillingResponse> {
  try {
    return await invoke("billing_restore_premium", { productId });
  } catch (error) {
    return normalizeError(error, "Restore could not be completed.");
  }
}

export async function checkOwnedPremiumNative(productId: string): Promise<NativeBillingResponse> {
  try {
    return await invoke("billing_check_owned_premium", { productId });
  } catch (error) {
    return normalizeError(error, "Ownership sync could not be completed.");
  }
}
