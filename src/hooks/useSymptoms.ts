import { useState, useEffect, useCallback } from "react";
import type { SymptomEntry } from "../lib/types";
import * as db from "../lib/db";

export function useSymptoms(childId: string | null) {
  const [logs, setLogs] = useState<SymptomEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setLogs([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await db.getSymptoms(childId);
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
