import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServices } from "../contexts/DatabaseContext";
import type { HandoffSummary } from "../lib/handoff-summary";
import type { Child } from "../lib/types";

export function useCaregiverHandoff(activeChild: Child | null) {
  const { handoff } = useServices();
  const [summary, setSummary] = useState<HandoffSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!activeChild) {
      setSummary(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextSummary = await handoff.getHandoffSummary(activeChild.id);
      if (requestId !== requestIdRef.current) return;
      setSummary(nextSummary);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setSummary(null);
      setError(caught instanceof Error ? caught.message : "Could not prepare the caregiver handoff.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeChild, handoff]);

  useEffect(() => {
    setSummary(null);
    setError(null);
    setIsLoading(Boolean(activeChild));
    void refresh();
  }, [activeChild, refresh]);

  return useMemo(() => ({
    summary,
    isLoading,
    error,
    refresh,
  }), [error, isLoading, refresh, summary]);
}
