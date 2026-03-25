import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { DatePicker } from "../components/ui/date-picker";
import { AvatarUpload } from "../components/child/AvatarUpload";
import { FEEDING_TYPES, AVATAR_COLORS } from "../lib/constants";
import { cn } from "../lib/cn";
import * as db from "../lib/db";
import { saveAvatar } from "../lib/photos";
import { useChildContext } from "../contexts/ChildContext";
import { useToast } from "../components/ui/toast";
import type { FeedingType } from "../lib/types";

export function AddChild() {
  const navigate = useNavigate();
  const { refreshChildren, setActiveChildId } = useChildContext();
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [dob, setDob] = useState(new Date().toISOString().split("T")[0]);
  const [feedingType, setFeedingType] = useState<FeedingType>("breast");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length > 0 && dob.length > 0;

  const handleAvatarSave = async (blob: Blob) => {
    setAvatarBlob(blob);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(blob));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const child = await db.createChild({
        name: name.trim(),
        date_of_birth: dob,
        feeding_type: feedingType,
        avatar_color: avatarColor,
      });

      if (avatarBlob) {
        try { await saveAvatar(child.id, avatarBlob); } catch { /* avatar save is non-critical */ }
      }

      await refreshChildren();
      setActiveChildId(child.id);
      navigate("/", { replace: true });
    } catch {
      showError("Failed to add child. Please try again.");
      setIsSubmitting(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col px-6 pt-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-[var(--color-primary)] cursor-pointer mb-4 self-start"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Back
      </button>

      <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-text)] mb-2">
        Add a child
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Track another little one's bowel health.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        <div>
          <label htmlFor="child-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Baby's name
          </label>
          <input
            id="child-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Luna"
            className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Date of birth
          </label>
          <DatePicker value={dob} onChange={setDob} max={new Date().toISOString().split("T")[0]} label="Date of birth" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Feeding type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FEEDING_TYPES.map((ft) => (
              <button
                key={ft.value}
                type="button"
                onClick={() => setFeedingType(ft.value)}
                className={cn(
                  "h-11 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                  feedingType === ft.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                )}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar photo */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Photo (optional)
          </label>
          <AvatarUpload
            currentImageUrl={avatarPreview}
            fallbackColor={avatarColor}
            fallbackInitial={name.trim().charAt(0).toUpperCase() || "?"}
            onSave={handleAvatarSave}
            size="lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Avatar color {avatarPreview && <span className="text-[var(--color-muted)] font-normal">(fallback)</span>}
          </label>
          <div className="flex gap-3">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                className={cn(
                  "w-10 h-10 rounded-full cursor-pointer transition-transform duration-200",
                  avatarColor === color && "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110",
                )}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        {name.trim() && (
          <Card className="mt-2">
            <CardContent className="flex items-center gap-3 py-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: avatarColor }}
              >
                {name.trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-[var(--color-text)]">{name.trim()}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {FEEDING_TYPES.find((f) => f.value === feedingType)?.label}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-auto pb-8">
          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Child"}
          </Button>
        </div>
      </form>
    </div>
  );
}
