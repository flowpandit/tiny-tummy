import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { useUnits } from "../../contexts/UnitsContext";
import { useEpisodeSheetState } from "../../hooks/useEpisodeSheetState";
import { cn } from "../../lib/cn";
import { EPISODE_EVENT_TYPES, EPISODE_TYPES, getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../../lib/episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "../../lib/symptom-constants";
import { formatTemperatureValue } from "../../lib/units";
import { formatDate, getCurrentLocalDate } from "../../lib/utils";
import type { Episode, EpisodeEvent, EpisodeType, SymptomEntry } from "../../lib/types";

function getEpisodeBadgeVariant(episodeType: EpisodeType) {
  if (episodeType === "fever_illness" || episodeType === "stomach_bug" || episodeType === "vomiting" || episodeType === "medication_reaction") return "alert";
  if (episodeType === "constipation") return "caution";
  if (episodeType === "diarrhoea") return "alert";
  return "info";
}

const stickyFooterClassName = "sticky bottom-0 z-10 mt-6 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_28px_rgba(15,23,42,0.08)]";
const insetStickyFooterClassName = "sticky bottom-0 z-10 -mx-5 mt-1 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_28px_rgba(15,23,42,0.08)]";

interface EpisodeSheetProps extends SheetVisibilityProps {
  childId: string;
  activeEpisode: Episode | null;
  events: EpisodeEvent[];
  recentSymptoms?: SymptomEntry[];
  onUpdated: () => Promise<void> | void;
  initialMode?: "default" | "start" | "update";
}

export function EpisodeSheet({
  open,
  onClose,
  childId,
  activeEpisode,
  events,
  recentSymptoms = [],
  onUpdated,
  initialMode = "default",
}: EpisodeSheetProps) {
  const { showError, showSuccess } = useToast();
  const { temperatureUnit } = useUnits();
  const {
    episodeType, setEpisodeType, episodeDate, setEpisodeDate, episodeTime, setEpisodeTime, summary, setSummary,
    eventType, setEventType, eventDate, setEventDate, eventTime, setEventTime, eventTitle, setEventTitle,
    eventNotes, setEventNotes, resolutionDate, setResolutionDate, resolutionTime, setResolutionTime, outcome,
    setOutcome, linkedRecentSymptomIds, setLinkedRecentSymptomIds, isSubmitting, isAddingEvent, isResolving,
    currentEpisode, eventTitleRef, handleCreateEpisode, handleAddEvent, handleResolveEpisode,
  } = useEpisodeSheetState({
    open, childId, activeEpisode, initialMode, recentSymptoms, temperatureUnit, onUpdated, onClose,
    onError: showError, onSuccess: showSuccess,
  });
  const isStartingEpisode = (initialMode === "start" || !currentEpisode) && !currentEpisode;
  const linkableRecentSymptoms = recentSymptoms
    .filter((symptom) => {
      if (symptom.episode_id) return false;
      const loggedAt = new Date(symptom.logged_at).getTime();
      return Number.isFinite(loggedAt) && Date.now() - loggedAt <= 24 * 60 * 60 * 1000;
    })
    .slice(0, 4);
  const linkedSymptomCount = currentEpisode
    ? recentSymptoms.filter((symptom) => symptom.episode_id === currentEpisode.id).length
    : 0;
  const visibleEvents = currentEpisode
    ? events.filter((event) => event.episode_id === currentEpisode.id)
    : events;
  const latestUpdate = visibleEvents[0] ?? null;
  const isResolved = currentEpisode?.status === "resolved";

  if (!isStartingEpisode && !currentEpisode) return null;

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="min-h-full">
        {isStartingEpisode ? (
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void handleCreateEpisode(); }} className="flex min-h-full flex-col">
            <div className="px-5 pb-28">
              <h2 className="mb-2 text-center text-lg font-semibold text-[var(--color-text)]">
                Start episode
              </h2>
              <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
                Track a health concern across multiple days instead of scattered notes.
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
                    placeholder="e.g. Fever started overnight with lower appetite."
                    rows={3}
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>

                {linkableRecentSymptoms.length > 0 && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-text)]">Link recent symptoms</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      Optional. Add recent standalone symptoms so the episode starts with useful context.
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {linkableRecentSymptoms.map((symptom) => {
                        const selected = linkedRecentSymptomIds.includes(symptom.id);
                        const detail = [
                          getSymptomSeverityLabel(symptom.severity),
                          symptom.temperature_c !== null ? formatTemperatureValue(symptom.temperature_c, temperatureUnit) : null,
                          formatDate(symptom.logged_at),
                        ].filter(Boolean).join(" · ");

                        return (
                          <button
                            key={symptom.id}
                            type="button"
                            onClick={() => setLinkedRecentSymptomIds((current) => (
                              selected
                                ? current.filter((id) => id !== symptom.id)
                                : [...current, symptom.id]
                            ))}
                            className={cn(
                              "rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors",
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                                : "border-[var(--color-border)] bg-[var(--color-surface-strong)]",
                            )}
                          >
                            <span className="block text-sm font-medium text-[var(--color-text)]">
                              {getSymptomTypeLabel(symptom.symptom_type)}
                            </span>
                            <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
                              {detail}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={stickyFooterClassName}>
              <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!episodeType || isSubmitting}>
                {isSubmitting ? "Starting..." : "Start episode"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5 px-5 pb-8">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text)]">
                    {initialMode === "update" ? "Add episode update" : "Manage episode"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {initialMode === "update"
                      ? "Capture the latest change without digging through the full flow."
                      : "Keep a clean timeline of what changed and what helped."}
                  </p>
                </div>
                <Badge variant={getEpisodeBadgeVariant(currentEpisode.episode_type)}>
                  {getEpisodeTypeLabel(currentEpisode.episode_type)}
                </Badge>
              </div>
            </div>

            <Card>
              <CardContent className="py-4">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Started {formatDate(currentEpisode.started_at)}
                </p>
                {currentEpisode.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {currentEpisode.summary}
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-soft)]">
                  {[`${linkedSymptomCount} linked symptom${linkedSymptomCount === 1 ? "" : "s"}`, latestUpdate ? `Latest: ${latestUpdate.title}` : null].filter(Boolean).join(" · ")}
                </p>
              </CardContent>
            </Card>

            {!isResolved && (
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); void handleAddEvent(); }} className="flex flex-col">
              <div className="flex flex-col gap-4 pb-24">
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
                    placeholder="e.g. Temperature lower, gave medicine, drank more fluids"
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
              </div>

              <div className={insetStickyFooterClassName}>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={(!eventTitle.trim() && !eventNotes.trim()) || !eventType || isAddingEvent}
                >
                  {isAddingEvent ? "Saving..." : "Add update"}
                </Button>
              </div>
            </form>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Episode timeline</p>
              {visibleEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      No updates yet. Add symptoms, temperature, fluids, food, medicine, or progress as things change.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {visibleEvents.map((event) => (
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

            {isResolved ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Resolved {currentEpisode.ended_at ? formatDate(currentEpisode.ended_at) : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  Resolved episodes stay read-only here so the timeline remains clear.
                </p>
                {currentEpisode.outcome && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {currentEpisode.outcome}
                  </p>
                )}
              </div>
            ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-text)]">Resolve episode</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Add what changed so the story is complete for later.
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
                  placeholder="e.g. Fever settled, appetite back, no new symptoms."
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              <Button variant="cta" className="mt-4 w-full" onClick={handleResolveEpisode} disabled={isResolving}>
                {isResolving ? "Resolving..." : "Resolve episode"}
              </Button>
            </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
