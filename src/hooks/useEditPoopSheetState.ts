import { useCallback, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { combineLocalDateAndTimeToUtcIso, getLocalDateTimeParts } from "../lib/utils";
import type { PoopEntry, StoolColor, StoolSize } from "../lib/types";

export function useEditPoopSheetState({
  entry,
  onClose,
  onSaved,
  onDeleted,
  onError,
}: {
  entry: PoopEntry;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const db = useDbClient();
  const entryLoggedAt = getLocalDateTimeParts(entry.logged_at);
  const [logDate, setLogDate] = useState(entryLoggedAt.date);
  const [logTime, setLogTime] = useState(entryLoggedAt.time);
  const [stoolType, setStoolType] = useState<number | null>(entry.stool_type);
  const [color, setColor] = useState<StoolColor | null>(entry.color);
  const [size, setSize] = useState<StoolSize | null>(entry.size);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await db.updatePoopLog(entry.id, {
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        stool_type: stoolType,
        color,
        size,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {
      onError("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  }, [color, entry.id, logDate, logTime, notes, onClose, onError, onSaved, size, stoolType]);

  const handleDelete = useCallback(async () => {
    try {
      await db.deletePoopLog(entry);
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
