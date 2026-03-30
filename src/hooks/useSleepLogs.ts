import { useState, useEffect, useCallback, useRef } from "react";
import type { SleepEntry } from "../lib/types";
import * as db from "../lib/db";

export function useSleepLogs(childId: string | null) {
  const [logs, setLogs] = useState<SleepEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await db.getSleepLogs(childId);
      if (requestId !== requestIdRef.current) return;
      setLogs(rows);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setLogs([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, isLoading, refresh };
}
