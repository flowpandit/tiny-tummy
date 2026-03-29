import { useState, useEffect, useCallback } from "react";
import type { FeedingEntry } from "../lib/types";
import * as db from "../lib/db";

export function useFeedingLogs(childId: string | null) {
  const [logs, setLogs] = useState<FeedingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await db.getFeedingLogs(childId);
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
