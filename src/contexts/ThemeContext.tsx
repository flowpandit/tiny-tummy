import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import * as db from "../lib/db";
import { setStatusBarStyle } from "../lib/statusbar";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark" | "night";

const DEFAULT_NIGHT_START = "22:00";
const DEFAULT_NIGHT_END = "06:00";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: ResolvedTheme;
  nightModeEnabled: boolean;
  setNightModeEnabled: (enabled: boolean) => void;
  nightModeStart: string;
  nightModeEnd: string;
  setNightModeSchedule: (start: string, end: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isValidTimeValue(value: string | null): value is string {
  return value !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isScheduledNightActive(now: Date, start: string, end: string): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme());
  const [nightModeEnabled, setNightModeEnabledState] = useState(false);
  const [nightModeStart, setNightModeStartState] = useState(DEFAULT_NIGHT_START);
  const [nightModeEnd, setNightModeEndState] = useState(DEFAULT_NIGHT_END);
  const [clockTick, setClockTick] = useState(() => Date.now());

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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(getSystemTheme());

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const resolved = useMemo<ResolvedTheme>(() => {
    const baseTheme = mode === "system" ? systemTheme : mode;

    if (nightModeEnabled && isScheduledNightActive(new Date(clockTick), nightModeStart, nightModeEnd)) {
      return "night";
    }

    return baseTheme;
  }, [clockTick, mode, nightModeEnabled, nightModeEnd, nightModeStart, systemTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
    setStatusBarStyle(resolved === "light");
  }, [resolved]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    void db.setSetting("theme", newMode);
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

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        resolved,
        nightModeEnabled,
        setNightModeEnabled,
        nightModeStart,
        nightModeEnd,
        setNightModeSchedule,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
