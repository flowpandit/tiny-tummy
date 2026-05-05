import { useState, useEffect, useCallback, useRef } from "react";
import type { Alert } from "../lib/types";
import { useRepositories } from "../contexts/DatabaseContext";

export function useAlerts(childId: string | null) {
  const { care } = useRepositories();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setAlerts([]);
      return;
    }

    try {
      const rows = await care.listActiveAlerts(childId);
      if (requestId !== requestIdRef.current) return;
      setAlerts(rows);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setAlerts([]);
    }
  }, [care, childId]);

  useEffect(() => {
    setAlerts([]);
    void refresh();
  }, [childId, refresh]);

  const dismiss = useCallback(async (alertId: string) => {
    try {
      await care.dismissAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // Silent fail — alert stays visible
    }
  }, [care]);

  return { alerts, refresh, dismiss };
}
