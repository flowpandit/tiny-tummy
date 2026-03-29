import { useState, useEffect, useCallback } from "react";
import type { SleepEntry } from "../lib/types";
import * as db from "../lib/db";

export function useSleepLogs(childId: string | null) {
  const [logs, setLogs] = useState<SleepEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await db.getSleepLogs(childId);
      setLogs(rows);
    } catch {
      setLogs([]);
    }
    setIsLoading(false);
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, isLoading, refresh };
}
