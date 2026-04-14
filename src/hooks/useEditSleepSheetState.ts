import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { combineLocalDateAndTimeToUtcIso, getLocalDateTimeParts } from "../lib/utils";
import type { SleepEntry, SleepType } from "../lib/types";

export function useEditSleepSheetState({
  entry,
  open,
  onClose,
  onSaved,
  onDeleted,
  onError,
  onSuccess,
}: {
  entry: SleepEntry;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const startParts = getLocalDateTimeParts(entry.started_at);
  const endParts = getLocalDateTimeParts(entry.ended_at);
  const [sleepType, setSleepType] = useState<SleepType>(entry.sleep_type);
  const [startDate, setStartDate] = useState(startParts.date);
  const [startTime, setStartTime] = useState(startParts.time);
  const [endDate, setEndDate] = useState(endParts.date);
  const [endTime, setEndTime] = useState(endParts.time);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSleepType(entry.sleep_type);
    const nextStartParts = getLocalDateTimeParts(entry.started_at);
    const nextEndParts = getLocalDateTimeParts(entry.ended_at);
    setStartDate(nextStartParts.date);
    setStartTime(nextStartParts.time);
    setEndDate(nextEndParts.date);
    setEndTime(nextEndParts.time);
    setNotes(entry.notes ?? "");
    setIsSaving(false);
    setConfirmDelete(false);
  }, [entry, open]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const startedAt = combineLocalDateAndTimeToUtcIso(startDate, startTime);
    const endedAt = combineLocalDateAndTimeToUtcIso(endDate, endTime);

    if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
      onError("End time needs to be after the start time.");
      return;
    }

    setIsSaving(true);
    try {
      await db.updateSleepLog(entry.id, {
        sleep_type: sleepType,
        started_at: startedAt,
        ended_at: endedAt,
        notes: notes.trim() || null,
      });
      onSuccess("Sleep entry updated.");
      onSaved();
      onClose();
    } catch {
      onError("Could not save the sleep entry. Please try again.");
    }
    setIsSaving(false);
  }, [endDate, endTime, entry.id, isSaving, notes, onClose, onError, onSaved, onSuccess, sleepType, startDate, startTime]);

  const handleDelete = useCallback(async () => {
    try {
      await db.deleteSleepLog(entry.id);
      onSuccess("Sleep entry deleted.");
      onDeleted();
      onClose();
    } catch {
      onError("Could not delete the sleep entry. Please try again.");
    }
  }, [entry.id, onClose, onDeleted, onError, onSuccess]);

  return {
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
    isSaving,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
  };
}
