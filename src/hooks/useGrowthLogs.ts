import { useState, useEffect, useCallback, useRef } from "react";
import type { GrowthEntry } from "../lib/types";
import * as db from "../lib/db";

export function useGrowthLogs(childId: string | null) {
  const [logs, setLogs] = useState<GrowthEntry[]>([]);
  const [latest, setLatest] = useState<GrowthEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setLogs([]);
      setLatest(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [allLogs, latestLog] = await Promise.all([
        db.getGrowthLogs(childId),
        db.getLatestGrowthLog(childId),
      ]);
      if (requestId !== requestIdRef.current) return;
      setLogs(allLogs);
      setLatest(latestLog);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
      setLatest(null);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setLogs([]);
    setLatest(null);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, latest, isLoading, refresh };
}
