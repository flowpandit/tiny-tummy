export type BillingPlatform = "apple" | "google" | "debug" | "unsupported";

export interface BillingPurchaseResult {
  ok: boolean;
  restored: boolean;
  platform: BillingPlatform;
  productId: string | null;
  message?: string;
}

export interface BillingAdapter {
  purchasePremium(productId: string): Promise<BillingPurchaseResult>;
  restorePremium(productId: string): Promise<BillingPurchaseResult>;
  checkOwnedPremium(productId: string): Promise<BillingPurchaseResult>;
}
