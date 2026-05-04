import {
  isPremiumFeatureId,
  type PremiumFeatureId,
} from "./feature-access";

export interface PaywallNavigationState {
  featureId: PremiumFeatureId | null;
  returnTo: string;
}

export function getPaywallNavigationState(state: unknown): PaywallNavigationState {
  if (!state || typeof state !== "object") {
    return { featureId: null, returnTo: "/" };
  }

  const raw = state as { featureId?: unknown; returnTo?: unknown };
  const returnTo = typeof raw.returnTo === "string" && raw.returnTo.startsWith("/") && raw.returnTo !== "/unlock"
    ? raw.returnTo
    : "/";

  return {
    featureId: isPremiumFeatureId(raw.featureId) ? raw.featureId : null,
    returnTo,
  };
}
