import { useCallback, useEffect, useState } from "react";
import { useRepositories } from "../contexts/DatabaseContext";

export type ThemeMode = "system" | "light" | "dark";

const DEFAULT_NIGHT_START = "22:00";
const DEFAULT_NIGHT_END = "06:00";

function isValidTimeValue(value: string | null): value is string {
  return value !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function useThemePreferences() {
  const { settings } = useRepositories();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [nightModeEnabled, setNightModeEnabledState] = useState(false);
  const [nightModeStart, setNightModeStartState] = useState(DEFAULT_NIGHT_START);
  const [nightModeEnd, setNightModeEndState] = useState(DEFAULT_NIGHT_END);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      settings.getSetting("theme"),
      settings.getSetting("night_mode_enabled"),
      settings.getSetting("night_mode_start"),
      settings.getSetting("night_mode_end"),
    ]).then(([themeValue, enabledValue, startValue, endValue]) => {
      if (cancelled) return;

      if (themeValue === "light" || themeValue === "dark" || themeValue === "system") {
        setModeState(themeValue);
      } else if (themeValue === "night") {
        setModeState("dark");
        void settings.setSetting("theme", "dark");
        if (enabledValue === null) {
          setNightModeEnabledState(true);
          void settings.setSetting("night_mode_enabled", "1");
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
  }, [settings]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void settings.setSetting("theme", nextMode);
  }, [settings]);

  const setNightModeEnabled = useCallback((enabled: boolean) => {
    setNightModeEnabledState(enabled);
    void settings.setSetting("night_mode_enabled", enabled ? "1" : "0");
  }, [settings]);

  const setNightModeSchedule = useCallback((start: string, end: string) => {
    setNightModeStartState(start);
    setNightModeEndState(end);
    void settings.setSetting("night_mode_start", start);
    void settings.setSetting("night_mode_end", end);
  }, [settings]);

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
