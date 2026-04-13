import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getSetting, setSetting } from "../lib/db";
import { nowISO } from "../lib/utils";
import { withTimeout } from "../lib/async";

interface TrialContextState {
  isLocked: boolean;
  daysRemaining: number;
  isLoading: boolean;
  loadError: string | null;
  unlockPremium: () => Promise<void>;
  simulateExpiration: () => Promise<void>;
  refreshTrial: () => Promise<void>;
}

const TrialContext = createContext<TrialContextState | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Expose this as a dev trick so you can easily test the Paywall
  const simulateExpiration = async () => {
    // Set first launched date to 15 days ago
    const past = new Date();
    past.setDate(past.getDate() - 15);
    await setSetting("app_first_launched_at", past.toISOString());
    await setSetting("app_is_premium", "0");
    setIsLocked(true);
    setDaysRemaining(0);
  };

  const refreshTrial = useCallback(async () => {
    setIsLoading(true);
    if (!hasLoadedOnce) {
      setLoadError(null);
    }

    try {
      const isPremiumStr = await withTimeout(getSetting("app_is_premium"), 8000, "Loading premium status");
      if (isPremiumStr === "1") {
        setIsLocked(false);
        setDaysRemaining(14);
        return;
      }

      let firstLaunchedAt = await withTimeout(getSetting("app_first_launched_at"), 8000, "Loading trial state");
      if (!firstLaunchedAt) {
        firstLaunchedAt = nowISO();
        await setSetting("app_first_launched_at", firstLaunchedAt);
      }

      const launchDate = new Date(firstLaunchedAt);
      const now = new Date();
      const diffTime = Math.max(0, now.getTime() - launchDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remaining = Math.max(0, 14 - diffDays);

      setDaysRemaining(remaining);
      setIsLocked(remaining === 0);
      setHasLoadedOnce(true);
      setLoadError(null);
    } catch (error) {
      console.error("Trial check failed", error);
      if (!hasLoadedOnce) {
        setLoadError("Unable to verify trial access right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    void refreshTrial();
  }, [refreshTrial]);

  const unlockPremium = async () => {
    await setSetting("app_is_premium", "1");
    setIsLocked(false);
  };

  return (
    <TrialContext.Provider value={{ isLocked, daysRemaining, isLoading, loadError, unlockPremium, simulateExpiration, refreshTrial }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const context = useContext(TrialContext);
  if (!context) throw new Error("useTrial must be used within TrialProvider");
  return context;
}
