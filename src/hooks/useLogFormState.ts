import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { savePhoto } from "../lib/photos";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import type { PoopLogDraft, StoolColor, StoolSize } from "../lib/types";

const EMPTY_DRAFT: PoopLogDraft = {
  stool_type: null,
  color: null,
  size: null,
  notes: "",
};

export function useLogFormState({
  open,
  childId,
  initialDraft,
  onLoggedSuccess,
  onError,
  resetPhoto,
  photoFile,
}: {
  open: boolean;
  childId: string;
  initialDraft?: Partial<PoopLogDraft> | null;
  onLoggedSuccess: () => void;
  onError: (message: string) => void;
  resetPhoto: () => void;
  photoFile: File | null;
}) {
  const db = useDbClient();
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [stoolType, setStoolType] = useState<number | null>(null);
  const [color, setColor] = useState<StoolColor | null>(null);
  const [size, setSize] = useState<StoolSize | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const applyDraft = useCallback((draft?: Partial<PoopLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setStoolType(nextDraft.stool_type);
    setColor(nextDraft.color);
    setSize(nextDraft.size);
    setNotes(nextDraft.notes);
    resetPhoto();
    setShowSuccess(false);
  }, [resetPhoto]);

  useEffect(() => {
    if (open) {
      applyDraft(initialDraft);
    }
  }, [applyDraft, initialDraft, open]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return false;
    setIsSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photoFile) {
        try { photoPath = await savePhoto(photoFile); } catch { photoPath = null; }
      }

      await db.createPoopLog({
        child_id: childId,
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        stool_type: stoolType,
        color,
        size,
        notes: notes.trim() || null,
        photo_path: photoPath,
      });
    } catch {
      setIsSubmitting(false);
      onError("Failed to save entry. Please try again.");
      return false;
    }

    setIsSubmitting(false);
    setShowSuccess(true);
    onLoggedSuccess();
    return true;
  }, [childId, color, isSubmitting, logDate, logTime, notes, onError, onLoggedSuccess, photoFile, size, stoolType]);

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
    isSubmitting,
    showSuccess,
    applyDraft,
    handleSubmit,
  };
}
