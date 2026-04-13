import { useState, useCallback } from "react";
import * as db from "../lib/db";
import { combineLocalDateAndTimeToUtcIso, getLocalDateTimeParts } from "../lib/utils";
import { formatVolumeValue, parseVolumeInputToMl } from "../lib/units";
import type { BottleContent, BreastSide, DietEntry, FoodType, UnitSystem } from "../lib/types";

function parseInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useEditMealSheetState({
  entry, unitSystem, onClose, onSaved, onDeleted, onError,
}: {
  entry: DietEntry;
  unitSystem: UnitSystem;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}) {
  const entryLoggedAt = getLocalDateTimeParts(entry.logged_at);
  const [logDate, setLogDate] = useState(entryLoggedAt.date);
  const [logTime, setLogTime] = useState(entryLoggedAt.time);
  const [foodType, setFoodType] = useState<FoodType>(entry.food_type);
  const [foodName, setFoodName] = useState(entry.food_name ?? "");
  const [amountMl, setAmountMl] = useState(() => entry.amount_ml !== null ? formatVolumeValue(entry.amount_ml, unitSystem, { includeUnit: false }) : "");
  const [durationMinutes, setDurationMinutes] = useState(entry.duration_minutes?.toString() ?? "");
  const [breastSide, setBreastSide] = useState<BreastSide | null>(entry.breast_side);
  const [bottleContent, setBottleContent] = useState<BottleContent | null>(entry.bottle_content);
  const [reactionNotes, setReactionNotes] = useState(entry.reaction_notes ?? "");
  const [isConstipationSupport, setIsConstipationSupport] = useState(Boolean(entry.is_constipation_support));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = useCallback(async () => {
    const showsFoodName = foodType === "solids" || foodType === "other";
    const showsAmount = foodType === "formula" || foodType === "bottle" || foodType === "pumping" || foodType === "water";
    const showsDuration = foodType === "breast_milk" || foodType === "pumping";
    const showsBreastSide = foodType === "breast_milk";
    const showsBottleContent = foodType === "bottle";
    const showsConstipationSupport = foodType === "solids" || foodType === "other";

    setIsSaving(true);
    try {
      await db.updateDietLog(entry.id, {
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
      onSaved();
      onClose();
    } catch {
      onError("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  }, [amountMl, bottleContent, breastSide, durationMinutes, entry.id, foodName, foodType, isConstipationSupport, logDate, logTime, notes, onClose, onError, onSaved, reactionNotes, unitSystem]);

  const handleDelete = useCallback(async () => {
    try {
      await db.deleteDietLog(entry.id);
      onDeleted();
      onClose();
    } catch {
      onError("Failed to delete. Please try again.");
    }
  }, [entry.id, onClose, onDeleted, onError]);

  return {
    logDate, setLogDate, logTime, setLogTime, foodType, setFoodType, foodName, setFoodName, amountMl, setAmountMl,
    durationMinutes, setDurationMinutes, breastSide, setBreastSide, bottleContent, setBottleContent, reactionNotes,
    setReactionNotes, isConstipationSupport, setIsConstipationSupport, notes, setNotes, isSaving, confirmDelete,
    setConfirmDelete, handleSave, handleDelete,
  };
}
