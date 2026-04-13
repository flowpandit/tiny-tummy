import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { LogSuccess } from "./LogSuccess";
import { LogDateTimeFields } from "./LogDateTimeFields";
import * as db from "../../lib/db";
import { savePhoto } from "../../lib/photos";
import { cn } from "../../lib/cn";
import { useTheme } from "../../contexts/ThemeContext";
import { FieldLabel, Textarea } from "../ui/field";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../../lib/utils";
import { useLoggingSheetLifecycle } from "../../hooks/useLoggingSheetLifecycle";
import { usePhotoField } from "../../hooks/usePhotoField";
import {
  LoggingFormHeader,
  LoggingPresetNotice,
} from "./logging-form-primitives";
import { getLoggingLabelClassName } from "./logging-form-classnames";
import type { PoopLogDraft, StoolColor, StoolSize } from "../../lib/types";

const EMPTY_DRAFT: PoopLogDraft = {
  stool_type: null,
  color: null,
  size: null,
  notes: "",
};

interface LogFormProps {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => void;
  initialDraft?: Partial<PoopLogDraft> | null;
}

export function LogForm({ open, onClose, childId, onLogged, initialDraft = null }: LogFormProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(getCurrentLocalDate());
  const [logTime, setLogTime] = useState(getCurrentLocalTime());
  const [stoolType, setStoolType] = useState<number | null>(null);
  const [color, setColor] = useState<StoolColor | null>(null);
  const [size, setSize] = useState<StoolSize | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { resolved } = useTheme();
  const nightMode = resolved === "night";
  const { fileInputRef, photoFile, photoPreview, resetPhoto, setPhotoFromChange } = usePhotoField();

  const applyDraft = useCallback((draft?: Partial<PoopLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentLocalDate());
    setLogTime(getCurrentLocalTime());
    setStoolType(nextDraft.stool_type);
    setColor(nextDraft.color);
    setSize(nextDraft.size);
    setNotes(nextDraft.notes);
    resetPhoto();
    setShowSuccess(false);
  }, [resetPhoto]);

  const { handleClose, handleLoggedSuccess } = useLoggingSheetLifecycle({
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
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photoFile) {
        try { photoPath = await savePhoto(photoFile); } catch { /* photo save is non-critical */ }
      }

      await db.createPoopLog({
        child_id: childId,
        logged_at: combineLocalDateAndTimeToUtcIso(logDate, logTime),
        stool_type: stoolType,
        color,
        size,
        notes: notes.trim() || null,
        photo_path: photoPath,
      });
    } catch {
      setIsSubmitting(false);
      showError("Failed to save entry. Please try again.");
      return;
    }

    setIsSubmitting(false);
    setShowSuccess(true);
    handleLoggedSuccess();
  };

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      {showSuccess ? (
        <LogSuccess />
      ) : (
        <form onSubmit={handleSubmit} className="px-5 pb-8">
          <LoggingFormHeader title="Log a poop" isNight={nightMode} />

          {(stoolType || color || size) && (
            <LoggingPresetNotice
              isNight={nightMode}
              description="This form started with a common poop pattern. Adjust anything before saving if needed."
            />
          )}

          <div className="flex flex-col gap-5">
            <LogDateTimeFields
              date={logDate}
              time={logTime}
              onDateChange={setLogDate}
              onTimeChange={setLogTime}
              nightMode={nightMode}
            />

            <StoolTypePicker value={stoolType} onChange={setStoolType} nightMode={nightMode} />
            <ColorPicker value={color} onChange={setColor} nightMode={nightMode} />
            <SizePicker value={size} onChange={setSize} nightMode={nightMode} />

            <div>
              <FieldLabel htmlFor="log-notes" className={getLoggingLabelClassName(nightMode)}>
                Notes (optional)
              </FieldLabel>
              <Textarea
                id="log-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations..."
                rows={2}
                className={cn(nightMode && "border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500")}
              />
            </div>

            <div>
              <FieldLabel className={getLoggingLabelClassName(nightMode)}>
                Photo (optional)
              </FieldLabel>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={setPhotoFromChange}
                className="hidden"
                id="photo-input"
              />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Captured photo"
                    className="w-20 h-20 object-cover rounded-[var(--radius-md)] border border-[var(--color-border)]"
                  />
                  <button
                    type="button"
                    onClick={resetPhoto}
                    className="absolute -top-3 -right-3 w-8 h-8 min-w-[44px] min-h-[44px] rounded-full bg-[var(--color-alert)] text-white flex items-center justify-center cursor-pointer"
                    aria-label="Remove photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-2 px-4 rounded-[var(--radius-md)] border border-dashed text-sm cursor-pointer transition-colors",
                    nightMode
                      ? "h-11 border-slate-700 text-slate-300 hover:border-slate-500"
                      : "h-11 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                    <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                  </svg>
                  Take Photo
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            className={cn("w-full mt-6", nightMode && "shadow-none")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
