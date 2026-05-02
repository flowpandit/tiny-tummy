import { useEffect, useState } from "react";
import { FieldLabel, Input } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { DatePicker } from "../ui/date-picker";
import { Sheet, type SheetVisibilityProps } from "../ui/sheet";
import { Button } from "../ui/button";
import { AvatarUpload } from "../child/AvatarUpload";
import { AVATAR_COLORS, CHILD_SEX_OPTIONS, FEEDING_TYPES } from "../../lib/constants";
import { cn } from "../../lib/cn";
import { useUpdateChildAction } from "../../hooks/useSettingsActions";
import { getCurrentLocalDate } from "../../lib/utils";
import { saveAvatar, deleteAvatar } from "../../lib/photos";
import type { Child, ChildSex, FeedingType } from "../../lib/types";

interface EditChildSheetProps extends SheetVisibilityProps {
  child: Child;
  onSaved: () => void;
}

export function EditChildSheet({
  child,
  open,
  onClose,
  onSaved,
}: EditChildSheetProps) {
  const [name, setName] = useState(child.name);
  const [dob, setDob] = useState(child.date_of_birth);
  const [sex, setSex] = useState<ChildSex | null>(child.sex);
  const [feedingType, setFeedingType] = useState<FeedingType>(child.feeding_type);
  const [avatarColor, setAvatarColor] = useState(child.avatar_color);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const updateChild = useUpdateChildAction({ child, onSaved, onClose });

  useEffect(() => {
    let cancelled = false;

    setAvatarUrl(null);
    import("../../lib/photos").then(({ loadAvatar }) => {
      loadAvatar(child.id).then((nextAvatarUrl) => {
        if (!cancelled) {
          setAvatarUrl(nextAvatarUrl);
        } else if (nextAvatarUrl) {
          URL.revokeObjectURL(nextAvatarUrl);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const handleAvatarSave = async (blob: Blob) => {
    await saveAvatar(child.id, blob);
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(URL.createObjectURL(blob));
  };

  const handleAvatarRemove = async () => {
    await deleteAvatar(child.id);
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateChild({ name, dob, sex, feedingType, avatarColor });
    setIsSaving(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        <h2 className="mb-5 text-center text-lg font-semibold text-[var(--color-text)]">
          Edit {child.name}
        </h2>

        <div className="flex flex-col gap-4">
          <AvatarUpload
            currentImageUrl={avatarUrl}
            fallbackColor={avatarColor}
            fallbackInitial={name.trim().charAt(0).toUpperCase() || child.name.charAt(0).toUpperCase()}
            onSave={handleAvatarSave}
            onRemove={handleAvatarRemove}
            size="lg"
          />

          <div>
            <FieldLabel htmlFor="edit-name">Name</FieldLabel>
            <Input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
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
              size="sm"
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Growth percentiles need this to match the right chart.
            </p>
          </div>

          <div>
            <FieldLabel>Feeding type</FieldLabel>
            <SegmentedControl
              value={feedingType}
              onChange={setFeedingType}
              options={FEEDING_TYPES}
              gridClassName="grid-cols-2"
              size="sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Avatar color</label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={cn(
                    "h-9 w-9 cursor-pointer rounded-full transition-transform duration-200",
                    avatarColor === color && "scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          variant="cta"
          size="lg"
          className="mt-6 w-full"
          onClick={handleSave}
          disabled={!name.trim() || !dob || isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Sheet>
  );
}
