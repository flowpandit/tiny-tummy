import { useCallback, useEffect, useState } from "react";
import {
  clearPremiumUnlock,
  type EntitlementState,
  getEntitlementState,
  resetTrialStartingNow,
  setTrialDaysAgoForDebug,
  simulateExpiredTrial,
} from "../lib/entitlements";
import { withTimeout } from "../lib/async";
import { purchasePremium, restorePurchases, syncOwnedPurchase } from "../lib/billing-service";

interface UseEntitlementState {
  entitlement: EntitlementState | null;
  isLoading: boolean;
  loadError: string | null;
  refreshEntitlement: () => Promise<void>;
  unlockPremium: () => Promise<void>;
  restorePremium: () => Promise<void>;
  resetTrial: () => Promise<void>;
  setTrialDaysAgo: (daysAgo: number) => Promise<void>;
  clearPremium: () => Promise<void>;
  simulateExpiration: () => Promise<void>;
}

export function useEntitlement(): UseEntitlementState {
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refreshEntitlement = useCallback(async () => {
    setIsLoading(true);
    if (!hasLoadedOnce) {
      setLoadError(null);
    }

    try {
      const nextEntitlement = await withTimeout(getEntitlementState(), 8000, "Loading access state");
      setEntitlement(nextEntitlement);
      setHasLoadedOnce(true);
      setLoadError(null);
    } catch (error) {
      console.error("Entitlement check failed", error);
      if (!hasLoadedOnce) {
        setLoadError("Unable to verify app access right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  useEffect(() => {
    void syncOwnedPurchase().then(() => refreshEntitlement()).catch(() => undefined);
  }, [refreshEntitlement]);

  const unlockPremium = useCallback(async () => {
    const result = await purchasePremium();
    if (!result.ok) {
      throw new Error(result.message ?? "Purchase could not be completed.");
    }
    await refreshEntitlement();
  }, [refreshEntitlement]);

  const restorePremium = useCallback(async () => {
    const result = await restorePurchases();
    if (!result.ok) {
      throw new Error(result.message ?? "Restore could not be completed.");
    }
    await refreshEntitlement();
  }, [refreshEntitlement]);

  const simulateExpiration = useCallback(async () => {
    await simulateExpiredTrial();
    await refreshEntitlement();
  }, [refreshEntitlement]);

  const resetTrial = useCallback(async () => {
    await resetTrialStartingNow();
    await refreshEntitlement();
  }, [refreshEntitlement]);

  const setTrialDaysAgo = useCallback(async (daysAgo: number) => {
    await setTrialDaysAgoForDebug(daysAgo);
    await refreshEntitlement();
  }, [refreshEntitlement]);

  const clearPremium = useCallback(async () => {
    await clearPremiumUnlock();
    await refreshEntitlement();
  }, [refreshEntitlement]);

  return {
    entitlement,
    isLoading,
    loadError,
    refreshEntitlement,
    unlockPremium,
    restorePremium,
    resetTrial,
    setTrialDaysAgo,
    clearPremium,
    simulateExpiration,
  };
}
