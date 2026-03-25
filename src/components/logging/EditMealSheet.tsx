import { useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import { useToast } from "../ui/toast";
import * as db from "../../lib/db";
import type { DietEntry, FoodType } from "../../lib/types";

interface EditMealSheetProps {
  entry: DietEntry;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function EditMealSheet({ entry, open, onClose, onSaved, onDeleted }: EditMealSheetProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(entry.logged_at.split("T")[0]);
  const [logTime, setLogTime] = useState(entry.logged_at.split("T")[1]?.slice(0, 5) ?? "12:00");
  const [foodType, setFoodType] = useState<FoodType>(entry.food_type);
  const [foodName, setFoodName] = useState(entry.food_name ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await db.updateDietLog(entry.id, {
        logged_at: `${logDate}T${logTime}:00`,
        food_type: foodType,
        food_name: foodName.trim() || null,
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
      await db.deleteDietLog(entry.id);
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
          Edit meal
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

          {/* Food type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFoodType(ft.value)}
                  className={cn(
                    "px-4 h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                    foodType === ft.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                  )}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food name */}
          {(foodType === "solids" || foodType === "other") && (
            <div>
              <label htmlFor="edit-food-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                What food?
              </label>
              <input
                id="edit-food-name"
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. carrots, rice cereal"
                className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
                autoComplete="off"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="edit-meal-notes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              id="edit-meal-notes"
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
              Delete this meal
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
