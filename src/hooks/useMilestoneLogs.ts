import { useState, useEffect, useCallback, useRef } from "react";
import type { MilestoneEntry } from "../lib/types";
import { useDbClient } from "../contexts/DatabaseContext";

export function useMilestoneLogs(childId: string | null) {
  const db = useDbClient();
  const [logs, setLogs] = useState<MilestoneEntry[]>([]);
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
      const rows = await db.getMilestoneLogs(childId);
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
