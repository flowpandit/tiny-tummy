import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import * as db from "../lib/db";
import { setStatusBarStyle } from "../lib/statusbar";

type ThemeMode = "system" | "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">(getSystemTheme());

  // Load saved preference
  useEffect(() => {
    db.getSetting("theme").then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  // Resolve and apply theme
  useEffect(() => {
    const effectiveTheme = mode === "system" ? getSystemTheme() : mode;
    setResolved(effectiveTheme);
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    // Update Android status bar icon color to match theme
    const isLight = effectiveTheme === "light";
    console.log(`[ThemeContext] mode=${mode} effectiveTheme=${effectiveTheme} isLight=${isLight}`);
    setStatusBarStyle(isLight);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const sys = getSystemTheme();
      setResolved(sys);
      document.documentElement.setAttribute("data-theme", sys);
      setStatusBarStyle(sys === "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    db.setSetting("theme", newMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
