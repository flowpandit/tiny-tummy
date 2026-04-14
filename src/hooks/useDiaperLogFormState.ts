import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { diaperIncludesStool, diaperIncludesWet } from "../lib/diaper";
import { savePhoto } from "../lib/photos";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import type { DiaperLogDraft, DiaperType, StoolColor, StoolSize, UrineColor } from "../lib/types";

const EMPTY_DRAFT: DiaperLogDraft = {
  diaper_type: null,
  urine_color: null,
  stool_type: null,
  color: null,
  size: null,
  notes: "",
};

export function useDiaperLogFormState({
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
  initialDraft?: Partial<DiaperLogDraft> | null;
  onLoggedSuccess: () => void;
  onError: (message: string) => void;
  resetPhoto: () => void;
  photoFile: File | null;
}) {
  const db = useDbClient();
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [diaperType, setDiaperType] = useState<DiaperType | null>(null);
  const [urineColor, setUrineColor] = useState<UrineColor | null>(null);
  const [stoolType, setStoolType] = useState<number | null>(null);
  const [color, setColor] = useState<StoolColor | null>(null);
  const [size, setSize] = useState<StoolSize | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const applyDraft = useCallback((draft?: Partial<DiaperLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setDiaperType(nextDraft.diaper_type);
    setUrineColor(nextDraft.urine_color);
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
    if (isSubmitting || !diaperType) return false;
    setIsSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photoFile) {
        try { photoPath = await savePhoto(photoFile); } catch { photoPath = null; }
      }

      await db.createDiaperLog({
        child_id: childId,
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        diaper_type: diaperType,
        urine_color: diaperIncludesWet(diaperType) ? urineColor : null,
        stool_type: diaperIncludesStool(diaperType) ? stoolType : null,
        color: diaperIncludesStool(diaperType) ? color : null,
        size: diaperIncludesStool(diaperType) ? size : null,
        notes: notes.trim() || null,
        photo_path: photoPath,
      });
    } catch {
      setIsSubmitting(false);
      onError("Failed to save diaper log. Please try again.");
      return false;
    }

    setIsSubmitting(false);
    setShowSuccess(true);
    onLoggedSuccess();
    return true;
  }, [childId, color, diaperType, isSubmitting, logDate, logTime, notes, onError, onLoggedSuccess, photoFile, size, stoolType, urineColor]);

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
    isSubmitting,
    showSuccess,
    handleSubmit,
  };
}
