import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import * as db from "../../lib/db";

interface GrowthLogSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => Promise<void> | void;
}

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function GrowthLogSheet({ open, onClose, childId, onLogged }: GrowthLogSheetProps) {
  const { showError, showSuccess } = useToast();
  const [measureDate, setMeasureDate] = useState(getCurrentDate());
  const [measureTime, setMeasureTime] = useState(getCurrentTime());
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeasureDate(getCurrentDate());
    setMeasureTime(getCurrentTime());
    setWeightKg("");
    setHeightCm("");
    setHeadCircumferenceCm("");
    setNotes("");
    setIsSubmitting(false);
  }, [open]);

  const hasAnyMeasurement = weightKg.trim() || heightCm.trim() || headCircumferenceCm.trim();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasAnyMeasurement || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await db.createGrowthLog({
        child_id: childId,
        measured_at: combineToISO(measureDate, measureTime),
        weight_kg: weightKg.trim() ? Number(weightKg) : null,
        height_cm: heightCm.trim() ? Number(heightCm) : null,
        head_circumference_cm: headCircumferenceCm.trim() ? Number(headCircumferenceCm) : null,
        notes: notes.trim() || null,
      });
      await onLogged();
      showSuccess("Growth measurement saved.");
      onClose();
    } catch {
      showError("Could not save the growth measurement. Please try again.");
    }
    setIsSubmitting(false);
  };

  const inputClassName = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          Add growth measurement
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Keep this lightweight: log only the measurements you have today.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={measureDate} onChange={setMeasureDate} max={getCurrentDate()} />
              <TimePicker value={measureTime} onChange={setMeasureTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="growth-weight" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Weight (kg)
              </label>
              <input
                id="growth-weight"
                inputMode="decimal"
                placeholder="e.g. 6.4"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="growth-height" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Length / height (cm)
              </label>
              <input
                id="growth-height"
                inputMode="decimal"
                placeholder="e.g. 63.5"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="growth-head" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Head circumference (cm)
              </label>
              <input
                id="growth-head"
                inputMode="decimal"
                placeholder="e.g. 41.2"
                value={headCircumferenceCm}
                onChange={(event) => setHeadCircumferenceCm(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="growth-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Notes (optional)
            </label>
            <textarea
              id="growth-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Clinic visit, home scale, wriggly measurement, or anything worth remembering."
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={!hasAnyMeasurement || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Measurement"}
        </Button>
      </form>
    </Sheet>
  );
}
