import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { DatePicker } from "../ui/date-picker";
import { FEEDING_TYPES, AVATAR_COLORS, CHILD_SEX_OPTIONS } from "../../lib/constants";
import { cn } from "../../lib/cn";
import * as db from "../../lib/db";
import { getCurrentLocalDate } from "../../lib/utils";
import type { Child, ChildSex, FeedingType } from "../../lib/types";

interface AddChildStepProps {
  onChildCreated: (child: Child) => void;
}

export function AddChildStep({ onChildCreated }: AddChildStepProps) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState(getCurrentLocalDate());
  const [sex, setSex] = useState<ChildSex | null>(null);
  const [feedingType, setFeedingType] = useState<FeedingType>("breast");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length > 0 && dob.length > 0 && sex !== null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    const child = await db.createChild({
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });
    onChildCreated(child);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-12">
      <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-text)] mb-2">
        Tell us about your baby
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-8">
        We'll personalize tracking based on their age and feeding type.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        {/* Name */}
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

        {/* Date of birth */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Date of birth
          </label>
          <DatePicker value={dob} onChange={setDob} max={getCurrentLocalDate()} label="Date of birth" />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Sex
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CHILD_SEX_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSex(option.value)}
                className={cn(
                  "h-11 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                  sex === option.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Needed for official growth percentile charts.
          </p>
        </div>

        {/* Feeding type */}
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

        {/* Avatar color */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
            Avatar color
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

        {/* Preview */}
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

        {/* Submit */}
        <div className="mt-auto pb-8">
          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
