import { useEffect, useRef, useState, useCallback } from "react";
import { useRepositories } from "../contexts/DatabaseContext";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { formatTemperatureValue } from "../lib/units";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, getLocalDateTimeParts } from "../lib/utils";
import type { Episode, EpisodeEventType, EpisodeType, SymptomEntry, TemperatureUnit } from "../lib/types";

function getDefaultEventTitle(eventType: EpisodeEventType): string {
  if (eventType === "symptom") return "Symptom update";
  if (eventType === "temperature") return "Temperature update";
  if (eventType === "hydration") return "Hydration update";
  if (eventType === "food") return "Food update";
  if (eventType === "medication") return "Medication update";
  if (eventType === "intervention") return "Intervention update";
  return "Progress update";
}

export function useEpisodeSheetState({
  open, childId, activeEpisode, initialMode, recentSymptoms, temperatureUnit, onUpdated, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  activeEpisode: Episode | null;
  initialMode: "default" | "start" | "update";
  recentSymptoms?: SymptomEntry[];
  temperatureUnit: TemperatureUnit;
  onUpdated: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const { care } = useRepositories();
  const [episodeType, setEpisodeType] = useState<EpisodeType | null>(null);
  const [episodeDate, setEpisodeDate] = useState(getCurrentLocalDate());
  const [episodeTime, setEpisodeTime] = useState(getCurrentLocalTime());
  const [summary, setSummary] = useState("");
  const [eventType, setEventType] = useState<EpisodeEventType | null>("progress");
  const [eventDate, setEventDate] = useState(getCurrentLocalDate());
  const [eventTime, setEventTime] = useState(getCurrentLocalTime());
  const [eventTitle, setEventTitle] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [resolutionDate, setResolutionDate] = useState(getCurrentLocalDate());
  const [resolutionTime, setResolutionTime] = useState(getCurrentLocalTime());
  const [outcome, setOutcome] = useState("");
  const [linkedRecentSymptomIds, setLinkedRecentSymptomIds] = useState<string[]>([]);
  const [createdEpisode, setCreatedEpisode] = useState<Episode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const eventTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEpisodeType(null);
    const episodeParts = activeEpisode?.started_at ? getLocalDateTimeParts(activeEpisode.started_at) : null;
    setEpisodeDate(episodeParts?.date ?? getCurrentLocalDate());
    setEpisodeTime(episodeParts?.time ?? getCurrentLocalTime());
    setSummary("");
    setEventType("progress");
    setEventDate(getCurrentLocalDate());
    setEventTime(getCurrentLocalTime());
    setEventTitle("");
    setEventNotes("");
    setResolutionDate(getCurrentLocalDate());
    setResolutionTime(getCurrentLocalTime());
    setOutcome("");
    setLinkedRecentSymptomIds([]);
    setCreatedEpisode(null);
  }, [open, activeEpisode]);

  useEffect(() => {
    if (!open || !activeEpisode || initialMode !== "update") return;
    const timer = window.setTimeout(() => eventTitleRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, activeEpisode, initialMode]);

  const handleCreateEpisode = useCallback(async () => {
    if (!episodeType || isSubmitting) return false;
    setIsSubmitting(true);
    try {
      const episode = await care.startEpisodeWithLinkedSymptoms({
        episode: {
          child_id: childId,
          episode_type: episodeType,
          started_at: combineLocalDateAndTimeToUtcIso(episodeDate, episodeTime),
          summary: summary.trim() || null,
        },
        linkedSymptoms: linkedRecentSymptomIds
          .map((symptomId) => recentSymptoms?.find((item) => item.id === symptomId) ?? null)
          .filter((symptom): symptom is SymptomEntry => symptom !== null)
          .map((symptom) => ({
            symptom,
            eventTitle: [
              getSymptomTypeLabel(symptom.symptom_type),
              getSymptomSeverityLabel(symptom.severity),
              symptom.temperature_c !== null ? formatTemperatureValue(symptom.temperature_c, temperatureUnit) : null,
            ].filter(Boolean).join(" · "),
          })),
      });
      setCreatedEpisode(episode);
      await onUpdated();
      onSuccess("Episode started.");
      return episode;
    } catch {
      onError("Could not start the episode. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [care, childId, episodeDate, episodeTime, episodeType, isSubmitting, linkedRecentSymptomIds, onError, onSuccess, onUpdated, recentSymptoms, summary, temperatureUnit]);

  const handleAddEvent = useCallback(async () => {
    const trimmedTitle = eventTitle.trim();
    const trimmedNotes = eventNotes.trim();
    const currentEpisode = activeEpisode ?? createdEpisode;
    if (!currentEpisode || !eventType || (!trimmedTitle && !trimmedNotes) || isAddingEvent) return false;
    setIsAddingEvent(true);
    try {
      await care.addEpisodeEvent({
        episode_id: currentEpisode.id,
        child_id: childId,
        event_type: eventType,
        title: trimmedTitle || getDefaultEventTitle(eventType),
        notes: trimmedNotes || null,
        logged_at: combineLocalDateAndTimeToUtcIso(eventDate, eventTime),
      });
      setEventType("progress");
      setEventDate(getCurrentLocalDate());
      setEventTime(getCurrentLocalTime());
      setEventTitle("");
      setEventNotes("");
      await onUpdated();
      onSuccess("Episode update added.");
      return true;
    } catch {
      onError("Could not save the update. Please try again.");
      return false;
    } finally {
      setIsAddingEvent(false);
    }
  }, [activeEpisode, care, childId, createdEpisode, eventDate, eventNotes, eventTime, eventTitle, eventType, isAddingEvent, onError, onSuccess, onUpdated]);

  const handleResolveEpisode = useCallback(async () => {
    const currentEpisode = activeEpisode ?? createdEpisode;
    if (!currentEpisode || isResolving) return false;
    const endedAt = combineLocalDateAndTimeToUtcIso(resolutionDate, resolutionTime);
    if (new Date(endedAt).getTime() < new Date(currentEpisode.started_at).getTime()) {
      onError("Choose a resolution time after the episode started.");
      return false;
    }

    setIsResolving(true);
    try {
      await care.resolveEpisode(currentEpisode.id, {
        child_id: currentEpisode.child_id,
        ended_at: endedAt,
        outcome: outcome.trim() || null,
      });
      await onUpdated();
      onSuccess("Episode resolved.");
      onClose();
      return true;
    } catch {
      onError("Could not resolve the episode. Please try again.");
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [activeEpisode, care, createdEpisode, isResolving, onClose, onError, onSuccess, onUpdated, outcome, resolutionDate, resolutionTime]);

  return {
    episodeType, setEpisodeType, episodeDate, setEpisodeDate, episodeTime, setEpisodeTime, summary, setSummary,
    eventType, setEventType, eventDate, setEventDate, eventTime, setEventTime, eventTitle, setEventTitle,
    eventNotes, setEventNotes, resolutionDate, setResolutionDate, resolutionTime, setResolutionTime, outcome,
    setOutcome, linkedRecentSymptomIds, setLinkedRecentSymptomIds, isSubmitting, isAddingEvent, isResolving,
    currentEpisode: activeEpisode ?? createdEpisode, eventTitleRef, handleCreateEpisode, handleAddEvent,
    handleResolveEpisode,
  };
}
