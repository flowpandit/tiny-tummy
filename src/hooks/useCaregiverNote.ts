import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";
import { getCaregiverNoteSettingKey } from "../lib/caregiver-note";

export function useCaregiverNote(childId: string | null) {
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setNote("");
      setSavedNote("");
      return;
    }

    try {
      const nextNote = await db.getSetting(getCaregiverNoteSettingKey(childId));
      const value = nextNote ?? "";
      setNote(value);
      setSavedNote(value);
    } catch {
      setNote("");
      setSavedNote("");
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async () => {
    if (!childId) return "";

    setIsSaving(true);
    const trimmed = note.trim();
    try {
      await db.setSetting(getCaregiverNoteSettingKey(childId), trimmed);
      setNote(trimmed);
      setSavedNote(trimmed);
      return trimmed;
    } finally {
      setIsSaving(false);
    }
  }, [childId, note]);

  const reset = useCallback(() => {
    setNote(savedNote);
  }, [savedNote]);

  return {
    note,
    setNote,
    savedNote,
    isSaving,
    hasChanges: note.trim() !== savedNote.trim(),
    save,
    reset,
    refresh,
  };
}
