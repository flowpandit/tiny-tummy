import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { DatePicker } from "../components/ui/date-picker";
import { FieldLabel, Input } from "../components/ui/field";
import { SegmentedControl } from "../components/ui/segmented-control";
import { AvatarUpload } from "../components/child/AvatarUpload";
import { FEEDING_TYPES, AVATAR_COLORS, CHILD_SEX_OPTIONS } from "../lib/constants";
import { cn } from "../lib/cn";
import { useCreateChildAction } from "../hooks/useCreateChildAction";
import { useChildActions } from "../contexts/ChildContext";
import { useToast } from "../components/ui/toast";
import { Header } from "../components/layout/Header";
import { getCurrentLocalDate } from "../lib/utils";
import type { ChildSex, FeedingType } from "../lib/types";

export function AddChild() {
  const navigate = useNavigate();
  const { refreshChildren, setActiveChildId } = useChildActions();
  const { showError } = useToast();
  const createChild = useCreateChildAction();
  const [name, setName] = useState("");
  const [dob, setDob] = useState(getCurrentLocalDate());
  const [sex, setSex] = useState<ChildSex | null>(null);
  const [feedingType, setFeedingType] = useState<FeedingType>("breast");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length > 0 && dob.length > 0 && sex !== null;

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
      const child = await createChild({ name, dob, sex, feedingType, avatarColor, avatarBlob });

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
    <div
      className="min-h-[100dvh] bg-[var(--color-bg)] flex flex-col px-6"
      style={{
        paddingTop: "calc(var(--safe-area-top) + 94px)",
      }}
    >
      <Header showBackButton fallbackTo="/settings" />

      <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-text)] mb-2">
        Add a child
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Track another little one's bowel health.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        <div>
          <FieldLabel htmlFor="child-name">Baby's name</FieldLabel>
          <Input
            id="child-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Luna"
            autoComplete="off"
          />
        </div>

        <div>
          <FieldLabel>Date of birth</FieldLabel>
          <DatePicker value={dob} onChange={setDob} max={getCurrentLocalDate()} label="Date of birth" />
        </div>

        <div>
          <FieldLabel>Sex</FieldLabel>
          <SegmentedControl
            value={sex}
            onChange={(value) => setSex(value as ChildSex)}
            options={CHILD_SEX_OPTIONS}
            gridClassName="grid-cols-2"
          />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Used for official growth percentile calculations.
          </p>
        </div>

        <div>
          <FieldLabel>Feeding type</FieldLabel>
          <SegmentedControl
            value={feedingType}
            onChange={setFeedingType}
            options={FEEDING_TYPES}
            gridClassName="grid-cols-2"
          />
        </div>

        {/* Avatar photo */}
        <div>
          <FieldLabel>
            Photo (optional)
          </FieldLabel>
          <AvatarUpload
            currentImageUrl={avatarPreview}
            fallbackColor={avatarColor}
            fallbackInitial={name.trim().charAt(0).toUpperCase() || "?"}
            onSave={handleAvatarSave}
            size="lg"
          />
        </div>

        <div>
          <FieldLabel>
            Avatar color {avatarPreview && <span className="text-[var(--color-muted)] font-normal">(fallback)</span>}
          </FieldLabel>
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
                  {[sex ? CHILD_SEX_OPTIONS.find((option) => option.value === sex)?.label : null, FEEDING_TYPES.find((f) => f.value === feedingType)?.label]
                    .filter(Boolean)
                    .join(" · ")}
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
            data-testid="add-child-submit"
          >
            {isSubmitting ? "Adding..." : "Add Child"}
          </Button>
        </div>
      </form>
    </div>
  );
}
