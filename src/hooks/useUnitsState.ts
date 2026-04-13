import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";
import { detectDefaultUnitSystem, UNIT_SYSTEM_SETTING_KEY } from "../lib/units";
import type { UnitSystem } from "../lib/types";

export function useUnitsState() {
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

  const setUnitSystem = useCallback((next: UnitSystem) => {
    setUnitSystemState(next);
    void db.setSetting(UNIT_SYSTEM_SETTING_KEY, next);
  }, []);

  return {
    unitSystem,
    setUnitSystem,
  };
}
