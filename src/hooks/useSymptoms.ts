import { useState, useEffect, useCallback, useRef } from "react";
import type { SymptomEntry } from "../lib/types";
import { useRepositories } from "../contexts/DatabaseContext";

export function useSymptoms(childId: string | null) {
  const { care } = useRepositories();
  const [logs, setLogs] = useState<SymptomEntry[]>([]);
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
      const rows = await care.listSymptoms(childId);
      if (requestId !== requestIdRef.current) return;
      setLogs(rows);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setLogs([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [care, childId]);

  useEffect(() => {
    setLogs([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { logs, isLoading, refresh };
}
