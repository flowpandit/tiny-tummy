import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import {
  detectDefaultUnitSystem,
  getDefaultTemperatureUnit,
  TEMPERATURE_UNIT_SETTING_KEY,
  UNIT_SYSTEM_SETTING_KEY,
} from "../lib/units";
import type { TemperatureUnit, UnitSystem } from "../lib/types";

export function useUnitsState() {
  const db = useDbClient();
  const detectedUnitSystem = detectDefaultUnitSystem();
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(detectedUnitSystem);
  const [temperatureUnit, setTemperatureUnitState] = useState<TemperatureUnit>(() => getDefaultTemperatureUnit(detectedUnitSystem));
  const [hasExplicitTemperatureUnit, setHasExplicitTemperatureUnit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      db.getSetting(UNIT_SYSTEM_SETTING_KEY),
      db.getSetting(TEMPERATURE_UNIT_SETTING_KEY),
    ]).then(([storedValue, storedTemperatureUnit]) => {
      if (cancelled) return;

      let nextUnitSystem = detectDefaultUnitSystem();
      if (storedValue === "metric" || storedValue === "imperial") {
        nextUnitSystem = storedValue;
      } else {
        void db.setSetting(UNIT_SYSTEM_SETTING_KEY, nextUnitSystem);
      }

      setUnitSystemState(nextUnitSystem);

      if (storedTemperatureUnit === "celsius" || storedTemperatureUnit === "fahrenheit") {
        setTemperatureUnitState(storedTemperatureUnit);
        setHasExplicitTemperatureUnit(true);
      } else {
        setTemperatureUnitState(getDefaultTemperatureUnit(nextUnitSystem));
        setHasExplicitTemperatureUnit(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [db]);

  const setUnitSystem = useCallback((next: UnitSystem) => {
    setUnitSystemState(next);
    void db.setSetting(UNIT_SYSTEM_SETTING_KEY, next);
    if (!hasExplicitTemperatureUnit) {
      setTemperatureUnitState(getDefaultTemperatureUnit(next));
    }
  }, [db, hasExplicitTemperatureUnit]);

  const setTemperatureUnit = useCallback((next: TemperatureUnit) => {
    setTemperatureUnitState(next);
    setHasExplicitTemperatureUnit(true);
    void db.setSetting(TEMPERATURE_UNIT_SETTING_KEY, next);
  }, [db]);

  return {
    unitSystem,
    temperatureUnit,
    setUnitSystem,
    setTemperatureUnit,
  };
}
