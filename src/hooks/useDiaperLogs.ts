import { useState, useEffect, useCallback, useRef } from "react";
import type { DiaperEntry } from "../lib/types";
import * as db from "../lib/db";

export function useDiaperLogs(childId: string | null, limit = 100) {
  const [logs, setLogs] = useState<DiaperEntry[]>([]);
  const [lastDiaper, setLastDiaper] = useState<DiaperEntry | null>(null);
  const [lastWetDiaper, setLastWetDiaper] = useState<DiaperEntry | null>(null);
  const [lastDirtyDiaper, setLastDirtyDiaper] = useState<DiaperEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setLogs([]);
      setLastDiaper(null);
      setLastWetDiaper(null);
      setLastDirtyDiaper(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [allLogs, lastLog, lastWet, lastDirty] = await Promise.all([
        db.getDiaperLogs(childId, limit),
        db.getLastDiaperLog(childId),
        db.getLastWetDiaper(childId),
        db.getLastDirtyDiaper(childId),
      ]);

      if (requestId !== requestIdRef.current) return;
      setLogs(allLogs);
      setLastDiaper(lastLog);
      setLastWetDiaper(lastWet);
      setLastDirtyDiaper(lastDirty);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
      setLastDiaper(null);
      setLastWetDiaper(null);
      setLastDirtyDiaper(null);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId, limit]);

  useEffect(() => {
    setLogs([]);
    setLastDiaper(null);
    setLastWetDiaper(null);
    setLastDirtyDiaper(null);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, lastDiaper, lastWetDiaper, lastDirtyDiaper, isLoading, refresh };
}
