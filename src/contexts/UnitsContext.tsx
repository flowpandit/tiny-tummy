import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useUnitsState } from "../hooks/useUnitsState";
import type { TemperatureUnit, UnitSystem } from "../lib/types";

interface UnitsContextType {
  unitSystem: UnitSystem;
  temperatureUnit: TemperatureUnit;
  setUnitSystem: (next: UnitSystem) => void;
  setTemperatureUnit: (next: TemperatureUnit) => void;
}

const UnitsContext = createContext<UnitsContextType | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const { unitSystem, temperatureUnit, setUnitSystem, setTemperatureUnit } = useUnitsState();

  const value = useMemo<UnitsContextType>(() => ({
    unitSystem,
    temperatureUnit,
    setUnitSystem,
    setTemperatureUnit,
  }), [setTemperatureUnit, setUnitSystem, temperatureUnit, unitSystem]);

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
