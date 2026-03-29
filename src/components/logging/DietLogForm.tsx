import { useState, useEffect, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import { useTheme } from "../../contexts/ThemeContext";
import type { BottleContent, BreastSide, DietLogDraft, FoodType } from "../../lib/types";

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

const EMPTY_DRAFT: DietLogDraft = {
  food_type: null,
  food_name: "",
  amount_ml: "",
  duration_minutes: "",
  breast_side: null,
  bottle_content: null,
  reaction_notes: "",
  is_constipation_support: false,
  notes: "",
};

interface DietLogFormProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => void;
  initialDraft?: Partial<DietLogDraft> | null;
}

export function DietLogForm({ open, onClose, childId, onLogged, initialDraft = null }: DietLogFormProps) {
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
  const { resolved } = useTheme();
  const nightMode = resolved === "night";

  const applyDraft = (draft?: Partial<DietLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentDate());
    setLogTime(getCurrentTime());
    setFoodType(nextDraft.food_type);
    setFoodName(nextDraft.food_name);
    setAmountMl(nextDraft.amount_ml);
    setDurationMinutes(nextDraft.duration_minutes);
    setBreastSide(nextDraft.breast_side);
    setBottleContent(nextDraft.bottle_content);
    setReactionNotes(nextDraft.reaction_notes);
    setIsConstipationSupport(nextDraft.is_constipation_support);
    setNotes(nextDraft.notes);
  };

  useEffect(() => {
    if (open) {
      applyDraft(initialDraft);
    }
  }, [open, initialDraft]);

  const reset = () => {
    applyDraft(null);
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

  const fieldLabelClassName = cn("block text-sm font-medium mb-1.5", nightMode ? "text-slate-100" : "text-[var(--color-text)]");
  const chipClassName = (selected: boolean) =>
    cn(
      "px-4 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
      "h-10",
      selected
        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        : nightMode
          ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
    );
  const inputClassName = cn(
    "w-full rounded-[var(--radius-md)] border text-sm outline-none transition-colors",
    nightMode
      ? "h-11 px-3 border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      : "h-11 px-3 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
  );
  const textareaClassName = cn(
    "w-full rounded-[var(--radius-md)] border text-sm resize-none outline-none transition-colors",
    nightMode
      ? "px-3 py-2 border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      : "px-3 py-2 border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
  );

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={cn("font-[var(--font-display)] text-lg font-semibold", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
            Log a feed
          </h2>
        </div>

        <div className="flex flex-col gap-5">
          {/* Date & time */}
          <div>
            <label className={fieldLabelClassName}>
              When
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} nightMode={nightMode} />
              <TimePicker value={logTime} onChange={setLogTime} nightMode={nightMode} />
            </div>
          </div>

          {/* Food type */}
          <div>
            <label className={cn("block text-sm font-medium mb-2", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFoodType(ft.value)}
                  className={chipClassName(foodType === ft.value)}
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
                <label className={cn("block text-sm font-medium mb-2", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
                  Breast side
                </label>
                <div className="flex flex-wrap gap-2">
                  {BREAST_SIDES.map((side) => (
                    <button
                      key={side.value}
                      type="button"
                      onClick={() => setBreastSide(side.value)}
                      className={chipClassName(breastSide === side.value)}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="duration-minutes" className={fieldLabelClassName}>
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
                  className={inputClassName}
                />
              </div>
            </>
          )}

          {/* Bottle details */}
          {foodType === "bottle" && (
            <>
              <div>
                <label htmlFor="amount-ml" className={fieldLabelClassName}>
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
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
                  Bottle contents
                </label>
                <div className="flex flex-wrap gap-2">
                  {BOTTLE_CONTENTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBottleContent(option.value)}
                      className={chipClassName(bottleContent === option.value)}
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
              <label htmlFor="amount-ml-other" className={fieldLabelClassName}>
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
                className={inputClassName}
              />
            </div>
          )}

          {foodType === "pumping" && (
            <div>
              <label htmlFor="pump-duration-minutes" className={fieldLabelClassName}>
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
                className={inputClassName}
              />
            </div>
          )}

          {/* Food name (for solids/other) */}
          {(foodType === "solids" || foodType === "other") && (
            <>
              <div>
                <label htmlFor="food-name" className={fieldLabelClassName}>
                  What food?
                </label>
                <input
                  id="food-name"
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. pears, rice cereal"
                  className={inputClassName}
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
                    : nightMode
                      ? "border-slate-700 bg-slate-900/90"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]",
                )}
              >
                <div>
                  <p className={cn("text-sm font-medium", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>Constipation support food</p>
                  <p className={cn("text-xs", nightMode ? "text-slate-400" : "text-[var(--color-text-secondary)]")}>
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
              <label htmlFor="reaction-notes" className={fieldLabelClassName}>
                Reactions or tummy notes
              </label>
              <textarea
                id="reaction-notes"
                value={reactionNotes}
                onChange={(e) => setReactionNotes(e.target.value)}
                placeholder="e.g. seemed gassy, accepted well, refused second half"
                rows={2}
                className={textareaClassName}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="diet-notes" className={fieldLabelClassName}>
              Notes (optional)
            </label>
            <textarea
              id="diet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..."
              rows={2}
              className={textareaClassName}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className={cn("w-full mt-6", nightMode && "shadow-none")}
          disabled={!foodType || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Feed"}
        </Button>
      </form>
    </Sheet>
  );
}
