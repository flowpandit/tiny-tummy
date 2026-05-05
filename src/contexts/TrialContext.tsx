import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useStoreSelector } from "../lib/store";
import { createTrialStore, type TrialStore } from "./trial-store";
import {
  canUsePremiumFeature,
  getAccessKind,
  hasFullAccess,
  type AccessKind,
  type PremiumFeatureId,
} from "../lib/feature-access";
import type { EntitlementState } from "../lib/entitlements";

interface TrialContextState {
  entitlement: EntitlementState | null;
  accessKind: AccessKind;
  hasFullAccess: boolean;
  isFreeBasic: boolean;
  isLocked: boolean;
  daysRemaining: number;
  isLoading: boolean;
  loadError: string | null;
  unlockPremium: () => Promise<void>;
  restorePremium: () => Promise<void>;
  resetTrial: () => Promise<void>;
  setTrialDaysAgo: (daysAgo: number) => Promise<void>;
  clearPremium: () => Promise<void>;
  simulateExpiration: () => Promise<void>;
  refreshTrial: () => Promise<void>;
}

const TrialContext = createContext<TrialStore | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<TrialStore | undefined>(undefined);

  if (!storeRef.current) {
    storeRef.current = createTrialStore();
  }

  useEffect(() => {
    storeRef.current?.initialize();
  }, []);

  return <TrialContext.Provider value={storeRef.current}>{children}</TrialContext.Provider>;
}

function useTrialStore() {
  const context = useContext(TrialContext);
  if (!context) throw new Error("useTrial must be used within TrialProvider");
  return context;
}

export function useTrialAccess() {
  const store = useTrialStore();
  const entitlement = useStoreSelector(store, (state) => state.entitlement);
  const isLoading = useStoreSelector(store, (state) => state.isLoading);
  const loadError = useStoreSelector(store, (state) => state.loadError);
  const accessKind = getAccessKind(entitlement);
  const hasFullPlanAccess = hasFullAccess(entitlement);
  const isFreeBasic = accessKind === "free";
  const isLocked = isFreeBasic;
  const daysRemaining = entitlement?.daysRemaining ?? 14;

  return useMemo(() => ({
    entitlement,
    accessKind,
    hasFullAccess: hasFullPlanAccess,
    isFreeBasic,
    isLocked,
    daysRemaining,
    isLoading,
    loadError,
  }), [accessKind, daysRemaining, entitlement, hasFullPlanAccess, isFreeBasic, isLoading, isLocked, loadError]);
}

export function useTrialActions() {
  const store = useTrialStore();
  return store.actions;
}

export function usePremiumFeature(featureId: PremiumFeatureId) {
  const store = useTrialStore();
  const entitlement = useStoreSelector(store, (state) => state.entitlement);
  return canUsePremiumFeature(entitlement, featureId);
}

export function useTrial() {
  const access = useTrialAccess();
  const actions = useTrialActions();
  return useMemo<TrialContextState>(() => ({
    ...access,
    ...actions,
  }), [access, actions]);
}
