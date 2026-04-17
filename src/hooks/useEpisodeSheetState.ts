import { useEffect, useRef, useState, useCallback } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, getLocalDateTimeParts } from "../lib/utils";
import type { Episode, EpisodeEventType, EpisodeType } from "../lib/types";

function getDefaultEventTitle(eventType: EpisodeEventType): string {
  if (eventType === "symptom") return "Symptom update";
  if (eventType === "hydration") return "Hydration update";
  if (eventType === "food") return "Food update";
  if (eventType === "intervention") return "Intervention update";
  return "Progress update";
}

export function useEpisodeSheetState({
  open, childId, activeEpisode, initialMode, onUpdated, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  activeEpisode: Episode | null;
  initialMode: "default" | "start" | "update";
  onUpdated: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
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
      await db.createEpisode({
        child_id: childId,
        episode_type: episodeType,
        started_at: combineLocalDateAndTimeToUtcIso(episodeDate, episodeTime),
        summary: summary.trim() || null,
      });
      await onUpdated();
      onSuccess("Episode started.");
      return true;
    } catch {
      onError("Could not start the episode. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [childId, episodeDate, episodeTime, episodeType, isSubmitting, onError, onSuccess, onUpdated, summary]);

  const handleAddEvent = useCallback(async () => {
    const trimmedTitle = eventTitle.trim();
    const trimmedNotes = eventNotes.trim();
    if (!activeEpisode || !eventType || (!trimmedTitle && !trimmedNotes) || isAddingEvent) return false;
    setIsAddingEvent(true);
    try {
      await db.createEpisodeEvent({
        episode_id: activeEpisode.id,
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
  }, [activeEpisode, childId, eventDate, eventNotes, eventTime, eventTitle, eventType, isAddingEvent, onError, onSuccess, onUpdated]);

  const handleResolveEpisode = useCallback(async () => {
    if (!activeEpisode || isResolving) return false;
    setIsResolving(true);
    try {
      await db.closeEpisode(activeEpisode.id, {
        ended_at: combineLocalDateAndTimeToUtcIso(resolutionDate, resolutionTime),
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
  }, [activeEpisode, isResolving, onClose, onError, onSuccess, onUpdated, outcome, resolutionDate, resolutionTime]);

  return {
    episodeType, setEpisodeType, episodeDate, setEpisodeDate, episodeTime, setEpisodeTime, summary, setSummary,
    eventType, setEventType, eventDate, setEventDate, eventTime, setEventTime, eventTitle, setEventTitle,
    eventNotes, setEventNotes, resolutionDate, setResolutionDate, resolutionTime, setResolutionTime, outcome,
    setOutcome, isSubmitting, isAddingEvent, isResolving, eventTitleRef, handleCreateEpisode, handleAddEvent,
    handleResolveEpisode,
  };
}
