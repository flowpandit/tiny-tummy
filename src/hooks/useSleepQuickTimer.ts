import { useCallback, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import {
  formatSleepTimerClock,
  getLocalTimestamp,
  getSleepTimerElapsedMs,
  getSleepTimerSettingKey,
  type SleepTimerSession,
} from "../lib/sleep-timer";
import type { Child } from "../lib/types";
import { useSleepTimerPreview } from "./useSleepTimerPreview";

export function useSleepQuickTimer({
  activeChild,
  refreshKey,
  onLogged,
  onError,
  onSuccess,
}: {
  activeChild: Child | null;
  refreshKey?: unknown;
  onLogged: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const { timerSession, tick, refreshTimerSession } = useSleepTimerPreview(activeChild, refreshKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartNapTimer = useCallback(async () => {
    if (!activeChild || isSubmitting) return;

    if (timerSession) {
      await refreshTimerSession();
      return;
    }

    const nextSession: SleepTimerSession = {
      sleepType: "nap",
      startedAt: getLocalTimestamp(),
      notes: "",
    };

    setIsSubmitting(true);
    try {
      await db.setSetting(getSleepTimerSettingKey(activeChild.id), JSON.stringify(nextSession));
      await refreshTimerSession();
      onSuccess("Nap timer started.");
    } catch {
      onError("Could not start the sleep timer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [activeChild, db, isSubmitting, onError, onSuccess, refreshTimerSession, timerSession]);

  const handleStopAndSaveTimer = useCallback(async () => {
    if (!activeChild || isSubmitting) return;

    if (!timerSession) {
      onError("Start the sleep timer first.");
      return;
    }

    const endedAt = getLocalTimestamp();
    if (new Date(endedAt).getTime() <= new Date(timerSession.startedAt).getTime()) {
      onError("Sleep timer needs to run for a little longer before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      await db.createSleepLog({
        child_id: activeChild.id,
        sleep_type: timerSession.sleepType,
        started_at: timerSession.startedAt,
        ended_at: endedAt,
        notes: timerSession.notes.trim() || null,
      });
      await db.setSetting(getSleepTimerSettingKey(activeChild.id), "");
      await onLogged();
      await refreshTimerSession();
      onSuccess("Sleep entry saved.");
    } catch {
      onError("Could not save the sleep entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [activeChild, db, isSubmitting, onError, onLogged, onSuccess, refreshTimerSession, timerSession]);

  const timerElapsedMs = timerSession ? getSleepTimerElapsedMs(timerSession, tick) : 0;

  return {
    timerSession,
    timerElapsedMs,
    timerClock: timerSession ? formatSleepTimerClock(timerElapsedMs) : null,
    isSubmitting,
    handleStartNapTimer,
    handleStopAndSaveTimer,
    refreshTimerSession,
  };
}
