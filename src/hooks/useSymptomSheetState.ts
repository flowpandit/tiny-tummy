import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { formatTemperatureValue, parseTemperatureInputToCelsius } from "../lib/units";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import type { Episode, SymptomSeverity, SymptomType, TemperatureUnit } from "../lib/types";

export function useSymptomSheetState({
  open, childId, activeEpisode, temperatureUnit, onLogged, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  activeEpisode: Episode | null;
  temperatureUnit: TemperatureUnit;
  onLogged: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const [symptomType, setSymptomType] = useState<SymptomType | null>(null);
  const [severity, setSeverity] = useState<SymptomSeverity>("moderate");
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [temperature, setTemperature] = useState("");
  const [notes, setNotes] = useState("");
  const [linkToEpisode, setLinkToEpisode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSymptomType(null);
    setSeverity("moderate");
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setTemperature("");
    setNotes("");
    setLinkToEpisode(Boolean(activeEpisode));
  }, [open, activeEpisode]);

  const handleSubmit = useCallback(async () => {
    if (!symptomType || isSubmitting) return false;

    const temperatureCelsius = symptomType === "fever" && temperature.trim()
      ? parseTemperatureInputToCelsius(temperature, temperatureUnit)
      : null;

    if (symptomType === "fever" && temperature.trim() && temperatureCelsius === null) {
      onError("Enter a valid temperature or leave it blank.");
      return false;
    }

    setIsSubmitting(true);
    try {
      const loggedAt = combineLocalDateAndTimeToUtcIso(logDate, logTime);
      const episodeId = linkToEpisode && activeEpisode ? activeEpisode.id : null;
      const temperatureLabel = symptomType === "fever" && temperatureCelsius !== null
        ? formatTemperatureValue(temperatureCelsius, temperatureUnit)
        : null;
      await db.createSymptomLog({
        child_id: childId,
        episode_id: episodeId,
        symptom_type: symptomType,
        severity,
        temperature_c: temperatureCelsius,
        logged_at: loggedAt,
        notes: notes.trim() || null,
      });
      if (episodeId) {
        await db.createEpisodeEvent({
          episode_id: episodeId,
          child_id: childId,
          event_type: "symptom",
          title: [getSymptomTypeLabel(symptomType), getSymptomSeverityLabel(severity), temperatureLabel].filter(Boolean).join(" · "),
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
  }, [activeEpisode, childId, db, isSubmitting, linkToEpisode, logDate, logTime, notes, onClose, onError, onLogged, onSuccess, severity, symptomType, temperature, temperatureUnit]);

  return {
    symptomType, setSymptomType, severity, setSeverity, logDate, setLogDate, logTime, setLogTime,
    temperature, setTemperature, notes, setNotes, linkToEpisode, setLinkToEpisode, isSubmitting, handleSubmit,
  };
}
