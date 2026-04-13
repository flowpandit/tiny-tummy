import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitsContext";
import { Input, Textarea } from "../ui/field";
import { useLoggingSheetLifecycle } from "../../hooks/useLoggingSheetLifecycle";
import {
  LoggingFieldGroup,
  LoggingFormHeader,
} from "./logging-form-primitives";
import {
  getLoggingChipClassName,
  getLoggingInputClassName,
  getLoggingTextareaClassName,
} from "./logging-form-classnames";
import { LogDateTimeFields } from "./LogDateTimeFields";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../../lib/utils";
import { getVolumeUnitLabel, parseVolumeInputToMl } from "../../lib/units";
import type { BottleContent, FoodType, BreastSide, FeedingLogDraft } from "../../lib/types";

function parseInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const EMPTY_DRAFT: FeedingLogDraft = {
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
  initialDraft?: Partial<FeedingLogDraft> | null;
}

export function DietLogForm({ open, onClose, childId, onLogged, initialDraft = null }: DietLogFormProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
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
  const { unitSystem } = useUnits();
  const nightMode = resolved === "night";
  const volumeUnit = getVolumeUnitLabel(unitSystem);

  const applyDraft = useCallback((draft?: Partial<FeedingLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setFoodType(nextDraft.food_type);
    setFoodName(nextDraft.food_name);
    setAmountMl(nextDraft.amount_ml);
    setDurationMinutes(nextDraft.duration_minutes);
    setBreastSide(nextDraft.breast_side);
    setBottleContent(nextDraft.bottle_content);
    setReactionNotes(nextDraft.reaction_notes);
    setIsConstipationSupport(nextDraft.is_constipation_support);
    setNotes(nextDraft.notes);
  }, []);

  const { handleClose } = useLoggingSheetLifecycle({
    onClose,
    onReset: () => applyDraft(null),
    onLogged,
  });

  useEffect(() => {
    if (open) {
      applyDraft(initialDraft);
    }
  }, [applyDraft, initialDraft, open]);

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
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        food_type: foodType,
        food_name: showsFoodName ? foodName.trim() || null : null,
        amount_ml: showsAmount ? parseVolumeInputToMl(amountMl, unitSystem) : null,
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
    void onLogged();
    handleClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      <form onSubmit={handleSubmit} className="px-5 pb-8">
        <LoggingFormHeader title="Log a feed" isNight={nightMode} />

        <div className="flex flex-col gap-5">
          <LogDateTimeFields
            date={logDate}
            time={logTime}
            onDateChange={setLogDate}
            onTimeChange={setLogTime}
            nightMode={nightMode}
          />

          <LoggingFieldGroup label="Type" isNight={nightMode}>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFoodType(ft.value)}
                  className={getLoggingChipClassName(foodType === ft.value, nightMode)}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </LoggingFieldGroup>

          {foodType === "breast_milk" && (
            <>
              <LoggingFieldGroup label="Breast side" isNight={nightMode}>
                <div className="flex flex-wrap gap-2">
                  {BREAST_SIDES.map((side) => (
                    <button
                      key={side.value}
                      type="button"
                      onClick={() => setBreastSide(side.value)}
                      className={getLoggingChipClassName(breastSide === side.value, nightMode)}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </LoggingFieldGroup>

              <LoggingFieldGroup label="Duration (minutes)" isNight={nightMode}>
                <Input
                  id="duration-minutes"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 12"
                  className={getLoggingInputClassName(nightMode)}
                />
              </LoggingFieldGroup>
            </>
          )}

          {foodType === "bottle" && (
            <>
              <LoggingFieldGroup label={`Amount (${volumeUnit})`} isNight={nightMode}>
                <Input
                  id="amount-ml"
                  type="number"
                  min="0"
                  step={unitSystem === "imperial" ? "0.1" : "1"}
                  inputMode="numeric"
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                  placeholder={unitSystem === "imperial" ? "e.g. 4.0" : "e.g. 120"}
                  className={getLoggingInputClassName(nightMode)}
                />
              </LoggingFieldGroup>

              <LoggingFieldGroup label="Bottle contents" isNight={nightMode}>
                <div className="flex flex-wrap gap-2">
                  {BOTTLE_CONTENTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBottleContent(option.value)}
                      className={getLoggingChipClassName(bottleContent === option.value, nightMode)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </LoggingFieldGroup>
            </>
          )}

          {(foodType === "formula" || foodType === "pumping" || foodType === "water") && (
            <LoggingFieldGroup label={`Amount (${volumeUnit})`} isNight={nightMode}>
              <Input
                id="amount-ml-other"
                type="number"
                min="0"
                step={unitSystem === "imperial" ? "0.1" : "1"}
                inputMode="numeric"
                value={amountMl}
                onChange={(e) => setAmountMl(e.target.value)}
                placeholder={unitSystem === "imperial" ? "e.g. 3.0" : foodType === "pumping" ? "e.g. 90" : "e.g. 120"}
                className={getLoggingInputClassName(nightMode)}
              />
            </LoggingFieldGroup>
          )}

          {foodType === "pumping" && (
            <LoggingFieldGroup label="Duration (minutes)" isNight={nightMode}>
              <Input
                id="pump-duration-minutes"
                type="number"
                min="1"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 15"
                className={getLoggingInputClassName(nightMode)}
              />
            </LoggingFieldGroup>
          )}

          {(foodType === "solids" || foodType === "other") && (
            <>
              <LoggingFieldGroup label="What food?" isNight={nightMode}>
                <Input
                  id="food-name"
                  type="text"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. pears, rice cereal"
                  className={getLoggingInputClassName(nightMode)}
                  autoComplete="off"
                />
              </LoggingFieldGroup>

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
                  <p className={cn("text-sm font-medium", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
                    Constipation support food
                  </p>
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

          {(foodType === "solids" || foodType === "other" || foodType === "formula" || foodType === "bottle") && (
            <LoggingFieldGroup label="Reactions or tummy notes" isNight={nightMode}>
              <Textarea
                id="reaction-notes"
                value={reactionNotes}
                onChange={(e) => setReactionNotes(e.target.value)}
                placeholder="e.g. seemed gassy, accepted well, refused second half"
                rows={2}
                className={getLoggingTextareaClassName(nightMode)}
              />
            </LoggingFieldGroup>
          )}

          <LoggingFieldGroup label="Notes (optional)" isNight={nightMode}>
            <Textarea
              id="diet-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context..."
              rows={2}
              className={getLoggingTextareaClassName(nightMode)}
            />
          </LoggingFieldGroup>
        </div>

        <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSubmitting || !foodType}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Sheet>
  );
}
