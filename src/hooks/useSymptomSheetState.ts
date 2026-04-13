import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/db";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import type { Episode, SymptomSeverity, SymptomType } from "../lib/types";

export function useSymptomSheetState({
  open, childId, activeEpisode, onLogged, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  activeEpisode: Episode | null;
  onLogged: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [symptomType, setSymptomType] = useState<SymptomType | null>(null);
  const [severity, setSeverity] = useState<SymptomSeverity>("moderate");
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [notes, setNotes] = useState("");
  const [linkToEpisode, setLinkToEpisode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymptomType(null);
    setSeverity("moderate");
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setNotes("");
    setLinkToEpisode(Boolean(activeEpisode));
  }, [open, activeEpisode]);

  const handleSubmit = useCallback(async () => {
    if (!symptomType || isSubmitting) return false;
    setIsSubmitting(true);
    try {
      const loggedAt = combineLocalDateAndTimeToUtcIso(logDate, logTime);
      const episodeId = linkToEpisode && activeEpisode ? activeEpisode.id : null;
      await db.createSymptomLog({
        child_id: childId,
        episode_id: episodeId,
        symptom_type: symptomType,
        severity,
        logged_at: loggedAt,
        notes: notes.trim() || null,
      });
      if (episodeId) {
        await db.createEpisodeEvent({
          episode_id: episodeId,
          child_id: childId,
          event_type: "symptom",
          title: `${getSymptomTypeLabel(symptomType)} · ${getSymptomSeverityLabel(severity)}`,
          notes: notes.trim() || null,
          logged_at: loggedAt,
        });
      }
      await onLogged();
      onSuccess("Symptom saved.");
      onClose();
      return true;
    } catch {
      onError("Could not save the symptom. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [activeEpisode, childId, isSubmitting, linkToEpisode, logDate, logTime, notes, onClose, onError, onLogged, onSuccess, severity, symptomType]);

  return {
    symptomType, setSymptomType, severity, setSeverity, logDate, setLogDate, logTime, setLogTime,
    notes, setNotes, linkToEpisode, setLinkToEpisode, isSubmitting, handleSubmit,
  };
}
