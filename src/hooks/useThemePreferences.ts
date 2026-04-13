import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";

export type ThemeMode = "system" | "light" | "dark";

const DEFAULT_NIGHT_START = "22:00";
const DEFAULT_NIGHT_END = "06:00";

function isValidTimeValue(value: string | null): value is string {
  return value !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function useThemePreferences() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [nightModeEnabled, setNightModeEnabledState] = useState(false);
  const [nightModeStart, setNightModeStartState] = useState(DEFAULT_NIGHT_START);
  const [nightModeEnd, setNightModeEndState] = useState(DEFAULT_NIGHT_END);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      db.getSetting("theme"),
      db.getSetting("night_mode_enabled"),
      db.getSetting("night_mode_start"),
      db.getSetting("night_mode_end"),
    ]).then(([themeValue, enabledValue, startValue, endValue]) => {
      if (cancelled) return;

      if (themeValue === "light" || themeValue === "dark" || themeValue === "system") {
        setModeState(themeValue);
      } else if (themeValue === "night") {
        setModeState("dark");
        void db.setSetting("theme", "dark");
        if (enabledValue === null) {
          setNightModeEnabledState(true);
          void db.setSetting("night_mode_enabled", "1");
        }
      }

      if (enabledValue === "1" || enabledValue === "true") {
        setNightModeEnabledState(true);
      }

      if (isValidTimeValue(startValue)) {
        setNightModeStartState(startValue);
      }

      if (isValidTimeValue(endValue)) {
        setNightModeEndState(endValue);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void db.setSetting("theme", nextMode);
  }, []);

  const setNightModeEnabled = useCallback((enabled: boolean) => {
    setNightModeEnabledState(enabled);
    void db.setSetting("night_mode_enabled", enabled ? "1" : "0");
  }, []);

  const setNightModeSchedule = useCallback((start: string, end: string) => {
    setNightModeStartState(start);
    setNightModeEndState(end);
    void db.setSetting("night_mode_start", start);
    void db.setSetting("night_mode_end", end);
  }, []);

  return {
    mode,
    setMode,
    nightModeEnabled,
    setNightModeEnabled,
    nightModeStart,
    nightModeEnd,
    setNightModeSchedule,
  };
}
