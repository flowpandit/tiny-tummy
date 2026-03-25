import { useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { useToast } from "../ui/toast";
import * as db from "../../lib/db";
import type { PoopEntry, StoolColor, StoolSize } from "../../lib/types";

interface EditPoopSheetProps {
  entry: PoopEntry;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function EditPoopSheet({ entry, open, onClose, onSaved, onDeleted }: EditPoopSheetProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(entry.logged_at.split("T")[0]);
  const [logTime, setLogTime] = useState(entry.logged_at.split("T")[1]?.slice(0, 5) ?? "12:00");
  const [stoolType, setStoolType] = useState<number | null>(entry.stool_type);
  const [color, setColor] = useState<StoolColor | null>(entry.color);
  const [size, setSize] = useState<StoolSize | null>(entry.size);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await db.updatePoopLog(entry.id, {
        logged_at: `${logDate}T${logTime}:00`,
        stool_type: stoolType,
        color,
        size,
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
      await db.deletePoopLog(entry.id);
      onDeleted();
      onClose();
    } catch {
      showError("Failed to delete. Please try again.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={handleSave} className="px-5 pb-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)] mb-5 text-center">
          Edit entry
        </h2>

        <div className="flex flex-col gap-5">
          {/* Date & time */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">When</label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} />
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
