import { useState, useEffect, useCallback } from "react";
import type { PoopEntry } from "../lib/types";
import * as db from "../lib/db";

export function usePoopLogs(childId: string | null) {
  const [logs, setLogs] = useState<PoopEntry[]>([]);
  const [lastRealPoop, setLastRealPoop] = useState<PoopEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      setLastRealPoop(null);
      return;
    }
    setIsLoading(true);
    try {
      const [allLogs, lastPoop] = await Promise.all([
        db.getPoopLogs(childId),
        db.getLastRealPoop(childId),
      ]);
      setLogs(allLogs);
      setLastRealPoop(lastPoop);
    } catch {
      setLogs([]);
      setLastRealPoop(null);
    }
    setIsLoading(false);
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, lastRealPoop, isLoading, refresh };
}
