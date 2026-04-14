import { useCallback, useEffect, useRef, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { getCaregiverNoteSettingKey } from "../lib/caregiver-note";

export function useCaregiverNote(childId: string | null) {
  const db = useDbClient();
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setNote("");
      setSavedNote("");
      return;
    }

    try {
      const nextNote = await db.getSetting(getCaregiverNoteSettingKey(childId));
      if (requestId !== requestIdRef.current) return;
      const value = nextNote ?? "";
      setNote(value);
      setSavedNote(value);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setNote("");
      setSavedNote("");
    }
  }, [childId]);

  useEffect(() => {
    setNote("");
    setSavedNote("");
    void refresh();
  }, [childId, refresh]);

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
