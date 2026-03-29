import { useState, useEffect, useCallback } from "react";
import type { MilestoneEntry } from "../lib/types";
import * as db from "../lib/db";

export function useMilestoneLogs(childId: string | null) {
  const [logs, setLogs] = useState<MilestoneEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await db.getMilestoneLogs(childId);
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
