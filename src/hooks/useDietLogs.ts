import { useState, useEffect, useCallback } from "react";
import type { DietEntry } from "../lib/types";
import * as db from "../lib/db";

export function useDietLogs(childId: string | null) {
  const [logs, setLogs] = useState<DietEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await db.getDietLogs(childId);
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
