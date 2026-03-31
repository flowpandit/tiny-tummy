import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as db from "../lib/db";
import { detectDefaultUnitSystem, UNIT_SYSTEM_SETTING_KEY } from "../lib/units";
import type { UnitSystem } from "../lib/types";

interface UnitsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (next: UnitSystem) => void;
}

const UnitsContext = createContext<UnitsContextType | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => detectDefaultUnitSystem());

  useEffect(() => {
    let cancelled = false;

    db.getSetting(UNIT_SYSTEM_SETTING_KEY).then((storedValue) => {
      if (cancelled) return;

      if (storedValue === "metric" || storedValue === "imperial") {
        setUnitSystemState(storedValue);
        return;
      }

      const detectedDefault = detectDefaultUnitSystem();
      setUnitSystemState(detectedDefault);
      void db.setSetting(UNIT_SYSTEM_SETTING_KEY, detectedDefault);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<UnitsContextType>(() => ({
    unitSystem,
    setUnitSystem: (next: UnitSystem) => {
      setUnitSystemState(next);
      void db.setSetting(UNIT_SYSTEM_SETTING_KEY, next);
    },
  }), [unitSystem]);

  return (
    <UnitsContext.Provider value={value}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
