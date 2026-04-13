import type { FormEvent } from "react";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { LogSuccess } from "./LogSuccess";
import { LogDateTimeFields } from "./LogDateTimeFields";
import { DiaperTypePicker } from "./DiaperTypePicker";
import { UrineColorPicker } from "./UrineColorPicker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { FieldLabel, Textarea } from "../ui/field";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../lib/cn";
import { diaperIncludesStool, diaperIncludesWet } from "../../lib/diaper";
import { useDiaperLogFormState } from "../../hooks/useDiaperLogFormState";
import { useLoggingSheetLifecycle } from "../../hooks/useLoggingSheetLifecycle";
import { usePhotoField } from "../../hooks/usePhotoField";
import type { DiaperLogDraft, DiaperType } from "../../lib/types";

interface DiaperLogFormProps extends SheetVisibilityProps {
  childId: string;
  onLogged: () => void;
  initialDraft?: Partial<DiaperLogDraft> | null;
}

function showsUrineFields(type: DiaperType | null): boolean {
  return type ? diaperIncludesWet(type) : false;
}

function showsStoolFields(type: DiaperType | null): boolean {
  return type ? diaperIncludesStool(type) : false;
}

export function DiaperLogForm({
  open,
  onClose,
  childId,
  onLogged,
  initialDraft = null,
}: DiaperLogFormProps) {
  const { showError } = useToast();
  const { resolved } = useTheme();
  const nightMode = resolved === "night";
  const { fileInputRef, photoFile, photoPreview, resetPhoto, setPhotoFromChange } = usePhotoField();

  const { handleClose, handleLoggedSuccess } = useLoggingSheetLifecycle({
    onClose,
    onReset: resetPhoto,
    onLogged,
  });
  const {
    logDate, setLogDate, logTime, setLogTime, diaperType, setDiaperType, urineColor, setUrineColor,
    stoolType, setStoolType, color, setColor, size, setSize, notes, setNotes, isSubmitting, showSuccess, handleSubmit,
  } = useDiaperLogFormState({
    open, childId, initialDraft, onLoggedSuccess: handleLoggedSuccess, onError: showError, resetPhoto, photoFile,
  });

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      {showSuccess ? (
        <LogSuccess />
      ) : (
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void handleSubmit(); }} className="px-5 pb-8">
          <h2 className="mb-5 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Log a diaper
          </h2>

          <div className="flex flex-col gap-5">
            <LogDateTimeFields
              date={logDate}
              time={logTime}
              onDateChange={setLogDate}
              onTimeChange={setLogTime}
              nightMode={nightMode}
            />

            <DiaperTypePicker value={diaperType} onChange={setDiaperType} nightMode={nightMode} />

            {showsUrineFields(diaperType) && (
              <UrineColorPicker value={urineColor} onChange={setUrineColor} nightMode={nightMode} />
            )}

            {showsStoolFields(diaperType) && (
              <>
                <StoolTypePicker value={stoolType} onChange={setStoolType} nightMode={nightMode} />
                <ColorPicker value={color} onChange={setColor} nightMode={nightMode} />
                <SizePicker value={size} onChange={setSize} nightMode={nightMode} />
              </>
            )}

            <div>
              <FieldLabel htmlFor="diaper-notes">Notes (optional)</FieldLabel>
              <Textarea
                id="diaper-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything worth remembering..."
                rows={2}
                className={cn(nightMode && "border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500")}
              />
            </div>

            {showsStoolFields(diaperType) && (
              <div>
                <FieldLabel className="mb-1.5">Photo (optional)</FieldLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={setPhotoFromChange}
                  className="hidden"
                  id="diaper-photo-input"
                />
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Captured diaper"
                      className="h-20 w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={resetPhoto}
                      className="absolute -right-3 -top-3 flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--color-alert)] text-white"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-dashed px-4 text-sm transition-colors",
                      nightMode
                        ? "border-slate-700 text-slate-300 hover:border-slate-500"
                        : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                    )}
                  >
                    Take Photo
                  </button>
                )}
              </div>
            )}
          </div>

          <Button type="submit" variant="cta" size="lg" className="mt-6 w-full" disabled={isSubmitting || !diaperType}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
