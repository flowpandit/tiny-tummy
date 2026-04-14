import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useThemePreferences, type ThemeMode } from "../hooks/useThemePreferences";
import { setStatusBarStyle } from "../lib/statusbar";

type ResolvedTheme = "light" | "dark" | "night";

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

function getDelayUntilNextMinute(now: Date): number {
  return ((60 - now.getSeconds()) * 1000) - now.getMilliseconds();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme());
  const [clockTick, setClockTick] = useState(() => Date.now());
  const refreshClockTick = useCallback(() => {
    setClockTick(Date.now());
  }, []);
  const {
    mode,
    setMode,
    nightModeEnabled,
    setNightModeEnabled,
    nightModeStart,
    nightModeEnd,
    setNightModeSchedule,
  } = useThemePreferences();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(getSystemTheme());

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;
    let timeoutId: number | null = null;

    const startMinuteInterval = () => {
      refreshClockTick();

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        refreshClockTick();
      }, 60_000);
    };

    const scheduleNextMinuteTick = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        startMinuteInterval();
      }, getDelayUntilNextMinute(new Date()));
    };

    const handleVisibilityRefresh = () => {
      refreshClockTick();

      if (document.visibilityState === "visible") {
        scheduleNextMinuteTick();
      }
    };

    scheduleNextMinuteTick();
    window.addEventListener("focus", handleVisibilityRefresh);
    window.addEventListener("pageshow", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      window.removeEventListener("focus", handleVisibilityRefresh);
      window.removeEventListener("pageshow", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [refreshClockTick]);

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
