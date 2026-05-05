import { useCallback, useEffect, useState } from "react";
import { useRepositories } from "../contexts/DatabaseContext";
import {
  detectDefaultUnitSystem,
  getDefaultTemperatureUnit,
  TEMPERATURE_UNIT_SETTING_KEY,
  UNIT_SYSTEM_SETTING_KEY,
} from "../lib/units";
import type { TemperatureUnit, UnitSystem } from "../lib/types";

export function useUnitsState() {
  const { settings } = useRepositories();
  const detectedUnitSystem = detectDefaultUnitSystem();
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(detectedUnitSystem);
  const [temperatureUnit, setTemperatureUnitState] = useState<TemperatureUnit>(() => getDefaultTemperatureUnit(detectedUnitSystem));
  const [hasExplicitTemperatureUnit, setHasExplicitTemperatureUnit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      settings.getSetting(UNIT_SYSTEM_SETTING_KEY),
      settings.getSetting(TEMPERATURE_UNIT_SETTING_KEY),
    ]).then(([storedValue, storedTemperatureUnit]) => {
      if (cancelled) return;

      let nextUnitSystem = detectDefaultUnitSystem();
      if (storedValue === "metric" || storedValue === "imperial") {
        nextUnitSystem = storedValue;
      } else {
        void settings.setSetting(UNIT_SYSTEM_SETTING_KEY, nextUnitSystem);
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
  }, [settings]);

  const setUnitSystem = useCallback((next: UnitSystem) => {
    setUnitSystemState(next);
    void settings.setSetting(UNIT_SYSTEM_SETTING_KEY, next);
    if (!hasExplicitTemperatureUnit) {
      setTemperatureUnitState(getDefaultTemperatureUnit(next));
    }
  }, [hasExplicitTemperatureUnit, settings]);

  const setTemperatureUnit = useCallback((next: TemperatureUnit) => {
    setTemperatureUnitState(next);
    setHasExplicitTemperatureUnit(true);
    void settings.setSetting(TEMPERATURE_UNIT_SETTING_KEY, next);
  }, [settings]);

  return {
    unitSystem,
    temperatureUnit,
    setUnitSystem,
    setTemperatureUnit,
  };
}
