import { useState, useRef, useEffect, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { LogSuccess } from "./LogSuccess";
import { DiaperTypePicker } from "./DiaperTypePicker";
import { UrineColorPicker } from "./UrineColorPicker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { FieldLabel, Textarea } from "../ui/field";
import { useTheme } from "../../contexts/ThemeContext";
import { cn } from "../../lib/cn";
import { savePhoto } from "../../lib/photos";
import * as db from "../../lib/db";
import type { DiaperLogDraft, DiaperType, StoolColor, StoolSize, UrineColor } from "../../lib/types";

const EMPTY_DRAFT: DiaperLogDraft = {
  diaper_type: null,
  urine_color: null,
  stool_type: null,
  color: null,
  size: null,
  notes: "",
};

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function showsUrineFields(type: DiaperType | null): boolean {
  return type === "wet" || type === "mixed";
}

function showsStoolFields(type: DiaperType | null): boolean {
  return type === "dirty" || type === "mixed";
}

export function DiaperLogForm({
  open,
  onClose,
  childId,
  onLogged,
  initialDraft = null,
}: {
  open: boolean;
  onClose: () => void;
  childId: string;
  onLogged: () => void;
  initialDraft?: Partial<DiaperLogDraft> | null;
}) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(getCurrentDate());
  const [logTime, setLogTime] = useState(getCurrentTime());
  const [diaperType, setDiaperType] = useState<DiaperType | null>(null);
  const [urineColor, setUrineColor] = useState<UrineColor | null>(null);
  const [stoolType, setStoolType] = useState<number | null>(null);
  const [color, setColor] = useState<StoolColor | null>(null);
  const [size, setSize] = useState<StoolSize | null>(null);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { resolved } = useTheme();
  const nightMode = resolved === "night";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyDraft = (draft?: Partial<DiaperLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentDate());
    setLogTime(getCurrentTime());
    setDiaperType(nextDraft.diaper_type);
    setUrineColor(nextDraft.urine_color);
    setStoolType(nextDraft.stool_type);
    setColor(nextDraft.color);
    setSize(nextDraft.size);
    setNotes(nextDraft.notes);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setShowSuccess(false);
  };

  useEffect(() => {
    if (open) {
      applyDraft(initialDraft);
    }
  }, [open, initialDraft]);

  const reset = () => applyDraft(null);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !diaperType) return;

    setIsSubmitting(true);
    try {
      let photoPath: string | null = null;
      if (photoFile) {
        try { photoPath = await savePhoto(photoFile); } catch { /* photo save is non-critical */ }
      }

      await db.createDiaperLog({
        child_id: childId,
        logged_at: combineToISO(logDate, logTime),
        diaper_type: diaperType,
        urine_color: showsUrineFields(diaperType) ? urineColor : null,
        stool_type: showsStoolFields(diaperType) ? stoolType : null,
        color: showsStoolFields(diaperType) ? color : null,
        size: showsStoolFields(diaperType) ? size : null,
        notes: notes.trim() || null,
        photo_path: photoPath,
      });
    } catch {
      setIsSubmitting(false);
      showError("Failed to save diaper log. Please try again.");
      return;
    }

    setIsSubmitting(false);
    setShowSuccess(true);

    setTimeout(() => {
      onLogged();
      onClose();
      setTimeout(reset, 300);
    }, 1200);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      {showSuccess ? (
        <LogSuccess />
      ) : (
        <form onSubmit={handleSubmit} className="px-5 pb-8">
          <h2 className="mb-5 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Log a diaper
          </h2>

          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel className="mb-1.5">When</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} nightMode={nightMode} />
                <TimePicker value={logTime} onChange={setLogTime} nightMode={nightMode} />
              </div>
            </div>

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
                  onChange={handlePhotoChange}
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
                      onClick={removePhoto}
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
