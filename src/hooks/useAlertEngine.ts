import { useCallback } from "react";
import { checkFrequencyAlert, checkColorAlert } from "../lib/tauri";
import * as db from "../lib/db";
import type { Child } from "../lib/types";

export function useAlertEngine() {
  const runChecks = useCallback(async (child: Child) => {
    try {
      const lastPoop = await db.getLastRealPoop(child.id);

      const freqResult = await checkFrequencyAlert(
        child.name,
        child.date_of_birth,
        child.feeding_type,
        lastPoop?.logged_at ?? null,
      );

      if (freqResult) {
        const [alertType, severity, title, message] = freqResult;
        const existing = await db.getActiveAlerts(child.id);
        const hasSameType = existing.some((a) => a.alert_type === alertType);
        if (!hasSameType) {
          await db.createAlert({
            child_id: child.id,
            alert_type: alertType,
            severity,
            title,
            message,
          });
        }
      }

      if (lastPoop?.color) {
        const colorResult = await checkColorAlert(
          child.name,
          child.date_of_birth,
          child.feeding_type,
          lastPoop.color,
        );

        if (colorResult) {
          const [alertType, severity, title, message] = colorResult;
          const hasSameAlertForLog = await db.hasAlertForLog(child.id, alertType, lastPoop.id);

          if (hasSameAlertForLog) {
            return;
          }

          await db.createAlert({
            child_id: child.id,
            alert_type: alertType,
            severity,
            title,
            message,
            related_log_id: lastPoop.id,
          });
        }
      }
    } catch {
      // Alert checks are non-critical — silently fail
    }
  }, []);

  return { runChecks };
}
