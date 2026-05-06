import {
  parseFeatureId,
  type FeatureId,
} from "./feature-access";

export interface UnlockNavigationState {
  featureId: FeatureId | null;
  returnTo: string;
}

export function getUnlockNavigationState(state: unknown): UnlockNavigationState {
  if (!state || typeof state !== "object") {
    return { featureId: null, returnTo: "/" };
  }

  const raw = state as { featureId?: unknown; returnTo?: unknown };
  const returnTo = typeof raw.returnTo === "string" && raw.returnTo.startsWith("/") && raw.returnTo !== "/unlock"
    ? raw.returnTo
    : "/";

  return {
    featureId: parseFeatureId(raw.featureId),
    returnTo,
  };
}
