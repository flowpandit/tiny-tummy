import { useCallback } from "react";
import { syncSmartRemindersForChild } from "../lib/notifications.ts";
import type { Child } from "../lib/types.ts";
import { useAlertEngine } from "./useAlertEngine.ts";

interface PostLogOptions {
  refresh?: Array<() => void | Promise<void>>;
  alerts?: boolean;
  reminders?: boolean;
}

interface ChildWorkflowActionDeps {
  runChecks?: (child: Child) => Promise<void>;
  syncSmartRemindersForChild?: (child: Child) => Promise<void>;
}

export function useChildWorkflowActions(
  child: Child | null,
  refreshAlerts?: (() => Promise<void>) | null,
  deps: ChildWorkflowActionDeps = {},
) {
  const { runChecks } = useAlertEngine();
  const runAlertChecks = deps.runChecks ?? runChecks;
  const syncReminders = deps.syncSmartRemindersForChild ?? syncSmartRemindersForChild;

  const refreshChildAlerts = useCallback(async () => {
    if (!child || !refreshAlerts) return;
    await runAlertChecks(child);
    await refreshAlerts();
  }, [child, refreshAlerts, runAlertChecks]);

  const syncChildReminders = useCallback(async () => {
    if (!child) return;
    await syncReminders(child);
  }, [child, syncReminders]);

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
