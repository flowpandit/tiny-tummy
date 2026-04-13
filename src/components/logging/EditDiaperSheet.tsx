import type { FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { DiaperTypePicker } from "./DiaperTypePicker";
import { UrineColorPicker } from "./UrineColorPicker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { useToast } from "../ui/toast";
import { useEditDiaperSheetState } from "../../hooks/useEditDiaperSheetState";
import { diaperIncludesStool, diaperIncludesWet } from "../../lib/diaper";
import { getCurrentLocalDate } from "../../lib/utils";
import type { DiaperEntry } from "../../lib/types";

export function EditDiaperSheet({
  entry,
  open,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry: DiaperEntry;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { showError } = useToast();
  const {
    logDate,
    setLogDate,
    logTime,
    setLogTime,
    diaperType,
    setDiaperType,
    urineColor,
    setUrineColor,
    stoolType,
    setStoolType,
    color,
    setColor,
    size,
    setSize,
    notes,
    setNotes,
    isSaving,
    confirmDelete,
    setConfirmDelete,
    handleSave,
    handleDelete,
  } = useEditDiaperSheetState({
    entry,
    onClose,
    onSaved,
    onDeleted,
    onError: showError,
  });

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSave(); }} className="px-5 pb-8">
        <h2 className="mb-5 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          Edit diaper
        </h2>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentLocalDate()} />
              <TimePicker value={logTime} onChange={setLogTime} />
            </div>
          </div>

          <DiaperTypePicker value={diaperType} onChange={setDiaperType} />

          {diaperIncludesWet(diaperType) && (
            <UrineColorPicker value={urineColor} onChange={setUrineColor} />
          )}

          {diaperIncludesStool(diaperType) && (
            <>
              <StoolTypePicker value={stoolType} onChange={setStoolType} />
              <ColorPicker value={color} onChange={setColor} />
              <SizePicker value={size} onChange={setSize} />
            </>
          )}

          <div>
            <label htmlFor="edit-diaper-notes" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Notes (optional)
            </label>
            <textarea
              id="edit-diaper-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

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
              className="cursor-pointer text-sm text-[var(--color-alert)]"
            >
              Delete this entry
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
