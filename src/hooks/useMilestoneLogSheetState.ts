import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import type { MilestoneType } from "../lib/types";

export function useMilestoneLogSheetState({
  open, childId, onLogged, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  onLogged: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [milestoneType, setMilestoneType] = useState<MilestoneType>("started_solids");
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMilestoneType("started_solids");
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setNotes("");
    setIsSubmitting(false);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return false;
    setIsSubmitting(true);
    try {
      await db.createMilestoneLog({
        child_id: childId,
        milestone_type: milestoneType,
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        notes: notes.trim() || null,
      });
      await onLogged();
      onSuccess("Milestone saved.");
      onClose();
      return true;
    } catch {
      onError("Could not save the milestone. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [childId, isSubmitting, logDate, logTime, milestoneType, notes, onClose, onError, onLogged, onSuccess]);

  return { milestoneType, setMilestoneType, logDate, setLogDate, logTime, setLogTime, notes, setNotes, isSubmitting, handleSubmit };
}
