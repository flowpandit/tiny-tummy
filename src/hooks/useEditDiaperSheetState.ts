import { useCallback, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { diaperIncludesStool, diaperIncludesWet } from "../lib/diaper";
import { combineLocalDateAndTimeToUtcIso, getLocalDateTimeParts } from "../lib/utils";
import type { DiaperEntry, DiaperType, StoolColor, StoolSize, UrineColor } from "../lib/types";

export function useEditDiaperSheetState({
  entry,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  entry: DiaperEntry;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const db = useDbClient();
  const entryLoggedAt = getLocalDateTimeParts(entry.logged_at);
  const [logDate, setLogDate] = useState(entryLoggedAt.date);
  const [logTime, setLogTime] = useState(entryLoggedAt.time);
  const [diaperType, setDiaperType] = useState<DiaperType>(entry.diaper_type);
  const [urineColor, setUrineColor] = useState<UrineColor | null>(entry.urine_color);
  const [stoolType, setStoolType] = useState<number | null>(entry.stool_type);
  const [color, setColor] = useState<StoolColor | null>(entry.color);
  const [size, setSize] = useState<StoolSize | null>(entry.size);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await db.updateDiaperLog(entry.id, {
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        diaper_type: diaperType,
        urine_color: diaperIncludesWet(diaperType) ? urineColor : null,
        stool_type: diaperIncludesStool(diaperType) ? stoolType : null,
        color: diaperIncludesStool(diaperType) ? color : null,
        size: diaperIncludesStool(diaperType) ? size : null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {
      onError("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  }, [color, diaperType, entry.id, logDate, logTime, notes, onClose, onError, onSaved, size, stoolType, urineColor]);

  const handleDelete = useCallback(async () => {
    try {
      await db.deleteDiaperLog(entry);
      onDeleted();
      onClose();
    } catch {
      onError("Failed to delete. Please try again.");
    }
  }, [entry, onClose, onDeleted, onError]);

  return {
    logDate,
    setLogDate,
    logTime,
    setLogTime,
    diaperType,
    setDiaperType,
    urineColor,
    setUrineColor,
    stoolType,
    setStoolType,
    color,
    setColor,
    size,
    setSize,
    notes,
    setNotes,
    isSaving,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
  };
}
