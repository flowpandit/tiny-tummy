import { useCallback, useEffect, useState } from "react";
import { useVisibilityRefresh } from "./useVisibilityRefresh";
import { useDbClient } from "../contexts/DatabaseContext";
import type { SleepType } from "../lib/types";
import {
  getLocalTimestamp,
  getSleepTimerElapsedMs,
  getSleepTimerSettingKey,
  parseSleepTimerSession,
  type SleepTimerSession,
} from "../lib/sleep-timer";
import { combineLocalDateAndTimeToUtcIso, formatLocalDateKey, formatLocalTimeValue } from "../lib/utils";

function getDefaultManualWindow(): {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);

  return {
    startDate: formatLocalDateKey(start),
    startTime: formatLocalTimeValue(start),
    endDate: formatLocalDateKey(end),
    endTime: formatLocalTimeValue(end),
  };
}

type Mode = "manual" | "timer";

export function useSleepLogSheetState({
  open,
  childId,
  onLogged,
  onClose,
  onError,
  onSuccess,
}: {
  open: boolean;
  childId: string;
  onLogged: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const defaultWindow = getDefaultManualWindow();
  const [mode, setModeState] = useState<Mode>("manual");
  const [sleepType, setSleepType] = useState<SleepType>("nap");
  const [startDate, setStartDate] = useState(defaultWindow.startDate);
  const [startTime, setStartTime] = useState(defaultWindow.startTime);
  const [endDate, setEndDate] = useState(defaultWindow.endDate);
  const [endTime, setEndTime] = useState(defaultWindow.endTime);
  const [notes, setNotes] = useState("");
  const [timerSession, setTimerSession] = useState<SleepTimerSession | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetManualState = useCallback((session: SleepTimerSession | null) => {
    const manualWindow = getDefaultManualWindow();
    setModeState(session ? "timer" : "manual");
    setSleepType(session?.sleepType ?? "nap");
    setStartDate(manualWindow.startDate);
    setStartTime(manualWindow.startTime);
    setEndDate(manualWindow.endDate);
    setEndTime(manualWindow.endTime);
    setNotes(session?.notes ?? "");
    setTick(Date.now());
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    db.getSetting(getSleepTimerSettingKey(childId))
      .then((raw) => {
        if (cancelled) return;
        const session = parseSleepTimerSession(raw);
        setTimerSession(session);
        resetManualState(session);
      })
      .catch(() => {
        if (cancelled) return;
        setTimerSession(null);
        resetManualState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [childId, open, resetManualState]);

  useEffect(() => {
    if (!open || !timerSession) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open, timerSession]);

  useVisibilityRefresh(() => {
    if (!open) return;
    setTick(Date.now());
  }, open);

  const persistTimerSession = useCallback(async (session: SleepTimerSession | null) => {
    await db.setSetting(getSleepTimerSettingKey(childId), session ? JSON.stringify(session) : "");
  }, [childId]);

  const setMode = useCallback((value: Mode) => {
    setModeState((current) => {
      if (timerSession) {
        return "timer";
      }
      return value ?? current;
    });
  }, [timerSession]);

  const handleStartTimer = useCallback(async () => {
    const nextSession: SleepTimerSession = {
      sleepType,
      startedAt: getLocalTimestamp(),
      notes,
    };

    setTimerSession(nextSession);
    setTick(Date.now());
    await persistTimerSession(nextSession);
  }, [notes, persistTimerSession, sleepType]);

  const handleStopAndSaveTimer = useCallback(async () => {
    if (!timerSession || isSubmitting) return;

    const endedAt = getLocalTimestamp();
    if (new Date(endedAt).getTime() <= new Date(timerSession.startedAt).getTime()) {
      onError("Sleep timer needs to run for a little longer before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      await db.createSleepLog({
        child_id: childId,
        sleep_type: timerSession.sleepType,
        started_at: timerSession.startedAt,
        ended_at: endedAt,
        notes: timerSession.notes.trim() || null,
      });
      await persistTimerSession(null);
      setTimerSession(null);
      setNotes("");
      await onLogged();
      onSuccess("Sleep entry saved.");
      onClose();
    } catch {
      onError("Could not save the sleep entry. Please try again.");
    }
    setIsSubmitting(false);
  }, [childId, isSubmitting, onClose, onError, onLogged, onSuccess, persistTimerSession, timerSession]);

  const handleCancelTimer = useCallback(async () => {
    await persistTimerSession(null);
    setTimerSession(null);
    setNotes("");
    setModeState("manual");
  }, [persistTimerSession]);

  const handleSaveManual = useCallback(async () => {
    if (isSubmitting) return;

    const startedAt = combineLocalDateAndTimeToUtcIso(startDate, startTime);
    const endedAt = combineLocalDateAndTimeToUtcIso(endDate, endTime);

    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      onError("End time needs to be after the start time.");
      return false;
    }

    if (new Date(startedAt).getTime() > Date.now() || new Date(endedAt).getTime() > Date.now()) {
      onError("Sleep logs cannot be saved in the future.");
      return false;
    }

    setIsSubmitting(true);
    try {
      await db.createSleepLog({
        child_id: childId,
        sleep_type: sleepType,
        started_at: startedAt,
        ended_at: endedAt,
        notes: notes.trim() || null,
      });
      await onLogged();
      onSuccess("Sleep entry saved.");
      onClose();
      return true;
    } catch {
      onError("Could not save the sleep entry. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [childId, endDate, endTime, isSubmitting, notes, onClose, onError, onLogged, onSuccess, sleepType, startDate, startTime]);

  const handleTimerNotesChange = useCallback(async (value: string) => {
    setNotes(value);
    if (!timerSession) return;
    const nextSession = { ...timerSession, notes: value };
    setTimerSession(nextSession);
    await persistTimerSession(nextSession);
  }, [persistTimerSession, timerSession]);

  const timerElapsedMs = timerSession ? getSleepTimerElapsedMs(timerSession, tick) : 0;

  return {
    mode,
    setMode,
    sleepType,
    setSleepType,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    notes,
    setNotes,
    timerSession,
    timerElapsedMs,
    isSubmitting,
    handleStartTimer,
    handleStopAndSaveTimer,
    handleCancelTimer,
    handleSaveManual,
    handleTimerNotesChange,
  };
}
