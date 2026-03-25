import { useState, useEffect, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import type { FoodType } from "../../lib/types";

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

interface DietLogFormProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => void;
}

export function DietLogForm({ open, onClose, childId, onLogged }: DietLogFormProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(getCurrentDate());
  const [logTime, setLogTime] = useState(getCurrentTime());
  const [foodType, setFoodType] = useState<FoodType | null>(null);
  const [foodName, setFoodName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setLogDate(getCurrentDate());
      setLogTime(getCurrentTime());
    }
  }, [open]);

  const reset = () => {
    setLogDate(getCurrentDate());
    setLogTime(getCurrentTime());
    setFoodType(null);
    setFoodName("");
    setNotes("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!foodType || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await db.createDietLog({
        child_id: childId,
        logged_at: combineToISO(logDate, logTime),
        food_type: foodType,
        food_name: foodName.trim() || null,
        notes: notes.trim() || null,
      });
    } catch {
      setIsSubmitting(false);
      showError("Failed to save meal. Please try again.");
      return;
    }

    setIsSubmitting(false);
    onLogged();
    onClose();
    setTimeout(reset, 300);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  return (
    <Sheet open={open} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)] mb-5 text-center">
          Log a meal
        </h2>

        <div className="flex flex-col gap-5">
          {/* Date & time */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              When
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} />
              <TimePicker value={logTime} onChange={setLogTime} />
            </div>
          </div>

          {/* Food type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Type
            </label>
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

          {/* Food name (for solids/other) */}
          {(foodType === "solids" || foodType === "other") && (
            <div>
              <label htmlFor="food-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                What food?
              </label>
              <input
                id="food-name"
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
            <label htmlFor="diet-notes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              id="diet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..."
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm resize-none outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-6"
          disabled={!foodType || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Meal"}
        </Button>
      </form>
    </Sheet>
  );
}
