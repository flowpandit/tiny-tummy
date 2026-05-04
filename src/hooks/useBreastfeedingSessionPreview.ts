import { useCallback, useEffect, useMemo, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import {
  type BreastTimerSide,
  type BreastfeedingSessionState,
  getBreastfeedingSessionSettingKey,
  parseBreastfeedingSession,
} from "../lib/breastfeeding";
import type { Child } from "../lib/types";
import { useVisibilityRefresh } from "./useVisibilityRefresh";

function getActiveSide(session: BreastfeedingSessionState | null): BreastTimerSide | null {
  if (!session?.activeStartedAt) return null;
  return session.activeSide;
}

function getSessionElapsedMs(session: BreastfeedingSessionState | null, tick: number): number {
  if (!session) return 0;

  const activeSide = getActiveSide(session);
  const activeElapsed = activeSide && session.activeStartedAt
    ? Math.max(0, tick - session.activeStartedAt)
    : 0;

  return session.durations.left + session.durations.right + activeElapsed;
}

export function useBreastfeedingSessionPreview(activeChild: Child | null, refreshKey?: unknown) {
  const db = useDbClient();
  const [session, setSession] = useState<BreastfeedingSessionState | null>(null);
  const [tick, setTick] = useState(Date.now());

  const refreshSession = useCallback(async () => {
    if (!activeChild) {
      setSession(null);
      setTick(Date.now());
      return;
    }

    try {
      const raw = await db.getSetting(getBreastfeedingSessionSettingKey(activeChild.id));
      setSession(parseBreastfeedingSession(raw));
    } catch {
      setSession(null);
    }
    setTick(Date.now());
  }, [activeChild, db]);

  useEffect(() => {
    void refreshSession();
  }, [refreshKey, refreshSession]);

  useVisibilityRefresh(() => {
    void refreshSession();
  }, Boolean(activeChild));

  const activeSide = getActiveSide(session);

  useEffect(() => {
    if (!activeSide) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSide]);

  const elapsedMs = useMemo(() => getSessionElapsedMs(session, tick), [session, tick]);

  return {
    session,
    activeSide,
    elapsedMs,
    refreshSession,
  };
}
