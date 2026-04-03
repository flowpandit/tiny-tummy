import { useCallback } from "react";
import { checkFrequencyAlert, checkColorAlert } from "../lib/tauri";
import { diaperIncludesWet, getChildAgeDays } from "../lib/diaper";
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

      if (getChildAgeDays(child.date_of_birth) < 365) {
        const diaperLogs = await db.getDiaperLogs(child.id, 40);
        const wetLogs = diaperLogs.filter((log) => diaperIncludesWet(log.diaper_type));
        const lastWet = wetLogs[0] ?? null;
        const existing = await db.getActiveAlerts(child.id);
        const ageDays = getChildAgeDays(child.date_of_birth);

        if (lastWet) {
          const hoursSinceWet = (Date.now() - new Date(lastWet.logged_at).getTime()) / 3600000;
          const thresholdHours = ageDays < 7 ? 6 : ageDays < 56 ? 8 : 10;

          if (hoursSinceWet >= thresholdHours && !existing.some((alert) => alert.alert_type === "low_wet_output")) {
            await db.createAlert({
              child_id: child.id,
              alert_type: "low_wet_output",
              severity: "warning",
              title: `${child.name}'s wet diaper gap is longer than usual`,
              message: "Wet diaper output looks lighter than expected. Recheck feeds, hydration, and how your baby is acting.",
              related_log_id: lastWet.id,
            });
          }

          const wetCount24h = wetLogs.filter((log) => Date.now() - new Date(log.logged_at).getTime() <= 24 * 3600000).length;
          if (ageDays >= 3 && wetCount24h < 5 && !existing.some((alert) => alert.alert_type === "low_wet_count_24h")) {
            await db.createAlert({
              child_id: child.id,
              alert_type: "low_wet_count_24h",
              severity: "warning",
              title: `${child.name} has fewer wet diapers than expected`,
              message: "The last 24 hours show fewer wet diapers than expected for a young baby. Recheck hydration and consider whether symptoms are changing.",
              related_log_id: lastWet.id,
            });
          }

          if (lastWet.urine_color === "dark") {
            const hasDarkUrineAlert = await db.hasAlertForLog(child.id, "dark_urine_diaper", lastWet.id);
            if (!hasDarkUrineAlert) {
              await db.createAlert({
                child_id: child.id,
                alert_type: "dark_urine_diaper",
                severity: "warning",
                title: `${child.name}'s urine looked darker than usual`,
                message: "Dark urine can be a hydration signal. Check feeds, wet diaper output, and overall symptoms in context.",
                related_log_id: lastWet.id,
              });
            }
          }
        }
      }
    } catch {
      // Alert checks are non-critical — silently fail
    }
  }, []);

  return { runChecks };
}
