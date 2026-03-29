import { useState, useRef, useEffect, type FormEvent } from "react";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { StoolTypePicker } from "./StoolTypePicker";
import { ColorPicker } from "./ColorPicker";
import { SizePicker } from "./SizePicker";
import { LogSuccess } from "./LogSuccess";
import * as db from "../../lib/db";
import { savePhoto } from "../../lib/photos";
import { cn } from "../../lib/cn";
import { isNightLoggingWindow } from "../../lib/logging-ui";
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

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // "HH:MM"
}

function combineToISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function LogForm({ open, onClose, childId, onLogged, initialDraft = null }: LogFormProps) {
  const { showError } = useToast();
  const [logDate, setLogDate] = useState(getCurrentDate());
  const [logTime, setLogTime] = useState(getCurrentTime());
  const [stoolType, setStoolType] = useState<number | null>(null);
  const [color, setColor] = useState<StoolColor | null>(null);
  const [size, setSize] = useState<StoolSize | null>(null);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyDraft = (draft?: Partial<PoopLogDraft> | null) => {
    const nextDraft = { ...EMPTY_DRAFT, ...draft };
    setLogDate(getCurrentDate());
    setLogTime(getCurrentTime());
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
      setNightMode(isNightLoggingWindow());
      applyDraft(initialDraft);
    }
  }, [open, initialDraft]);

  const reset = () => {
    applyDraft(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
        logged_at: combineToISO(logDate, logTime),
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

  const fieldLabelClassName = cn("block text-sm font-medium mb-1.5", nightMode ? "text-slate-100" : "text-[var(--color-text)]");
  const textareaClassName = cn(
    "w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm resize-none outline-none transition-colors",
    nightMode
      ? "border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
  );

  return (
    <Sheet open={open} onClose={handleClose} tone={nightMode ? "night" : "default"}>
      {showSuccess ? (
        <LogSuccess />
      ) : (
        <form onSubmit={handleSubmit} className="px-5 pb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={cn("font-[var(--font-display)] text-lg font-semibold text-center", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
              Log a poop
            </h2>
            <button
              type="button"
              onClick={() => setNightMode((current) => !current)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                nightMode
                  ? "border-slate-600 bg-slate-800 text-slate-100"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
              )}
            >
              {nightMode ? "Night on" : "Night off"}
            </button>
          </div>

          {nightMode && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-slate-700 bg-slate-900/90 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Low-light mode</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Larger targets and darker surfaces for late-night logging.
              </p>
            </div>
          )}

          {(stoolType || color || size) && (
            <div className={cn("mb-4 rounded-[var(--radius-md)] border px-3 py-3", nightMode ? "border-slate-700 bg-slate-900/90" : "border-[var(--color-primary)]/15 bg-[var(--color-primary)]/10")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                Quick preset
              </p>
              <p className={cn("mt-1 text-sm leading-relaxed", nightMode ? "text-slate-300" : "text-[var(--color-text-secondary)]")}>
                This form started with a common poop pattern. Adjust anything before saving if needed.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Date & time */}
            <div>
              <label className={fieldLabelClassName}>
                When
              </label>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={logDate} onChange={setLogDate} max={getCurrentDate()} nightMode={nightMode} />
                <TimePicker value={logTime} onChange={setLogTime} nightMode={nightMode} />
              </div>
            </div>

            <StoolTypePicker value={stoolType} onChange={setStoolType} nightMode={nightMode} />
            <ColorPicker value={color} onChange={setColor} nightMode={nightMode} />
            <SizePicker value={size} onChange={setSize} nightMode={nightMode} />

            {/* Notes */}
            <div>
              <label htmlFor="log-notes" className={fieldLabelClassName}>
                Notes (optional)
              </label>
              <textarea
                id="log-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations..."
                rows={2}
                className={textareaClassName}
              />
            </div>

            {/* Photo */}
            <div>
              <label className={fieldLabelClassName}>
                Photo (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
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
                    onClick={removePhoto}
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
