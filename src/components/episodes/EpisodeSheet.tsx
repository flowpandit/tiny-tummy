import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { cn } from "../../lib/cn";
import { EPISODE_EVENT_TYPES, EPISODE_TYPES, getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../../lib/episode-constants";
import { combineLocalDateAndTimeToUtcIso, formatDate, getCurrentLocalDate, getCurrentLocalTime, getLocalDateTimeParts } from "../../lib/utils";
import * as db from "../../lib/db";
import type { Episode, EpisodeEvent, EpisodeEventType, EpisodeType } from "../../lib/types";

function getEpisodeBadgeVariant(episodeType: EpisodeType) {
  if (episodeType === "constipation") return "caution";
  if (episodeType === "diarrhoea") return "alert";
  return "info";
}

function getDefaultEventTitle(eventType: EpisodeEventType): string {
  if (eventType === "symptom") return "Symptom update";
  if (eventType === "hydration") return "Hydration update";
  if (eventType === "food") return "Food update";
  if (eventType === "intervention") return "Intervention update";
  return "Progress update";
}

interface EpisodeSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  activeEpisode: Episode | null;
  events: EpisodeEvent[];
  onUpdated: () => Promise<void> | void;
  initialMode?: "default" | "start" | "update";
}

export function EpisodeSheet({
  open,
  onClose,
  childId,
  activeEpisode,
  events,
  onUpdated,
  initialMode = "default",
}: EpisodeSheetProps) {
  const { showError, showSuccess } = useToast();
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

    const timer = window.setTimeout(() => {
      eventTitleRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [open, activeEpisode, initialMode]);

  const handleCreateEpisode = async (e: FormEvent) => {
    e.preventDefault();
    if (!episodeType || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await db.createEpisode({
        child_id: childId,
        episode_type: episodeType,
        started_at: combineLocalDateAndTimeToUtcIso(episodeDate, episodeTime),
        summary: summary.trim() || null,
      });
      await onUpdated();
      showSuccess("Episode started.");
    } catch {
      showError("Could not start the episode. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleAddEvent = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = eventTitle.trim();
    const trimmedNotes = eventNotes.trim();
    if (!activeEpisode || !eventType || (!trimmedTitle && !trimmedNotes) || isAddingEvent) return;

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
      showSuccess("Episode update added.");
    } catch {
      showError("Could not save the update. Please try again.");
    }
    setIsAddingEvent(false);
  };

  const handleResolveEpisode = async () => {
    if (!activeEpisode || isResolving) return;

    setIsResolving(true);
    try {
      await db.closeEpisode(activeEpisode.id, {
        ended_at: combineLocalDateAndTimeToUtcIso(resolutionDate, resolutionTime),
        outcome: outcome.trim() || null,
      });
      await onUpdated();
      showSuccess("Episode resolved.");
      onClose();
    } catch {
      showError("Could not resolve the episode. Please try again.");
    }
    setIsResolving(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        {!activeEpisode ? (
          <form onSubmit={handleCreateEpisode}>
            <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
              Start Episode
            </h2>
            <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
              Track a problem across multiple days instead of scattered notes.
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Episode type
                </label>
                <div className="flex flex-col gap-2">
                  {EPISODE_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setEpisodeType(item.value)}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                        episodeType === item.value
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]",
                      )}
                    >
                      <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  When did this start?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={episodeDate} onChange={setEpisodeDate} max={getCurrentLocalDate()} />
                  <TimePicker value={episodeTime} onChange={setEpisodeTime} />
                </div>
              </div>

              <div>
                <label htmlFor="episode-summary" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Summary
                </label>
                <textarea
                  id="episode-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Hard stools and straining since starting more solids."
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>

            <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={!episodeType || isSubmitting}>
              {isSubmitting ? "Starting..." : "Start Episode"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
                    {initialMode === "update" ? "Add Episode Update" : "Manage Episode"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {initialMode === "update"
                      ? "Capture the latest change without digging through the full flow."
                      : "Keep a clean timeline of what changed and what helped."}
                  </p>
                </div>
                <Badge variant={getEpisodeBadgeVariant(activeEpisode.episode_type)}>
                  {getEpisodeTypeLabel(activeEpisode.episode_type)}
                </Badge>
              </div>
            </div>

            <Card>
              <CardContent className="py-4">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Started {formatDate(activeEpisode.started_at)}
                </p>
                {activeEpisode.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {activeEpisode.summary}
                  </p>
                )}
              </CardContent>
            </Card>

            <form onSubmit={handleAddEvent} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Update type
                </label>
                <div className="flex flex-wrap gap-2">
                  {EPISODE_EVENT_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setEventType(item.value)}
                      className={cn(
                        "h-10 rounded-[var(--radius-md)] border px-4 text-sm font-medium transition-colors",
                        eventType === item.value
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="episode-event-title" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  What happened?
                </label>
                <input
                  ref={eventTitleRef}
                  id="episode-event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Tried pears, passed small hard stool, gave extra water"
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  Short title optional if you add notes below. We will fill a default label from the update type.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  When
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={eventDate} onChange={setEventDate} max={getCurrentLocalDate()} />
                  <TimePicker value={eventTime} onChange={setEventTime} />
                </div>
              </div>

              <div>
                <label htmlFor="episode-event-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Extra notes
                </label>
                <textarea
                  id="episode-event-notes"
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Optional details for later."
                  rows={2}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={(!eventTitle.trim() && !eventNotes.trim()) || !eventType || isAddingEvent}
              >
                {isAddingEvent ? "Saving..." : "Add Update"}
              </Button>
            </form>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Episode timeline</p>
              {events.length === 0 ? (
                <Card>
                  <CardContent className="py-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      No updates yet. Add symptoms, hydration, foods, or progress notes here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">{event.title}</p>
                            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                              {getEpisodeEventTypeLabel(event.event_type)} · {formatDate(event.logged_at)}
                            </p>
                          </div>
                        </div>
                        {event.notes && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {event.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-text)]">Resolve episode</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Add the outcome when things settle down so the story is complete.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <DatePicker value={resolutionDate} onChange={setResolutionDate} max={getCurrentLocalDate()} />
                <TimePicker value={resolutionTime} onChange={setResolutionTime} />
              </div>

              <div className="mt-4">
                <label htmlFor="episode-outcome" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Outcome
                </label>
                <textarea
                  id="episode-outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Softer stool after pears and extra water."
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              <Button variant="cta" className="mt-4 w-full" onClick={handleResolveEpisode} disabled={isResolving}>
                {isResolving ? "Resolving..." : "Resolve Episode"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
