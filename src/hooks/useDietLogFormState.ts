import { useCallback, useEffect, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import { parseVolumeInputToMl } from "../lib/units";
import type { BottleContent, BreastSide, FeedingLogDraft, FoodType, UnitSystem } from "../lib/types";

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

export function useDietLogFormState({
  open,
  childId,
  unitSystem,
  initialDraft,
  onLogged,
  onClose,
  onError,
}: {
  open: boolean;
  childId: string;
  unitSystem: UnitSystem;
  initialDraft?: Partial<FeedingLogDraft> | null;
  onLogged: () => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const db = useDbClient();
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

  useEffect(() => {
    if (open) {
      applyDraft(initialDraft);
    }
  }, [applyDraft, initialDraft, open]);

  const handleSubmit = useCallback(async () => {
    if (!foodType || isSubmitting) return false;
    const showsFoodName = foodType === "solids" || foodType === "other";
    const showsAmount = foodType === "breast_milk" || foodType === "formula" || foodType === "bottle" || foodType === "pumping" || foodType === "water";
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
      onError("Failed to save feed. Please try again.");
      return false;
    }

    setIsSubmitting(false);
    void onLogged();
    onClose();
    return true;
  }, [amountMl, bottleContent, breastSide, childId, durationMinutes, foodName, foodType, isConstipationSupport, isSubmitting, logDate, logTime, notes, onClose, onError, onLogged, reactionNotes, unitSystem]);

  return {
    logDate, setLogDate, logTime, setLogTime,
    foodType, setFoodType, foodName, setFoodName, amountMl, setAmountMl,
    durationMinutes, setDurationMinutes, breastSide, setBreastSide,
    bottleContent, setBottleContent, reactionNotes, setReactionNotes,
    isConstipationSupport, setIsConstipationSupport, notes, setNotes,
    isSubmitting, handleSubmit,
  };
}
