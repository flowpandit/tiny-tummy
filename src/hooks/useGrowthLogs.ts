import { useState, useEffect, useCallback } from "react";
import type { GrowthEntry } from "../lib/types";
import * as db from "../lib/db";

export function useGrowthLogs(childId: string | null) {
  const [logs, setLogs] = useState<GrowthEntry[]>([]);
  const [latest, setLatest] = useState<GrowthEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      setLatest(null);
      return;
    }

    setIsLoading(true);
    try {
      const [allLogs, latestLog] = await Promise.all([
        db.getGrowthLogs(childId),
        db.getLatestGrowthLog(childId),
      ]);
      setLogs(allLogs);
      setLatest(latestLog);
    } catch {
      setLogs([]);
      setLatest(null);
    }
    setIsLoading(false);
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, latest, isLoading, refresh };
}
