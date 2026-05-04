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
import { getVolumeUnitLabel, volumeMlToDisplay } from "../../lib/units";
import type { FeedingLogDraft, UnitSystem } from "../../lib/types";

const AMOUNT_SLIDER_MAX_ML = 500;

function getAmountSliderConfig(unitSystem: UnitSystem) {
  if (unitSystem === "imperial") {
    return {
      max: Math.round(volumeMlToDisplay(AMOUNT_SLIDER_MAX_ML, unitSystem) * 2) / 2,
      step: 0.5,
    };
  }

  return {
    max: AMOUNT_SLIDER_MAX_ML,
    step: 5,
  };
}

function formatSliderAmount(value: number, unitSystem: UnitSystem): string {
  if (unitSystem === "imperial") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  return String(Math.round(value));
}

function clampAmountForSlider(value: string, max: number): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}

function AmountField({
  id,
  value,
  onChange,
  placeholder,
  unitSystem,
  nightMode,
  showSlider,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  unitSystem: UnitSystem;
  nightMode: boolean;
  showSlider: boolean;
}) {
  const volumeUnit = getVolumeUnitLabel(unitSystem);
  const slider = getAmountSliderConfig(unitSystem);
  const sliderValue = clampAmountForSlider(value, slider.max);

  return (
    <div className="space-y-3">
      <Input
        id={id}
        type="number"
        min="0"
        step={unitSystem === "imperial" ? "0.1" : "1"}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={getLoggingInputClassName(nightMode)}
      />

      {showSlider && (
        <div
          className={cn(
            "rounded-[18px] border px-3 py-3",
            nightMode
              ? "border-slate-700 bg-slate-900/70"
              : "border-[var(--color-border)] bg-[var(--color-surface)]/72",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className={cn("text-xs font-medium", nightMode ? "text-slate-400" : "text-[var(--color-text-secondary)]")}>
              0 {volumeUnit}
            </span>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", nightMode ? "bg-slate-800 text-slate-100" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]")}>
              {formatSliderAmount(sliderValue, unitSystem)} {volumeUnit}
            </span>
            <span className={cn("text-xs font-medium", nightMode ? "text-slate-400" : "text-[var(--color-text-secondary)]")}>
              {formatSliderAmount(slider.max, unitSystem)} {volumeUnit}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={slider.max}
            step={slider.step}
            value={sliderValue}
            onChange={(event) => {
              const nextValue = Number.parseFloat(event.target.value);
              onChange(formatSliderAmount(nextValue, unitSystem));
            }}
            className="h-2 w-full cursor-pointer accent-[var(--color-primary)]"
            aria-label={`Adjust amount (${volumeUnit})`}
          />
        </div>
      )}
    </div>
  );
}

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

              <LoggingFieldGroup label={`Amount (${volumeUnit})`} isNight={nightMode}>
                <AmountField
                  id="amount-ml-breastfeed"
                  value={amountMl}
                  onChange={setAmountMl}
                  placeholder={unitSystem === "imperial" ? "e.g. 4.0" : "e.g. 120"}
                  unitSystem={unitSystem}
                  nightMode={nightMode}
                  showSlider
                />
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
                <AmountField
                  id="amount-ml"
                  value={amountMl}
                  onChange={setAmountMl}
                  placeholder={unitSystem === "imperial" ? "e.g. 4.0" : "e.g. 120"}
                  unitSystem={unitSystem}
                  nightMode={nightMode}
                  showSlider
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
              <AmountField
                id="amount-ml-other"
                value={amountMl}
                onChange={setAmountMl}
                placeholder={unitSystem === "imperial" ? "e.g. 3.0" : foodType === "pumping" ? "e.g. 90" : "e.g. 120"}
                unitSystem={unitSystem}
                nightMode={nightMode}
                showSlider={foodType === "formula"}
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
