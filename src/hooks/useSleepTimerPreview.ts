import { useEffect, useState } from "react";
import * as db from "../lib/db";
import { getSleepTimerSettingKey, parseSleepTimerSession, type SleepTimerSession } from "../lib/sleep-timer";
import type { Child } from "../lib/types";

export function useSleepTimerPreview(activeChild: Child | null, refreshKey: unknown) {
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (!activeChild) {
      setTimerSession(null);
      return;
    }

    let cancelled = false;
    const refreshTimerSession = () => {
      db.getSetting(getSleepTimerSettingKey(activeChild.id))
        .then((raw) => {
          if (!cancelled) {
            setTimerSession(parseSleepTimerSession(raw));
            setTick(Date.now());
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTimerSession(null);
            setTick(Date.now());
          }
        });
    };

    refreshTimerSession();
    window.addEventListener("focus", refreshTimerSession);
    document.addEventListener("visibilitychange", refreshTimerSession);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshTimerSession);
      document.removeEventListener("visibilitychange", refreshTimerSession);
    };
  }, [activeChild, refreshKey]);

  useEffect(() => {
    if (!timerSession) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerSession]);

  return { timerSession, tick };
}
