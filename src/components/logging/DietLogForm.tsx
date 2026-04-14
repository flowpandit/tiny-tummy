import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitsContext";
import { Input, Textarea } from "../ui/field";
import { useDietLogFormState } from "../../hooks/useDietLogFormState";
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
import { getVolumeUnitLabel } from "../../lib/units";
import type { FeedingLogDraft } from "../../lib/types";

interface DietLogFormProps extends SheetVisibilityProps {
  childId: string;
  onLogged: () => void;
  initialDraft?: Partial<FeedingLogDraft> | null;
}

export function DietLogForm({ open, onClose, childId, onLogged, initialDraft = null }: DietLogFormProps) {
  const { showError } = useToast();
  const { resolved } = useTheme();
  const { unitSystem } = useUnits();
  const nightMode = resolved === "night";
  const volumeUnit = getVolumeUnitLabel(unitSystem);

  const { handleClose } = useLoggingSheetLifecycle({
    onClose,
    onReset: () => {},
    onLogged,
  });
  const {
    logDate, setLogDate, logTime, setLogTime, foodType, setFoodType, foodName, setFoodName,
    amountMl, setAmountMl, durationMinutes, setDurationMinutes, breastSide, setBreastSide,
    bottleContent, setBottleContent, reactionNotes, setReactionNotes, isConstipationSupport,
    setIsConstipationSupport, notes, setNotes, isSubmitting, handleSubmit,
  } = useDietLogFormState({ open, childId, unitSystem, initialDraft, onLogged, onClose: handleClose, onError: showError });

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void handleSubmit(); }} className="px-5 pb-8">
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
