import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { useToast } from "../ui/toast";
import { useEditPoopSheetState } from "../../hooks/useEditPoopSheetState";
import { getCurrentLocalDate } from "../../lib/utils";
import type { PoopEntry } from "../../lib/types";

interface EditPoopSheetProps extends SheetVisibilityProps {
  entry: PoopEntry;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditPoopSheet({ entry, open, onClose, onSaved, onDeleted }: EditPoopSheetProps) {
  const { showError } = useToast();
  const {
    logDate,
    setLogDate,
    logTime,
    setLogTime,
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
  } = useEditPoopSheetState({
    entry,
    onClose,
    onSaved,
    onDeleted,
    onError: showError,
  });

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void handleSave(); }} className="px-5 pb-8">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-5 text-center">
          Edit entry
        </h2>

        <div className="flex flex-col gap-5">
          {/* Date & time */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentLocalDate()} />
              <TimePicker value={logTime} onChange={setLogTime} />
            </div>
          </div>

          {!entry.is_no_poop && (
            <>
              <StoolTypePicker value={stoolType} onChange={setStoolType} />
              <ColorPicker value={color} onChange={setColor} />
              <SizePicker value={size} onChange={setSize} />
            </>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="edit-poop-notes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              id="edit-poop-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..."
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm resize-none outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
            />
          </div>
        </div>

        <Button type="submit" variant="cta" size="lg" className="w-full mt-6" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

        {/* Delete */}
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
      </form>
    </Sheet>
  );
}
