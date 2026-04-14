import { withTimeout } from "../lib/async";
import {
  clearPremiumUnlock,
  type EntitlementState,
  getEntitlementState,
  resetTrialStartingNow,
  setTrialDaysAgoForDebug,
  simulateExpiredTrial,
} from "../lib/entitlements";
import { purchasePremium, restorePurchases, syncOwnedPurchase } from "../lib/billing-service";
import { createExternalStore, type ExternalStore } from "../lib/store";

const STARTUP_LOAD_TIMEOUT_MS = 30000;

interface TrialStoreState {
  entitlement: EntitlementState | null;
  isLoading: boolean;
  loadError: string | null;
}

export interface TrialStore extends ExternalStore<TrialStoreState> {
  initialize: () => void;
  actions: {
    refreshTrial: () => Promise<void>;
    unlockPremium: () => Promise<void>;
    restorePremium: () => Promise<void>;
    resetTrial: () => Promise<void>;
    setTrialDaysAgo: (daysAgo: number) => Promise<void>;
    clearPremium: () => Promise<void>;
    simulateExpiration: () => Promise<void>;
  };
}

export function createTrialStore(): TrialStore {
  const store = createExternalStore<TrialStoreState>({
    entitlement: null,
    isLoading: true,
    loadError: null,
  });

  let hasLoadedOnce = false;
  let initialized = false;

  const refreshTrial = async () => {
    store.setState((state) => ({
      ...state,
      isLoading: true,
      loadError: hasLoadedOnce ? state.loadError : null,
    }));

    try {
      // Tauri desktop startup can be noticeably slower in CI while the WebView,
      // plugin-sql, and app-data SQLite file initialize for the first time.
      const entitlement = await withTimeout(getEntitlementState(), STARTUP_LOAD_TIMEOUT_MS, "Loading access state");
      store.setState((state) => ({
        ...state,
        entitlement,
        isLoading: false,
        loadError: null,
      }));
      hasLoadedOnce = true;
    } catch (error) {
      console.error("Entitlement check failed", error);
      store.setState((state) => ({
        ...state,
        isLoading: false,
        loadError: hasLoadedOnce ? state.loadError : "Unable to verify app access right now.",
      }));
    }
  };

  const unlockPremium = async () => {
    const result = await purchasePremium();
    if (!result.ok) {
      throw new Error(result.message ?? "Purchase could not be completed.");
    }
    await refreshTrial();
  };

  const restorePremium = async () => {
    const result = await restorePurchases();
    if (!result.ok) {
      throw new Error(result.message ?? "Restore could not be completed.");
    }
    await refreshTrial();
  };

  const resetTrial = async () => {
    await resetTrialStartingNow();
    await refreshTrial();
  };

  const setTrialDaysAgo = async (daysAgo: number) => {
    await setTrialDaysAgoForDebug(daysAgo);
    await refreshTrial();
  };

  const clearPremium = async () => {
    await clearPremiumUnlock();
    await refreshTrial();
  };

  const simulateExpiration = async () => {
    await simulateExpiredTrial();
    await refreshTrial();
  };

  return {
    ...store,
    initialize() {
      if (initialized) return;
      initialized = true;
      void refreshTrial();
      void syncOwnedPurchase().then(refreshTrial).catch(() => undefined);
    },
    actions: {
      refreshTrial,
      unlockPremium,
      restorePremium,
      resetTrial,
      setTrialDaysAgo,
      clearPremium,
      simulateExpiration,
    },
  };
}
