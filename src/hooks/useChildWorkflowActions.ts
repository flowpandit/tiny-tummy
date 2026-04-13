import { useCallback } from "react";
import { syncSmartRemindersForChild } from "../lib/notifications";
import type { Child } from "../lib/types";
import { useAlertEngine } from "./useAlertEngine";

interface PostLogOptions {
  refresh?: Array<() => void | Promise<void>>;
  alerts?: boolean;
  reminders?: boolean;
}

export function useChildWorkflowActions(
  child: Child | null,
  refreshAlerts?: (() => Promise<void>) | null,
) {
  const { runChecks } = useAlertEngine();

  const refreshChildAlerts = useCallback(async () => {
    if (!child || !refreshAlerts) return;
    await runChecks(child);
    await refreshAlerts();
  }, [child, refreshAlerts, runChecks]);

  const syncChildReminders = useCallback(async () => {
    if (!child) return;
    await syncSmartRemindersForChild(child);
  }, [child]);

  const runPostLogActions = useCallback(async ({
    refresh = [],
    alerts = false,
    reminders = false,
  }: PostLogOptions = {}) => {
    for (const refreshAction of refresh) {
      await refreshAction();
    }

    if (alerts) {
      await refreshChildAlerts();
    }

    if (reminders) {
      await syncChildReminders();
    }
  }, [refreshChildAlerts, syncChildReminders]);

  return {
    refreshChildAlerts,
    syncChildReminders,
    runPostLogActions,
  };
}
