import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useUnitsState } from "../hooks/useUnitsState";
import type { UnitSystem } from "../lib/types";

interface UnitsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (next: UnitSystem) => void;
}

const UnitsContext = createContext<UnitsContextType | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const { unitSystem, setUnitSystem } = useUnitsState();

  const value = useMemo<UnitsContextType>(() => ({
    unitSystem,
    setUnitSystem,
  }), [setUnitSystem, unitSystem]);

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
