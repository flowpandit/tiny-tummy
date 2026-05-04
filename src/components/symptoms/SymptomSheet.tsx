import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";
import { useUnits } from "../../contexts/UnitsContext";
import { cn } from "../../lib/cn";
import { useSymptomSheetState } from "../../hooks/useSymptomSheetState";
import { getEpisodeTypeLabel } from "../../lib/episode-constants";
import {
  getSymptomSeverityBadgeVariant,
  getSymptomSeverityLabel,
  SYMPTOM_SEVERITIES,
  SYMPTOM_TYPES,
  TEMPERATURE_METHODS,
} from "../../lib/symptom-constants";
import { getTemperatureUnitLabel, parseTemperatureInputToCelsius } from "../../lib/units";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate } from "../../lib/utils";
import type { Episode, SymptomEntry } from "../../lib/types";

interface SymptomSheetProps extends SheetVisibilityProps {
  childId: string;
  childName?: string;
  childDateOfBirth?: string;
  activeEpisode?: Episode | null;
  activeEpisodes?: Episode[];
  episodeChoices?: Episode[];
  entry?: SymptomEntry | null;
  recentSymptoms?: SymptomEntry[];
  onLogged: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
}

const stickyFooterClassName = "sticky bottom-0 z-10 mt-6 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_28px_rgba(15,23,42,0.08)]";

function isUnderThreeMonths(dateOfBirth: string | undefined, referenceDate: Date) {
  if (!dateOfBirth) return false;
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;
  const threeMonths = new Date(birthDate);
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return referenceDate < threeMonths;
}

export function SymptomSheet({
  open,
  onClose,
  childId,
  childName,
  childDateOfBirth,
  activeEpisode = null,
  activeEpisodes,
  episodeChoices,
  entry = null,
  recentSymptoms = [],
  onLogged,
  onDeleted,
}: SymptomSheetProps) {
  const { showError, showSuccess } = useToast();
  const { temperatureUnit } = useUnits();
  const choices = episodeChoices ?? activeEpisodes ?? (activeEpisode ? [activeEpisode] : []);
  const {
    symptomType, setSymptomType, severity, setSeverity, logDate, setLogDate, logTime, setLogTime,
    temperature, setTemperature, temperatureMethod, setTemperatureMethod, notes, setNotes, linkToEpisode,
    setLinkToEpisode, selectedEpisodeId, setSelectedEpisodeId, useSymptomTimeAsEpisodeStart,
    setUseSymptomTimeAsEpisodeStart, isSubmitting, isDeleting, handleSubmit, handleDelete,
  } = useSymptomSheetState({
    open,
    childId,
    entry,
    episodeChoices: choices,
    recentSymptoms,
    temperatureUnit,
    onLogged,
    onDeleted,
    onClose,
    onError: showError,
    onSuccess: showSuccess,
  });
  const temperatureLabel = getTemperatureUnitLabel(temperatureUnit);
  const selectedEpisode = selectedEpisodeId
    ? choices.find((episode) => episode.id === selectedEpisodeId) ?? null
    : null;
  const parsedTemperatureCelsius = symptomType === "fever" && temperature.trim()
    ? parseTemperatureInputToCelsius(temperature, temperatureUnit)
    : null;
  const feverNeedsCareCopy = parsedTemperatureCelsius !== null
    && parsedTemperatureCelsius >= 38
    && isUnderThreeMonths(childDateOfBirth, new Date());
  const babyName = childName ?? "your baby";
  const isEditing = Boolean(entry);
  const linkedBeforeEpisodeStart = linkToEpisode && selectedEpisode
    ? new Date(combineLocalDateAndTimeToUtcIso(logDate, logTime)).getTime() < new Date(selectedEpisode.started_at).getTime()
    : false;

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSubmit(); }} className="flex min-h-full flex-col">
        <div className={cn("px-5", isEditing ? "pb-36" : "pb-28")}>
          <h2 className="mb-2 text-center text-lg font-semibold text-[var(--color-text)]">
            {isEditing ? "Edit symptom" : "Log symptom"}
          </h2>
          <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
            Capture what you noticed so it is easy to review or share with your doctor.
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
                <DatePicker value={logDate} onChange={setLogDate} max={getCurrentLocalDate()} />
                <TimePicker value={logTime} onChange={setLogTime} />
              </div>
            </div>

            {symptomType === "fever" && (
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="symptom-temperature" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Temperature
                  </label>
                  <div className="relative">
                    <input
                      id="symptom-temperature"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={temperature}
                      onChange={(event) => setTemperature(event.target.value)}
                      placeholder={temperatureUnit === "fahrenheit" ? "100.4" : "38.0"}
                      className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-14 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-[var(--color-text-secondary)]">
                      {temperatureLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                    Uses your Settings temperature preference.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
                    How was it taken?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPERATURE_METHODS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setTemperatureMethod(temperatureMethod === item.value ? null : item.value)}
                        className={cn(
                          "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors",
                          temperatureMethod === item.value
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {feverNeedsCareCopy && (
                  <p className="rounded-[var(--radius-md)] bg-[var(--color-alert)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--color-alert)]">
                    Because {babyName} is under 3 months, a temperature of 100.4 F / 38 C or higher is a reason to call your pediatrician now.
                  </p>
                )}
              </div>
            )}

            {severity === "severe" && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-alert)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--color-alert)]">
                Marked severe. If you are worried, symptoms worsen, or {babyName} seems unusually sleepy, has trouble breathing, has fewer wet diapers, or cannot keep fluids down, seek medical advice.
              </p>
            )}

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

            {choices.length > 0 && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {choices.length === 1 ? `Add this to ${getEpisodeTypeLabel(choices[0].episode_type)}?` : "Add this to an episode?"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Add this symptom to the active episode so the timeline stays together.
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
                    {linkToEpisode ? "Linked" : "Standalone"}
                  </button>
                </div>
                {linkToEpisode && choices.length > 1 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {choices.map((episode) => (
                      <button
                        key={episode.id}
                        type="button"
                        onClick={() => setSelectedEpisodeId(episode.id)}
                        className={cn(
                          "rounded-[var(--radius-md)] border px-3 py-2 text-left text-xs font-semibold transition-colors",
                          selectedEpisodeId === episode.id
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text-secondary)]",
                        )}
                      >
                        {getEpisodeTypeLabel(episode.episode_type)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Badge variant={getSymptomSeverityBadgeVariant(severity)}>
                    {getSymptomSeverityLabel(severity)}
                  </Badge>
                  {linkToEpisode && selectedEpisode && (
                    <span className="ml-2 text-xs font-medium text-[var(--color-text-secondary)]">
                      in {getEpisodeTypeLabel(selectedEpisode.episode_type)}
                    </span>
                  )}
                </div>
                {linkedBeforeEpisodeStart && (
                  <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-surface-strong)] px-3 py-2">
                    <p className="text-xs font-medium text-[var(--color-text)]">
                      This symptom is before the episode start.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUseSymptomTimeAsEpisodeStart(false)}
                        className={cn(
                          "min-h-8 flex-1 rounded-full border px-3 text-xs font-semibold",
                          !useSymptomTimeAsEpisodeStart
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                        )}
                      >
                        Keep as is
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseSymptomTimeAsEpisodeStart(true)}
                        className={cn(
                          "min-h-8 flex-1 rounded-full border px-3 text-xs font-semibold",
                          useSymptomTimeAsEpisodeStart
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                        )}
                      >
                        Use symptom time
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={stickyFooterClassName}>
          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={!symptomType || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save symptom"}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="danger"
              className="mt-3 w-full"
              disabled={isDeleting || isSubmitting}
              onClick={() => { void handleDelete(); }}
            >
              {isDeleting ? "Deleting..." : "Delete symptom"}
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
