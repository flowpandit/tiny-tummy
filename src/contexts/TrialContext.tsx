import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSetting, setSetting } from "../lib/db";
import { nowISO } from "../lib/utils";

interface TrialContextState {
  isLocked: boolean;
  daysRemaining: number;
  isLoading: boolean;
  unlockPremium: () => Promise<void>;
  simulateExpiration: () => Promise<void>;
}

const TrialContext = createContext<TrialContextState | undefined>(undefined);

export function TrialProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    async function initTrial() {
      try {
        const isPremiumStr = await getSetting("app_is_premium");
        if (isPremiumStr === "1") {
          setIsLocked(false);
          setIsLoading(false);
          return;
        }

        let firstLaunchedAt = await getSetting("app_first_launched_at");
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
        
        if (remaining === 0) {
          setIsLocked(true);
        }
      } catch (e) {
        console.error("Trial check failed", e);
      } finally {
        setIsLoading(false);
      }
    }

    initTrial();
  }, []);

  const unlockPremium = async () => {
    await setSetting("app_is_premium", "1");
    setIsLocked(false);
  };

  return (
    <TrialContext.Provider value={{ isLocked, daysRemaining, isLoading, unlockPremium, simulateExpiration }}>
      {children}
    </TrialContext.Provider>
  );
}

export function useTrial() {
  const context = useContext(TrialContext);
  if (!context) throw new Error("useTrial must be used within TrialProvider");
  return context;
}
