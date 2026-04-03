import { useState, type FormEvent } from "react";
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
import { diaperIncludesStool, diaperIncludesWet } from "../../lib/diaper";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getLocalDateTimeParts } from "../../lib/utils";
import * as db from "../../lib/db";
import type { DiaperEntry, DiaperType, StoolColor, StoolSize, UrineColor } from "../../lib/types";

function hasUrine(type: DiaperType) {
  return diaperIncludesWet(type);
}

function hasStool(type: DiaperType) {
  return diaperIncludesStool(type);
}

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
  const entryLoggedAt = getLocalDateTimeParts(entry.logged_at);
  const [logDate, setLogDate] = useState(entryLoggedAt.date);
  const [logTime, setLogTime] = useState(entryLoggedAt.time);
  const [diaperType, setDiaperType] = useState<DiaperType>(entry.diaper_type);
  const [urineColor, setUrineColor] = useState<UrineColor | null>(entry.urine_color);
  const [stoolType, setStoolType] = useState<number | null>(entry.stool_type);
  const [color, setColor] = useState<StoolColor | null>(entry.color);
  const [size, setSize] = useState<StoolSize | null>(entry.size);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await db.updateDiaperLog(entry.id, {
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        diaper_type: diaperType,
        urine_color: hasUrine(diaperType) ? urineColor : null,
        stool_type: hasStool(diaperType) ? stoolType : null,
        color: hasStool(diaperType) ? color : null,
        size: hasStool(diaperType) ? size : null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch {
      showError("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    try {
      await db.deleteDiaperLog(entry);
      onDeleted();
      onClose();
    } catch {
      showError("Failed to delete. Please try again.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSave} className="px-5 pb-8">
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

          {hasUrine(diaperType) && (
            <UrineColorPicker value={urineColor} onChange={setUrineColor} />
          )}

          {hasStool(diaperType) && (
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
