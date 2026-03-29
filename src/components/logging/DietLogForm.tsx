import { useState, useEffect, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import type { BottleContent, BreastSide, FoodType } from "../../lib/types";

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function parseInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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
  const [amountMl, setAmountMl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [breastSide, setBreastSide] = useState<BreastSide | null>(null);
  const [bottleContent, setBottleContent] = useState<BottleContent | null>(null);
  const [reactionNotes, setReactionNotes] = useState("");
  const [isConstipationSupport, setIsConstipationSupport] = useState(false);
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
    setAmountMl("");
    setDurationMinutes("");
    setBreastSide(null);
    setBottleContent(null);
    setReactionNotes("");
    setIsConstipationSupport(false);
    setNotes("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!foodType || isSubmitting) return;

    const showsFoodName = foodType === "solids" || foodType === "other";
    const showsAmount = foodType === "formula" || foodType === "bottle" || foodType === "pumping" || foodType === "water";
    const showsDuration = foodType === "breast_milk" || foodType === "pumping";
    const showsBreastSide = foodType === "breast_milk";
    const showsBottleContent = foodType === "bottle";
    const showsConstipationSupport = foodType === "solids" || foodType === "other";

    setIsSubmitting(true);
    try {
      await db.createDietLog({
        child_id: childId,
        logged_at: combineToISO(logDate, logTime),
        food_type: foodType,
        food_name: showsFoodName ? foodName.trim() || null : null,
        amount_ml: showsAmount ? parseInteger(amountMl) : null,
        duration_minutes: showsDuration ? parseInteger(durationMinutes) : null,
        breast_side: showsBreastSide ? breastSide : null,
        bottle_content: showsBottleContent ? bottleContent : null,
        reaction_notes: reactionNotes.trim() || null,
        is_constipation_support: showsConstipationSupport && isConstipationSupport ? 1 : 0,
        notes: notes.trim() || null,
      });
    } catch {
      setIsSubmitting(false);
      showError("Failed to save feed. Please try again.");
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
          Log a feed
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

          {/* Breastfeeding details */}
          {foodType === "breast_milk" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Breast side
                </label>
                <div className="flex flex-wrap gap-2">
                  {BREAST_SIDES.map((side) => (
                    <button
                      key={side.value}
                      type="button"
                      onClick={() => setBreastSide(side.value)}
                      className={cn(
                        "px-4 h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                        breastSide === side.value
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                      )}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="duration-minutes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  id="duration-minutes"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
                />
              </div>
            </>
          )}

          {/* Bottle details */}
          {foodType === "bottle" && (
            <>
              <div>
                <label htmlFor="amount-ml" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Amount (ml)
                </label>
                <input
                  id="amount-ml"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Bottle contents
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOTTLE_CONTENTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBottleContent(option.value)}
                      className={cn(
                        "px-4 h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                        bottleContent === option.value
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Formula, pumping, water amounts */}
          {(foodType === "formula" || foodType === "pumping" || foodType === "water") && (
            <div>
              <label htmlFor="amount-ml-other" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Amount (ml)
              </label>
              <input
                id="amount-ml-other"
                type="number"
                min="0"
                inputMode="numeric"
                value={amountMl}
                onChange={(e) => setAmountMl(e.target.value)}
                placeholder={foodType === "pumping" ? "e.g. 90" : "e.g. 120"}
                className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
              />
            </div>
          )}

          {foodType === "pumping" && (
            <div>
              <label htmlFor="pump-duration-minutes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Duration (minutes)
              </label>
              <input
                id="pump-duration-minutes"
                type="number"
                min="1"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 15"
                className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
              />
            </div>
          )}

          {/* Food name (for solids/other) */}
          {(foodType === "solids" || foodType === "other") && (
            <>
              <div>
                <label htmlFor="food-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  What food?
                </label>
                <input
                  id="food-name"
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. pears, rice cereal"
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsConstipationSupport((current) => !current)}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
                  isConstipationSupport
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]",
                )}
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Constipation support food</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Mark foods like pears, prunes, peas, or extra water-rich foods.
                  </p>
                </div>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border",
                    isConstipationSupport
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-transparent",
                  )}
                />
              </button>
            </>
          )}

          {/* Reaction notes */}
          {(foodType === "solids" || foodType === "other" || foodType === "formula" || foodType === "bottle") && (
            <div>
              <label htmlFor="reaction-notes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Reactions or tummy notes
              </label>
              <textarea
                id="reaction-notes"
                value={reactionNotes}
                onChange={(e) => setReactionNotes(e.target.value)}
                placeholder="e.g. seemed gassy, accepted well, refused second half"
                rows={2}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm resize-none outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
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
          {isSubmitting ? "Saving..." : "Save Feed"}
        </Button>
      </form>
    </Sheet>
  );
}
