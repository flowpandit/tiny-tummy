import { createContext, useContext, type ReactNode } from "react";
import { useEntitlement } from "../hooks/useEntitlement";

interface TrialContextState {
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

const TrialContext = createContext<TrialContextState | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const {
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
  } = useEntitlement();

  const isLocked = entitlement?.kind === "trial_expired";
  const daysRemaining = entitlement?.daysRemaining ?? 14;

  return (
    <TrialContext.Provider
      value={{
        isLocked,
        daysRemaining,
        isLoading,
        loadError,
        unlockPremium,
        restorePremium,
        resetTrial,
        setTrialDaysAgo,
        clearPremium,
        simulateExpiration,
        refreshTrial: refreshEntitlement,
      }}
    >
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const context = useContext(TrialContext);
  if (!context) throw new Error("useTrial must be used within TrialProvider");
  return context;
}
