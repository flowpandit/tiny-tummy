import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AvatarCropper } from "./AvatarCropper";
import { invalidateAvatars } from "../../hooks/useAvatar";
import { cn } from "../../lib/cn";

interface AvatarUploadProps {
  /** Current avatar image URL (blob URL from loadPhoto) or null */
  currentImageUrl: string | null;
  /** Fallback: colored initial circle */
  fallbackColor: string;
  fallbackInitial: string;
  /** Called with the cropped blob when user saves */
  onSave: (blob: Blob) => Promise<void>;
  /** Called when user removes the photo */
  onRemove?: () => Promise<void>;
  size?: "sm" | "lg";
}

export function AvatarUpload({
  currentImageUrl,
  fallbackColor,
  fallbackInitial,
  onSave,
  onRemove,
  size = "lg",
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-lg";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawImageUrl(url);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCrop = async (blob: Blob) => {
    setIsSaving(true);
    await onSave(blob);
    setIsSaving(false);
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setRawImageUrl(null);
    invalidateAvatars();
  };

  const handleCancel = () => {
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setRawImageUrl(null);
  };

  return (
    <>
      {/* Avatar display + tap to upload */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative rounded-full overflow-hidden cursor-pointer group",
            sizeClass,
          )}
          aria-label="Upload avatar photo"
        >
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: fallbackColor }}
            >
              {fallbackInitial}
            </div>
          )}
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </div>
        </button>

        <span className="text-xs text-[var(--color-muted)]">Tap to change photo</span>

        {currentImageUrl && onRemove && (
          <button
            type="button"
            onClick={async () => { await onRemove(); invalidateAvatars(); }}
            className="text-xs text-[var(--color-alert)] cursor-pointer"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Cropper overlay */}
      <AnimatePresence>
        {rawImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col items-center justify-center p-4"
          >
            {isSaving ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-muted)]">Saving...</p>
              </div>
            ) : (
              <AvatarCropper
                imageUrl={rawImageUrl}
                onCrop={handleCrop}
                onCancel={handleCancel}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
