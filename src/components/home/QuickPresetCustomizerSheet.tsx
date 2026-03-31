import { useEffect, useState, type ReactNode } from "react";
import { useUnits } from "../../contexts/UnitsContext";
import { Sheet } from "../ui/sheet";
import { Button } from "../ui/button";
import { FieldLabel, Input, fieldInputClassName } from "../ui/field";
import { SegmentedControl } from "../ui/segmented-control";
import { BITSS_TYPES, STOOL_SIZES, STOOL_COLORS } from "../../lib/constants";
import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "../../lib/diet-constants";
import {
  describeFeedPresetDraft,
  describePoopPresetDraft,
  getDefaultFeedDraft,
  getDefaultQuickFeedPresets,
  getDefaultQuickPoopPresets,
  getDefaultPoopDraft,
  type QuickFeedPreset,
  type QuickPoopPreset,
} from "../../lib/quick-presets";
import { formatVolumeValue, getVolumeUnitLabel } from "../../lib/units";
import type {
  FeedingLogDraft,
  FeedingType,
  FoodType,
  PoopLogDraft,
  StoolColor,
  StoolSize,
} from "../../lib/types";

interface FeedPresetEditorSheetProps {
  open: boolean;
  onClose: () => void;
  feedingType: FeedingType;
  presets: QuickFeedPreset[];
  onSave: (drafts: Array<Partial<FeedingLogDraft>>) => void;
}

interface PoopPresetEditorSheetProps {
  open: boolean;
  onClose: () => void;
  feedingType: FeedingType;
  presets: QuickPoopPreset[];
  onSave: (drafts: Array<Partial<PoopLogDraft>>) => void;
}

function EditorFrame({
  open,
  onClose,
  title,
  description,
  children,
  onReset,
  onSave,
  saveLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  onReset: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        <h2 className="mb-2 text-center font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
          {title}
        </h2>
        <p className="mb-5 text-center text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {description}
        </p>

        <div className="flex flex-col gap-4">
          {children}
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onReset}>
            Reset
          </Button>
          <Button type="button" variant="cta" className="flex-1" onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function FeedPresetEditorSheet({
  open,
  onClose,
  feedingType,
  presets,
  onSave,
}: FeedPresetEditorSheetProps) {
  const { unitSystem } = useUnits();
  const [drafts, setDrafts] = useState<Array<Partial<FeedingLogDraft>>>([]);
  const volumeUnit = getVolumeUnitLabel(unitSystem);

  const toEditorDraft = (draft: Partial<FeedingLogDraft>): Partial<FeedingLogDraft> => ({
    ...draft,
    amount_ml: draft.amount_ml?.trim()
      ? formatVolumeValue(Number(draft.amount_ml), unitSystem, { includeUnit: false })
      : "",
  });

  const toStoredDraft = (draft: Partial<FeedingLogDraft>): Partial<FeedingLogDraft> => {
    const amount = draft.amount_ml?.trim();
    if (!amount) {
      return { ...draft, amount_ml: "" };
    }

    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ...draft, amount_ml: "" };
    }

    const canonicalMl = unitSystem === "imperial"
      ? Math.round(parsed * 29.5735295625)
      : Math.round(parsed);

    return { ...draft, amount_ml: String(canonicalMl) };
  };

  useEffect(() => {
    if (!open) return;
    setDrafts(presets.map((preset) => toEditorDraft(preset.draft)));
  }, [open, presets, unitSystem]);

  const updateDraft = (index: number, updates: Partial<FeedingLogDraft>) => {
    setDrafts((current) => current.map((draft, currentIndex) => (
      currentIndex === index ? { ...draft, ...updates } : draft
    )));
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const addDraft = () => {
    setDrafts((current) => [...current, toEditorDraft({ ...getDefaultFeedDraft(feedingType, unitSystem) })]);
  };

  return (
    <EditorFrame
      open={open}
      onClose={onClose}
      title="Customize quick feed tiles"
      description="Choose the feed types that should appear on Home. Tile names are generated from what you enter here."
      onReset={() => setDrafts(getDefaultQuickFeedPresets(feedingType, unitSystem).map((preset) => toEditorDraft({ ...preset.draft })))}
      onSave={() => onSave(drafts.map(toStoredDraft))}
      saveLabel="Save feed tiles"
    >
      {drafts.map((draft, index) => {
        const preview = describeFeedPresetDraft(toStoredDraft(draft), unitSystem);
        const foodType = draft.food_type ?? "bottle";
        const showFoodName = foodType === "solids" || foodType === "other";
        const showBottleContent = foodType === "bottle";
        const showAmount = foodType === "bottle" || foodType === "formula" || foodType === "water" || foodType === "pumping";
        const showDuration = foodType === "breast_milk" || foodType === "pumping";

        return (
          <div
            key={`feed-preset-${index}`}
            className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Tile {index + 1}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {preview.label} · {preview.description}
                </p>
              </div>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDraft(index)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <FieldLabel>Feed type</FieldLabel>
                <select
                  value={foodType}
                  onChange={(event) => {
                    const nextType = event.target.value as FoodType;
                    updateDraft(index, {
                      food_type: nextType,
                      food_name: nextType === "solids" || nextType === "other" ? draft.food_name ?? "" : "",
                      bottle_content: nextType === "bottle" ? draft.bottle_content ?? "formula" : null,
                      breast_side: nextType === "breast_milk" ? draft.breast_side ?? "left" : null,
                      amount_ml: nextType === "bottle" || nextType === "formula" || nextType === "water" || nextType === "pumping"
                        ? draft.amount_ml ?? ""
                        : "",
                      duration_minutes: nextType === "breast_milk" || nextType === "pumping"
                        ? draft.duration_minutes ?? ""
                        : "",
                    });
                  }}
                  className={fieldInputClassName}
                >
                  {FOOD_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {foodType === "breast_milk" && (
                <div>
                  <FieldLabel>Breast side</FieldLabel>
                  <SegmentedControl
                    value={draft.breast_side ?? "left"}
                    onChange={(value) => updateDraft(index, { breast_side: value })}
                    options={BREAST_SIDES.filter((option) => option.value !== "both")}
                    gridClassName="grid-cols-2"
                  />
                </div>
              )}

              {showBottleContent && (
                <div>
                  <FieldLabel>Bottle content</FieldLabel>
                  <SegmentedControl
                    value={draft.bottle_content ?? "formula"}
                    onChange={(value) => updateDraft(index, { bottle_content: value })}
                    options={BOTTLE_CONTENTS}
                    gridClassName="grid-cols-3"
                    size="sm"
                  />
                </div>
              )}

              {showFoodName && (
                <div>
                  <FieldLabel>Food name</FieldLabel>
                  <Input
                    value={draft.food_name ?? ""}
                    onChange={(event) => updateDraft(index, { food_name: event.target.value })}
                    placeholder={foodType === "solids" ? "Pasta, porridge, banana..." : "Custom label"}
                  />
                </div>
              )}

              {(showAmount || showDuration) && (
                <div className={`grid gap-3 ${showAmount && showDuration ? "grid-cols-2" : "grid-cols-1"}`}>
                  {showAmount && (
                    <div>
                      <FieldLabel>Amount ({volumeUnit})</FieldLabel>
                      <Input
                        inputMode="numeric"
                        value={draft.amount_ml ?? ""}
                        onChange={(event) => updateDraft(index, { amount_ml: event.target.value })}
                        placeholder={unitSystem === "imperial" ? "4.0" : "120"}
                      />
                    </div>
                  )}
                  {showDuration && (
                    <div>
                      <FieldLabel>Duration (min)</FieldLabel>
                      <Input
                        inputMode="numeric"
                        value={draft.duration_minutes ?? ""}
                        onChange={(event) => updateDraft(index, { duration_minutes: event.target.value })}
                        placeholder="12"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" onClick={addDraft}>
        Add feed tile
      </Button>
    </EditorFrame>
  );
}

export function PoopPresetEditorSheet({
  open,
  onClose,
  feedingType,
  presets,
  onSave,
}: PoopPresetEditorSheetProps) {
  const [drafts, setDrafts] = useState<Array<Partial<PoopLogDraft>>>([]);

  useEffect(() => {
    if (!open) return;
    setDrafts(presets.map((preset) => ({ ...preset.draft })));
  }, [open, presets]);

  const updateDraft = (index: number, updates: Partial<PoopLogDraft>) => {
    setDrafts((current) => current.map((draft, currentIndex) => (
      currentIndex === index ? { ...draft, ...updates } : draft
    )));
  };

  const removeDraft = (index: number) => {
    setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const addDraft = () => {
    setDrafts((current) => [...current, { ...getDefaultPoopDraft(feedingType) }]);
  };

  return (
    <EditorFrame
      open={open}
      onClose={onClose}
      title="Customize quick poop tiles"
      description="Save the patterns you log most often. Tile names are generated from the stool pattern you choose."
      onReset={() => setDrafts(getDefaultQuickPoopPresets(feedingType).map((preset) => ({ ...preset.draft })))}
      onSave={() => onSave(drafts)}
      saveLabel="Save poop tiles"
    >
      {drafts.map((draft, index) => {
        const preview = describePoopPresetDraft(draft);
        return (
          <div
            key={`poop-preset-${index}`}
            className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Tile {index + 1}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {preview.label} · {preview.description}
                </p>
              </div>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDraft(index)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <FieldLabel>Bristol type</FieldLabel>
                <select
                  value={draft.stool_type ?? 4}
                  onChange={(event) => updateDraft(index, { stool_type: Number(event.target.value) })}
                  className={fieldInputClassName}
                >
                  {BITSS_TYPES.map((option) => (
                    <option key={option.type} value={option.type}>
                      Type {option.type} · {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Color</FieldLabel>
                <select
                  value={draft.color ?? "brown"}
                  onChange={(event) => updateDraft(index, { color: event.target.value as StoolColor })}
                  className={fieldInputClassName}
                >
                  {STOOL_COLORS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Size</FieldLabel>
                <SegmentedControl
                  value={draft.size ?? "medium"}
                  onChange={(value) => updateDraft(index, { size: value as StoolSize })}
                  options={STOOL_SIZES}
                  gridClassName="grid-cols-3"
                  size="sm"
                />
              </div>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" onClick={addDraft}>
        Add poop tile
      </Button>
    </EditorFrame>
  );
}
