export type BillingPlatform = "apple" | "google" | "debug" | "unsupported";

export const BILLING_RESULT_CODES = [
  "success",
  "cancelled",
  "pending",
  "unavailable",
  "offline",
  "product_unavailable",
  "no_purchase_found",
  "failed",
] as const;

export type BillingResultCode = (typeof BILLING_RESULT_CODES)[number];

export interface BillingPurchaseResult {
  ok: boolean;
  code: BillingResultCode;
  restored: boolean;
  platform: BillingPlatform;
  productId: string | null;
  message?: string;
}

export interface NativeBillingResponse {
  ok: boolean;
  code?: BillingResultCode | string | null;
  restored: boolean;
  productId: string | null;
  message?: string | null;
}

export interface BillingAdapter {
  purchasePremium(productId: string): Promise<BillingPurchaseResult>;
  restorePremium(productId: string): Promise<BillingPurchaseResult>;
  checkOwnedPremium(productId: string): Promise<BillingPurchaseResult>;
}

export function isBillingResultCode(value: unknown): value is BillingResultCode {
  return typeof value === "string" && (BILLING_RESULT_CODES as readonly string[]).includes(value);
}

export function normalizeBillingResultCode(value: unknown, ok: boolean): BillingResultCode {
  if (isBillingResultCode(value)) return value;
  return ok ? "success" : "failed";
}
