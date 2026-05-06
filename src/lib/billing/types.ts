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

export type BillingProductMetadataSource = "store" | "fallback" | "desktop_dev";

export interface BillingProductMetadata {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currencyCode?: string;
  rawPriceMicros?: string;
  rawPrice?: number;
  available: boolean;
  source: BillingProductMetadataSource;
  errorCode?: BillingResultCode;
  message?: string;
}

export interface NativeBillingProductMetadataResponse {
  ok: boolean;
  code?: BillingResultCode | string | null;
  productId: string | null;
  title?: string | null;
  description?: string | null;
  localizedPrice?: string | null;
  currencyCode?: string | null;
  rawPriceMicros?: string | number | null;
  rawPrice?: number | null;
  available?: boolean | null;
  message?: string | null;
}

export interface BillingAdapter {
  purchasePremium(productId: string): Promise<BillingPurchaseResult>;
  restorePremium(productId: string): Promise<BillingPurchaseResult>;
  checkOwnedPremium(productId: string): Promise<BillingPurchaseResult>;
  getProductMetadata(productId: string): Promise<BillingProductMetadata>;
}

export function isBillingResultCode(value: unknown): value is BillingResultCode {
  return typeof value === "string" && (BILLING_RESULT_CODES as readonly string[]).includes(value);
}

export function normalizeBillingResultCode(value: unknown, ok: boolean): BillingResultCode {
  if (isBillingResultCode(value)) return value;
  return ok ? "success" : "failed";
}
