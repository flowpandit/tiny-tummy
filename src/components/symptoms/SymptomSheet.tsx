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
} from "../../lib/symptom-constants";
import { getTemperatureUnitLabel } from "../../lib/units";
import { getCurrentLocalDate } from "../../lib/utils";
import type { Episode } from "../../lib/types";

interface SymptomSheetProps extends SheetVisibilityProps {
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
  const { temperatureUnit } = useUnits();
  const {
    symptomType, setSymptomType, severity, setSeverity, logDate, setLogDate, logTime, setLogTime,
    temperature, setTemperature, notes, setNotes, linkToEpisode, setLinkToEpisode, isSubmitting, handleSubmit,
  } = useSymptomSheetState({ open, childId, activeEpisode, temperatureUnit, onLogged, onClose, onError: showError, onSuccess: showSuccess });
  const temperatureLabel = getTemperatureUnitLabel(temperatureUnit);

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSubmit(); }} className="px-5 pb-8">
        <h2 className="mb-2 text-center text-lg font-semibold text-[var(--color-text)]">
          Log symptom
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Capture symptoms, severity, and notes for the health timeline.
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
