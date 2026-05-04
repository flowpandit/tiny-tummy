import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { getEpisodeTypeLabel } from "../lib/episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { formatTemperatureValue, parseTemperatureInputToCelsius } from "../lib/units";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, getLocalDateTimeParts } from "../lib/utils";
import type { Episode, SymptomEntry, SymptomSeverity, SymptomType, TemperatureMethod, TemperatureUnit } from "../lib/types";

const RECENT_SYMPTOM_WINDOW_MS = 72 * 60 * 60 * 1000;

function buildSymptomEventTitle({
  symptomType,
  severity,
  temperatureCelsius,
  temperatureUnit,
}: {
  symptomType: SymptomType;
  severity: SymptomSeverity;
  temperatureCelsius: number | null;
  temperatureUnit: TemperatureUnit;
}) {
  const temperatureLabel = temperatureCelsius !== null
    ? formatTemperatureValue(temperatureCelsius, temperatureUnit)
    : null;

  return [getSymptomTypeLabel(symptomType), getSymptomSeverityLabel(severity), temperatureLabel].filter(Boolean).join(" · ");
}

function shouldSuggestEpisode({
  symptomType,
  severity,
  loggedAt,
  recentSymptoms,
}: {
  symptomType: SymptomType;
  severity: SymptomSeverity;
  loggedAt: string;
  recentSymptoms: SymptomEntry[];
}) {
  if (severity === "severe") return true;

  const loggedTime = new Date(loggedAt).getTime();
  if (!Number.isFinite(loggedTime)) return false;

  const repeatedCount = recentSymptoms.filter((symptom) => {
    const symptomTime = new Date(symptom.logged_at).getTime();
    return symptom.symptom_type === symptomType
      && Number.isFinite(symptomTime)
      && Math.abs(loggedTime - symptomTime) <= RECENT_SYMPTOM_WINDOW_MS;
  }).length + 1;

  return repeatedCount >= 2;
}

export function useSymptomSheetState({
  open, childId, entry, episodeChoices, recentSymptoms, temperatureUnit, onLogged, onDeleted, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  entry?: SymptomEntry | null;
  episodeChoices: Episode[];
  recentSymptoms?: SymptomEntry[];
  temperatureUnit: TemperatureUnit;
  onLogged: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
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
  const [temperatureMethod, setTemperatureMethod] = useState<TemperatureMethod | null>(null);
  const [notes, setNotes] = useState("");
  const [linkToEpisode, setLinkToEpisode] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [useSymptomTimeAsEpisodeStart, setUseSymptomTimeAsEpisodeStart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      const parts = getLocalDateTimeParts(entry.logged_at);
      setSymptomType(entry.symptom_type);
      setSeverity(entry.severity);
      setLogDate(parts.date);
      setLogTime(parts.time);
      setTemperature(entry.temperature_c !== null ? formatTemperatureValue(entry.temperature_c, temperatureUnit).replace(/[^\d.]/g, "") : "");
      setTemperatureMethod(entry.temperature_method);
      setNotes(entry.notes ?? "");
      setLinkToEpisode(Boolean(entry.episode_id));
      setSelectedEpisodeId(entry.episode_id ?? episodeChoices[0]?.id ?? null);
      setUseSymptomTimeAsEpisodeStart(false);
      return;
    }

    setSymptomType(null);
    setSeverity("moderate");
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setTemperature("");
    setTemperatureMethod(null);
    setNotes("");
    setLinkToEpisode(episodeChoices.length > 0);
    setSelectedEpisodeId(episodeChoices[0]?.id ?? null);
    setUseSymptomTimeAsEpisodeStart(false);
  }, [open, entry, episodeChoices, temperatureUnit]);

  const handleSubmit = useCallback(async () => {
    if (!symptomType || isSubmitting) return false;

    if (symptomType === "other" && notes.trim().length < 3) {
      onError("Add a short note for other symptoms.");
      return false;
    }

    const temperatureCelsius = symptomType === "fever" && temperature.trim()
      ? parseTemperatureInputToCelsius(temperature, temperatureUnit)
      : null;
    const nextTemperatureMethod = symptomType === "fever" && temperatureCelsius !== null
      ? temperatureMethod
      : null;

    if (symptomType === "fever" && temperature.trim() && temperatureCelsius === null) {
      onError("Enter a valid temperature or leave it blank.");
      return false;
    }

    if (linkToEpisode && !selectedEpisodeId) {
      onError("Choose an episode or save this symptom as standalone.");
      return false;
    }

    setIsSubmitting(true);
    try {
      const loggedAt = combineLocalDateAndTimeToUtcIso(logDate, logTime);
      const episodeId = linkToEpisode ? selectedEpisodeId : null;
      const eventTitle = buildSymptomEventTitle({
        symptomType,
        severity,
        temperatureCelsius,
        temperatureUnit,
      });

      const selectedEpisode = episodeId
        ? episodeChoices.find((episode) => episode.id === episodeId) ?? null
        : null;
      const loggedBeforeEpisode = selectedEpisode
        ? new Date(loggedAt).getTime() < new Date(selectedEpisode.started_at).getTime()
        : false;

      if (episodeId && useSymptomTimeAsEpisodeStart && loggedBeforeEpisode) {
        await db.updateEpisode(episodeId, { started_at: loggedAt });
      }

      if (entry) {
        await db.updateSymptomLog(entry.id, {
          episode_id: episodeId,
          symptom_type: symptomType,
          severity,
          temperature_c: temperatureCelsius,
          temperature_method: nextTemperatureMethod,
          logged_at: loggedAt,
          notes: notes.trim() || null,
        });
        await db.deleteGeneratedSymptomEpisodeEvent({
          symptomId: entry.id,
          episodeId: entry.episode_id,
          loggedAt: entry.logged_at,
        });
        if (episodeId) {
          await db.createEpisodeEvent({
            episode_id: episodeId,
            child_id: childId,
            event_type: "symptom",
            title: eventTitle,
            notes: notes.trim() || null,
            logged_at: loggedAt,
            source_kind: "symptom",
            source_id: entry.id,
          });
        }
      } else {
        const symptom = await db.createSymptomLog({
          child_id: childId,
          episode_id: episodeId,
          symptom_type: symptomType,
          severity,
          temperature_c: temperatureCelsius,
          temperature_method: nextTemperatureMethod,
          logged_at: loggedAt,
          notes: notes.trim() || null,
        });
        if (episodeId) {
          await db.createEpisodeEvent({
            episode_id: episodeId,
            child_id: childId,
            event_type: "symptom",
            title: eventTitle,
            notes: notes.trim() || null,
            logged_at: loggedAt,
            source_kind: "symptom",
            source_id: symptom.id,
          });
        }
      }

      if (episodeId) {
        const episodeType = episodeChoices.find((episode) => episode.id === episodeId)?.episode_type;
        const episodeLabel = episodeType ? getEpisodeTypeLabel(episodeType) : null;
        onSuccess(entry
          ? episodeLabel ? `Symptom updated in ${episodeLabel}.` : "Symptom updated in episode."
          : episodeLabel ? `Symptom saved to ${episodeLabel}.` : "Symptom saved to episode.");
      } else if (!entry && shouldSuggestEpisode({
        symptomType,
        severity,
        loggedAt,
        recentSymptoms: recentSymptoms ?? [],
      })) {
        onSuccess("Symptom saved. Want to keep these together? Start an episode from Health.");
      } else {
        onSuccess(entry ? "Symptom updated." : "Symptom saved.");
      }
      await onLogged();
      onClose();
      return true;
    } catch {
      onError(entry ? "Could not update the symptom. Please try again." : "Could not save the symptom. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [childId, db, entry, episodeChoices, isSubmitting, linkToEpisode, logDate, logTime, notes, onClose, onError, onLogged, onSuccess, recentSymptoms, selectedEpisodeId, severity, symptomType, temperature, temperatureMethod, temperatureUnit, useSymptomTimeAsEpisodeStart]);

  const handleDelete = useCallback(async () => {
    if (!entry || isDeleting) return false;

    setIsDeleting(true);
    try {
      await db.deleteGeneratedSymptomEpisodeEvent({
        symptomId: entry.id,
        episodeId: entry.episode_id,
        loggedAt: entry.logged_at,
      });
      await db.deleteSymptomLog(entry.id);
      await onDeleted?.();
      await onLogged();
      onSuccess("Symptom deleted.");
      onClose();
      return true;
    } catch {
      onError("Could not delete the symptom. Please try again.");
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [db, entry, isDeleting, onClose, onDeleted, onError, onLogged, onSuccess]);

  return {
    symptomType, setSymptomType, severity, setSeverity, logDate, setLogDate, logTime, setLogTime,
    temperature, setTemperature, temperatureMethod, setTemperatureMethod, notes, setNotes, linkToEpisode,
    setLinkToEpisode, selectedEpisodeId, setSelectedEpisodeId, useSymptomTimeAsEpisodeStart,
    setUseSymptomTimeAsEpisodeStart, isSubmitting, isDeleting, handleSubmit, handleDelete,
  };
}
