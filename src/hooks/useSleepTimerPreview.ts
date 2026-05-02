import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { getSleepTimerSettingKey, parseSleepTimerSession, type SleepTimerSession } from "../lib/sleep-timer";
import type { Child } from "../lib/types";
import { useVisibilityRefresh } from "./useVisibilityRefresh";

export function useSleepTimerPreview(activeChild: Child | null, refreshKey: unknown) {
  const db = useDbClient();
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());

  const refreshTimerSession = useCallback(async () => {
    if (!activeChild) {
      setTimerSession(null);
      setTick(Date.now());
      return;
    }

    try {
      const raw = await db.getSetting(getSleepTimerSettingKey(activeChild.id));
      setTimerSession(parseSleepTimerSession(raw));
    } catch {
      setTimerSession(null);
    }
    setTick(Date.now());
  }, [activeChild, db]);

  useEffect(() => {
    void refreshTimerSession();
  }, [refreshKey, refreshTimerSession]);

  useVisibilityRefresh(() => {
    void refreshTimerSession();
  }, Boolean(activeChild));

  useEffect(() => {
    if (!timerSession) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerSession]);

  return { timerSession, tick, refreshTimerSession };
}
