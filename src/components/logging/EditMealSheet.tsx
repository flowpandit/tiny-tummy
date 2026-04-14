import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import { cn } from "../../lib/cn";
import { useToast } from "../ui/toast";
import { useEditMealSheetState } from "../../hooks/useEditMealSheetState";
import { useUnits } from "../../contexts/UnitsContext";
import { getCurrentLocalDate } from "../../lib/utils";
import { getVolumeUnitLabel } from "../../lib/units";
import type { DietEntry } from "../../lib/types";

interface EditMealSheetProps extends SheetVisibilityProps {
  entry: DietEntry;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditMealSheet({ entry, open, onClose, onSaved, onDeleted }: EditMealSheetProps) {
  const { showError } = useToast();
  const { unitSystem } = useUnits();
  const volumeUnit = getVolumeUnitLabel(unitSystem);
  const {
    logDate, setLogDate, logTime, setLogTime, foodType, setFoodType, foodName, setFoodName, amountMl, setAmountMl,
    durationMinutes, setDurationMinutes, breastSide, setBreastSide, bottleContent, setBottleContent, reactionNotes,
    setReactionNotes, isConstipationSupport, setIsConstipationSupport, notes, setNotes, isSaving, confirmDelete,
    setConfirmDelete, handleSave, handleDelete,
  } = useEditMealSheetState({ entry, unitSystem, onClose, onSaved, onDeleted, onError: showError });

  return (
    <Sheet open={open} onClose={onClose}>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void handleSave(); }} className="px-5 pb-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)] mb-5 text-center">
          Edit feed
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

          {foodType === "breast_milk" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Breast side</label>
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
                <label htmlFor="edit-duration-minutes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  id="edit-duration-minutes"
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

          {foodType === "bottle" && (
            <>
              <div>
                <label htmlFor="edit-bottle-amount" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Amount ({volumeUnit})
                </label>
                <input
                  id="edit-bottle-amount"
                  type="number"
                  min="0"
                  step={unitSystem === "imperial" ? "0.1" : "1"}
                  inputMode="numeric"
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                  placeholder={unitSystem === "imperial" ? "e.g. 4.0" : "e.g. 120"}
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Bottle contents</label>
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

          {(foodType === "formula" || foodType === "pumping" || foodType === "water") && (
            <div>
              <label htmlFor="edit-amount-ml" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Amount ({volumeUnit})
              </label>
              <input
                id="edit-amount-ml"
                type="number"
                min="0"
                step={unitSystem === "imperial" ? "0.1" : "1"}
                inputMode="numeric"
                value={amountMl}
                onChange={(e) => setAmountMl(e.target.value)}
                placeholder={unitSystem === "imperial" ? "e.g. 3.0" : foodType === "pumping" ? "e.g. 90" : "e.g. 120"}
                className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
              />
            </div>
          )}

          {foodType === "pumping" && (
            <div>
              <label htmlFor="edit-pump-duration" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Duration (minutes)
              </label>
              <input
                id="edit-pump-duration"
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

          {/* Food name */}
          {(foodType === "solids" || foodType === "other") && (
            <>
              <div>
                <label htmlFor="edit-food-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  What food?
                </label>
                <input
                  id="edit-food-name"
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

          {(foodType === "solids" || foodType === "other" || foodType === "formula" || foodType === "bottle") && (
            <div>
              <label htmlFor="edit-reaction-notes" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Reactions or tummy notes
              </label>
              <textarea
                id="edit-reaction-notes"
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
              Delete this feed
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
