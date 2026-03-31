import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";
import { cn } from "../../lib/cn";
import { getEpisodeTypeLabel } from "../../lib/episode-constants";
import {
  getSymptomSeverityBadgeVariant,
  getSymptomSeverityLabel,
  getSymptomTypeLabel,
  SYMPTOM_SEVERITIES,
  SYMPTOM_TYPES,
} from "../../lib/symptom-constants";
import * as db from "../../lib/db";
import type { Episode, SymptomSeverity, SymptomType } from "../../lib/types";

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

interface SymptomSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  activeEpisode: Episode | null;
  onLogged: () => Promise<void> | void;
}

export function SymptomSheet({
  open,
  onClose,
  childId,
  activeEpisode,
  onLogged,
}: SymptomSheetProps) {
  const { showError, showSuccess } = useToast();
  const [symptomType, setSymptomType] = useState<SymptomType | null>(null);
  const [severity, setSeverity] = useState<SymptomSeverity>("moderate");
  const [logDate, setLogDate] = useState(getCurrentDate());
  const [logTime, setLogTime] = useState(getCurrentTime());
  const [notes, setNotes] = useState("");
  const [linkToEpisode, setLinkToEpisode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSymptomType(null);
    setSeverity("moderate");
    setLogDate(getCurrentDate());
    setLogTime(getCurrentTime());
    setNotes("");
    setLinkToEpisode(!!activeEpisode);
  }, [open, activeEpisode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!symptomType || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const loggedAt = combineToISO(logDate, logTime);
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
      showSuccess("Symptom saved.");
      onClose();
    } catch {
      showError("Could not save the symptom. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          Log symptom
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Capture symptoms that matter for bowel patterns, handoff, and doctor visits.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Symptom
            </label>
            <div className="flex flex-col gap-2">
              {SYMPTOM_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSymptomType(item.value)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                    symptomType === item.value
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
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Severity
            </label>
            <div className="flex gap-2">
              {SYMPTOM_SEVERITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSeverity(item.value)}
                  className={cn(
                    "flex-1 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium transition-colors",
                    severity === item.value
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
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              When
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} />
              <TimePicker value={logTime} onChange={setLogTime} />
            </div>
          </div>

          <div>
            <label htmlFor="symptom-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Notes
            </label>
            <textarea
              id="symptom-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context, what happened, or what you noticed."
              rows={3}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          {activeEpisode && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Link to active episode</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    Add this symptom to {getEpisodeTypeLabel(activeEpisode.episode_type)} as well.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkToEpisode((current) => !current)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    linkToEpisode
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text-secondary)]",
                  )}
                >
                  {linkToEpisode ? "Linked" : "Not linked"}
                </button>
              </div>
              <div className="mt-3">
                <Badge variant={getSymptomSeverityBadgeVariant(severity)}>
                  {getSymptomSeverityLabel(severity)}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={!symptomType || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Symptom"}
        </Button>
      </form>
    </Sheet>
  );
}
