import type { FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { useUnits } from "../../contexts/UnitsContext";
import { useGrowthLogSheetState } from "../../hooks/useGrowthLogSheetState";
import { getCurrentLocalDate } from "../../lib/utils";
import { getGrowthUnitLabel } from "../../lib/units";
import type { GrowthEntry } from "../../lib/types";

interface GrowthLogSheetProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => Promise<void> | void;
  entry?: GrowthEntry | null;
  onDeleted?: () => Promise<void> | void;
}

export function GrowthLogSheet({ open, onClose, childId, onLogged, entry = null, onDeleted }: GrowthLogSheetProps) {
  const { showError, showSuccess } = useToast();
  const { unitSystem } = useUnits();
  const isEditing = Boolean(entry);
  const {
    measureDate, setMeasureDate, measureTime, setMeasureTime, weightKg, setWeightKg, heightCm, setHeightCm,
    headCircumferenceCm, setHeadCircumferenceCm, notes, setNotes, isSubmitting, confirmDelete, setConfirmDelete,
    hasAnyMeasurement, handleSubmit, handleDelete,
  } = useGrowthLogSheetState({ open, childId, unitSystem, entry, onLogged, onDeleted, onClose, onError: showError, onSuccess: showSuccess });

  const inputClassName = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";
  const weightUnit = getGrowthUnitLabel("weight_kg", unitSystem);
  const lengthUnit = getGrowthUnitLabel("height_cm", unitSystem);
  const headUnit = getGrowthUnitLabel("head_circumference_cm", unitSystem);

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSubmit(); }} className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          {isEditing ? "Edit growth measurement" : "Add growth measurement"}
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          {isEditing ? "Adjust the numbers, timing, or note without losing the original entry." : "Keep this lightweight: log only the measurements you have today."}
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={measureDate} onChange={setMeasureDate} max={getCurrentLocalDate()} />
              <TimePicker value={measureTime} onChange={setMeasureTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="growth-weight" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Weight ({weightUnit})
              </label>
              <input
                id="growth-weight"
                inputMode="decimal"
                placeholder={unitSystem === "imperial" ? "e.g. 14.1" : "e.g. 6.4"}
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="growth-height" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Length / height ({lengthUnit})
              </label>
              <input
                id="growth-height"
                inputMode="decimal"
                placeholder={unitSystem === "imperial" ? "e.g. 25.0" : "e.g. 63.5"}
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="growth-head" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Head circumference ({headUnit})
              </label>
              <input
                id="growth-head"
                inputMode="decimal"
                placeholder={unitSystem === "imperial" ? "e.g. 16.2" : "e.g. 41.2"}
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
          {isSubmitting ? (isEditing ? "Saving..." : "Adding...") : isEditing ? "Save Changes" : "Save Measurement"}
        </Button>

        {isEditing && onDeleted && (
          <div className="mt-4 flex justify-center">
            {confirmDelete ? (
              <div className="flex gap-3">
                <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
                  Confirm Delete
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-[var(--color-alert)] cursor-pointer"
              >
                Delete this entry
              </button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
