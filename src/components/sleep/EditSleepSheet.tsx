import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { FieldLabel, Textarea } from "../ui/field";
import { cn } from "../../lib/cn";
import { useToast } from "../ui/toast";
import { useEditSleepSheetState } from "../../hooks/useEditSleepSheetState";
import { getCurrentLocalDate } from "../../lib/utils";
import type { SleepEntry, SleepType } from "../../lib/types";

interface EditSleepSheetProps extends SheetVisibilityProps {
  entry: SleepEntry;
  onSaved: () => void;
  onDeleted: () => void;
}

const SLEEP_TYPES: Array<{ value: SleepType; label: string; description: string }> = [
  { value: "nap", label: "Nap", description: "Daytime sleep or shorter rest." },
  { value: "night", label: "Night", description: "Overnight sleep block." },
];

export function EditSleepSheet({ entry, open, onClose, onSaved, onDeleted }: EditSleepSheetProps) {
  const { showError, showSuccess } = useToast();
  const {
    sleepType,
    setSleepType,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    notes,
    setNotes,
    isSaving,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
  } = useEditSleepSheetState({
    entry,
    open,
    onClose,
    onSaved,
    onDeleted,
    onError: showError,
    onSuccess: showSuccess,
  });

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSave(); }} className="px-5 pb-8">
        <h2 className="mb-2 text-center text-lg font-semibold text-[var(--color-text)]">
          Edit sleep log
        </h2>
        <p className="mb-5 text-center text-sm text-[var(--color-text-secondary)]">
          Fix the timing, switch nap or night, or remove the entry if it was logged wrong.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <FieldLabel>Sleep type</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {SLEEP_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSleepType(item.value)}
                  className={cn(
                    "rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors",
                    sleepType === item.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                  )}
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-soft)]">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Started</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={startDate} onChange={setStartDate} max={getCurrentLocalDate()} />
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
          </div>

          <div>
            <FieldLabel>Ended</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={endDate} onChange={setEndDate} max={getCurrentLocalDate()} />
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="sleep-notes">Notes</FieldLabel>
            <Textarea
              id="sleep-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Optional context"
            />
          </div>

          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>

          {confirmDelete ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-alert)]/18 bg-[var(--color-alert-bg)] p-4">
              <p className="text-sm font-medium text-[var(--color-alert)]">Delete this sleep entry?</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                This removes the log permanently.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="danger" onClick={() => { void handleDelete(); }}>
                  Delete
                </Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="text-[var(--color-alert)]" onClick={() => setConfirmDelete(true)}>
              Delete this entry
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
