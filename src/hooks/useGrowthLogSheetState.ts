import { useCallback, useEffect, useMemo, useState } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime, getLocalDateTimeParts } from "../lib/utils";
import { formatGrowthValue, parseGrowthInputToMetric } from "../lib/units";
import type { GrowthEntry, UnitSystem } from "../lib/types";

export function useGrowthLogSheetState({
  open, childId, unitSystem, entry = null, onLogged, onDeleted, onClose, onError, onSuccess,
}: {
  open: boolean;
  childId: string;
  unitSystem: UnitSystem;
  entry?: GrowthEntry | null;
  onLogged: () => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const [measureDate, setMeasureDate] = useState(getCurrentLocalDate());
  const [measureTime, setMeasureTime] = useState(getCurrentLocalTime());
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const measureParts = entry?.measured_at ? getLocalDateTimeParts(entry.measured_at) : null;
    setMeasureDate(measureParts?.date ?? getCurrentLocalDate());
    setMeasureTime(measureParts?.time ?? getCurrentLocalTime());
    setWeightKg(entry?.weight_kg != null ? formatGrowthValue("weight_kg", entry.weight_kg, unitSystem, { includeUnit: false }) : "");
    setHeightCm(entry?.height_cm != null ? formatGrowthValue("height_cm", entry.height_cm, unitSystem, { includeUnit: false }) : "");
    setHeadCircumferenceCm(entry?.head_circumference_cm != null ? formatGrowthValue("head_circumference_cm", entry.head_circumference_cm, unitSystem, { includeUnit: false }) : "");
    setNotes(entry?.notes ?? "");
    setIsSubmitting(false);
    setConfirmDelete(false);
  }, [entry, open, unitSystem]);

  const hasAnyMeasurement = useMemo(
    () => Boolean(weightKg.trim() || heightCm.trim() || headCircumferenceCm.trim()),
    [headCircumferenceCm, heightCm, weightKg],
  );

  const handleSubmit = useCallback(async () => {
    if (!hasAnyMeasurement || isSubmitting) return false;
    setIsSubmitting(true);
    try {
      const payload = {
        measured_at: combineLocalDateAndTimeToUtcIso(measureDate, measureTime),
        weight_kg: parseGrowthInputToMetric("weight_kg", weightKg, unitSystem),
        height_cm: parseGrowthInputToMetric("height_cm", heightCm, unitSystem),
        head_circumference_cm: parseGrowthInputToMetric("head_circumference_cm", headCircumferenceCm, unitSystem),
        notes: notes.trim() || null,
      };
      if (entry) await db.updateGrowthLog(entry.id, payload);
      else await db.createGrowthLog({ child_id: childId, ...payload });
      await onLogged();
      onSuccess(entry ? "Growth measurement updated." : "Growth measurement saved.");
      onClose();
      return true;
    } catch {
      onError(entry ? "Could not update the growth measurement. Please try again." : "Could not save the growth measurement. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [childId, entry, hasAnyMeasurement, headCircumferenceCm, heightCm, isSubmitting, measureDate, measureTime, notes, onClose, onError, onLogged, onSuccess, unitSystem, weightKg]);

  const handleDelete = useCallback(async () => {
    if (!entry || !onDeleted) return false;
    try {
      await db.deleteGrowthLog(entry.id);
      await onDeleted();
      onSuccess("Growth measurement deleted.");
      onClose();
      return true;
    } catch {
      onError("Could not delete the growth measurement. Please try again.");
      return false;
    }
  }, [entry, onClose, onDeleted, onError, onSuccess]);

  return {
    measureDate, setMeasureDate, measureTime, setMeasureTime,
    weightKg, setWeightKg, heightCm, setHeightCm, headCircumferenceCm, setHeadCircumferenceCm,
    notes, setNotes, isSubmitting, confirmDelete, setConfirmDelete, hasAnyMeasurement,
    handleSubmit, handleDelete,
  };
}
