import { useState, useEffect, useCallback, useRef } from "react";
import type { PoopEntry } from "../lib/types";
import * as db from "../lib/db";

export function usePoopLogs(childId: string | null, limit = 100) {
  const [logs, setLogs] = useState<PoopEntry[]>([]);
  const [lastRealPoop, setLastRealPoop] = useState<PoopEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setLogs([]);
      setLastRealPoop(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [allLogs, lastPoop] = await Promise.all([
        db.getPoopLogs(childId, limit),
        db.getLastRealPoop(childId),
      ]);

      if (requestId !== requestIdRef.current) return;
      setLogs(allLogs);
      setLastRealPoop(lastPoop);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
      setLastRealPoop(null);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId, limit]);

  useEffect(() => {
    setLogs([]);
    setLastRealPoop(null);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, lastRealPoop, isLoading, refresh };
}
