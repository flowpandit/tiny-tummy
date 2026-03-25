import { useState, useEffect, useCallback } from "react";
import type { Alert } from "../lib/types";
import * as db from "../lib/db";

export function useAlerts(childId: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const refresh = useCallback(async () => {
    if (!childId) {
      setAlerts([]);
      return;
    }
    try {
      const rows = await db.getActiveAlerts(childId);
      setAlerts(rows);
    } catch {
      setAlerts([]);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dismiss = useCallback(async (alertId: string) => {
    try {
      await db.dismissAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // Silent fail — alert stays visible
    }
  }, []);

  return { alerts, refresh, dismiss };
}
