import { useState, useEffect, useCallback, useRef } from "react";
import type { FeedingEntry } from "../lib/types";
import { useRepositories } from "../contexts/DatabaseContext";

export function useFeedingLogs(childId: string | null, limit = 100) {
  const { feeding } = useRepositories();
  const [logs, setLogs] = useState<FeedingEntry[]>([]);
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
      const rows = await feeding.listFeedingLogs(childId, limit);
      if (requestId !== requestIdRef.current) return;
      setLogs(rows);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId, feeding, limit]);

  useEffect(() => {
    setLogs([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, isLoading, refresh };
}
