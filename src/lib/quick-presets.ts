import { BITSS_TYPES, STOOL_COLORS } from "./constants";
import { getBottleContentLabel, getFoodTypeLabel, getBreastSideLabel } from "./feeding";
import { formatVolumeValue } from "./units";
import type {
  BottleContent,
  BreastSide,
  FeedingLogDraft,
  FeedingType,
  FoodType,
  PoopLogDraft,
  QuickPresetEntry,
  StoolColor,
  StoolSize,
  UnitSystem,
} from "./types";

export interface QuickFeedPreset {
  id: string;
  label: string;
  description: string;
  draft: Partial<FeedingLogDraft>;
}

export interface QuickPoopPreset {
  id: string;
  label: string;
  description: string;
  draft: Partial<PoopLogDraft>;
}

export interface QuickPresetRecordInput {
  label: string;
  description: string;
  draft_json: string;
  sort_order: number;
}

function getRequiredFeedTypes(feedingType: FeedingType): FoodType[] {
  if (feedingType === "breast" || feedingType === "mixed") {
    return ["breast_milk"];
  }
  if (feedingType === "formula") {
    return ["formula"];
  }
  return ["solids"];
}

export function ensureEssentialFeedPresets(
  presets: QuickFeedPreset[],
  feedingType: FeedingType,
  unitSystem: UnitSystem = "metric",
): QuickFeedPreset[] {
  const nextPresets = [...presets];
  const existingTypes = new Set(nextPresets.map((preset) => preset.draft.food_type).filter(Boolean));
  const defaultPresets = getDefaultQuickFeedPresets(feedingType, unitSystem);

  for (const requiredType of getRequiredFeedTypes(feedingType)) {
    if (existingTypes.has(requiredType)) continue;
    const fallbackPreset = defaultPresets.find((preset) => preset.draft.food_type === requiredType);
    if (!fallbackPreset) continue;
    nextPresets.unshift(fallbackPreset);
    existingTypes.add(requiredType);
  }

  return nextPresets.slice(0, 4);
}

export function getDefaultQuickFeedPresets(feedingType: FeedingType, unitSystem: UnitSystem = "metric"): QuickFeedPreset[] {
  const base: Array<Partial<FeedingLogDraft>> = feedingType === "breast"
    ? [
        { food_type: "breast_milk", breast_side: "left" },
        { food_type: "breast_milk", breast_side: "right" },
        { food_type: "pumping" },
        { food_type: "bottle" },
      ]
    : feedingType === "formula"
      ? [
          { food_type: "formula" },
          { food_type: "bottle" },
          { food_type: "water" },
          { food_type: "solids" },
        ]
      : feedingType === "solids"
        ? [
            { food_type: "solids", food_name: "Porridge" },
            { food_type: "water" },
            { food_type: "bottle" },
            { food_type: "other", food_name: "Snack" },
          ]
        : [
            { food_type: "breast_milk", breast_side: "left" },
            { food_type: "breast_milk", breast_side: "right" },
            { food_type: "bottle" },
            { food_type: "solids", food_name: "Solids" },
          ];

  return base.map((draft, index) => {
    const preview = describeFeedPresetDraft(draft, unitSystem);
    return {
      id: `default-feed-${index}`,
      label: preview.label,
      description: preview.description,
      draft,
    };
  });
}

export function getDefaultQuickPoopPresets(feedingType: FeedingType): QuickPoopPreset[] {
  const isBreastLean = feedingType === "breast";
  const base: Array<Partial<PoopLogDraft>> = isBreastLean
    ? [
        { stool_type: 5, color: "yellow", size: "medium" },
        { stool_type: 4, color: "yellow", size: "medium" },
        { stool_type: 2, color: "brown", size: "small" },
        { stool_type: 6, color: "yellow", size: "medium" },
      ]
    : [
        { stool_type: 4, color: "brown", size: "medium" },
        { stool_type: 2, color: "brown", size: "small" },
        { stool_type: 6, color: null, size: "medium" },
        { stool_type: 4, color: "brown", size: "large" },
      ];

  return base.map((draft, index) => {
    const preview = describePoopPresetDraft(draft);
    return {
      id: `default-poop-${index}`,
      label: preview.label,
      description: preview.description,
      draft,
    };
  });
}

export function describeFeedPresetDraft(draft: Partial<FeedingLogDraft>, unitSystem: UnitSystem = "metric"): {
  label: string;
  description: string;
} {
  const foodType = draft.food_type ?? "bottle";

  if ((foodType === "solids" || foodType === "other") && draft.food_name?.trim()) {
    return {
      label: draft.food_name.trim(),
      description: getFoodTypeLabel(foodType),
    };
  }

  if (foodType === "breast_milk") {
    const side = draft.breast_side ? getBreastSideLabel(draft.breast_side as BreastSide) : "Breastfeed";
    return {
      label: side,
      description: draft.duration_minutes?.trim() ? `${draft.duration_minutes.trim()} min` : "Timed breastfeed",
    };
  }

  if (foodType === "bottle") {
    const content = draft.bottle_content
      ? getBottleContentLabel(draft.bottle_content as BottleContent)
      : "Bottle";
    return {
      label: content,
      description: draft.amount_ml?.trim() ? formatVolumeValue(Number(draft.amount_ml.trim()), unitSystem) : "Bottle feed",
    };
  }

  return {
    label: getFoodTypeLabel(foodType as FoodType),
    description: draft.amount_ml?.trim()
      ? formatVolumeValue(Number(draft.amount_ml.trim()), unitSystem)
      : draft.duration_minutes?.trim()
        ? `${draft.duration_minutes.trim()} min`
        : "Quick feed",
  };
}

export function describePoopPresetDraft(draft: Partial<PoopLogDraft>): {
  label: string;
  description: string;
} {
  const stoolType = draft.stool_type ?? 4;
  const typeLabel = BITSS_TYPES.find((item) => item.type === stoolType)?.label ?? `Type ${stoolType}`;
  const shortTypeLabel = typeLabel.split(" ")[0] ?? typeLabel;
  const colorLabel = draft.color
    ? STOOL_COLORS.find((item) => item.value === draft.color)?.label ?? draft.color
    : null;
  const sizeLabel = draft.size ?? null;

  return {
    label: shortTypeLabel,
    description: [typeLabel, colorLabel, sizeLabel].filter(Boolean).join(", "),
  };
}

function parseFeedDraft(raw: string): Partial<FeedingLogDraft> | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FeedingLogDraft>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parsePoopDraft(raw: string): Partial<PoopLogDraft> | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PoopLogDraft>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function hydrateFeedPresets(entries: QuickPresetEntry[], unitSystem: UnitSystem = "metric"): QuickFeedPreset[] {
  return entries
    .map((entry) => {
      const draft = parseFeedDraft(entry.draft_json);
      if (!draft) return null;
      const preview = describeFeedPresetDraft(draft, unitSystem);
      return {
        id: entry.id,
        label: entry.label || preview.label,
        description: preview.description,
        draft,
      };
    })
    .filter((item): item is QuickFeedPreset => item !== null);
}

export function hydratePoopPresets(entries: QuickPresetEntry[]): QuickPoopPreset[] {
  return entries
    .map((entry) => {
      const draft = parsePoopDraft(entry.draft_json);
      if (!draft) return null;
      const preview = describePoopPresetDraft(draft);
      return {
        id: entry.id,
        label: preview.label,
        description: entry.description ?? preview.description,
        draft,
      };
    })
    .filter((item): item is QuickPoopPreset => item !== null);
}

export function buildFeedPresetRecordInput(
  presets: Array<QuickFeedPreset | Partial<FeedingLogDraft>>,
  unitSystem: UnitSystem = "metric",
): QuickPresetRecordInput[] {
  return presets.map((preset, index) => {
    const draft = "draft" in preset ? preset.draft : preset;
    const preview = describeFeedPresetDraft(draft, unitSystem);
    return {
      label: preview.label,
      description: preview.description,
      draft_json: JSON.stringify(draft),
      sort_order: index,
    };
  });
}

export function buildPoopPresetRecordInput(
  presets: Array<QuickPoopPreset | Partial<PoopLogDraft>>,
): QuickPresetRecordInput[] {
  return presets.map((preset, index) => {
    const draft = "draft" in preset ? preset.draft : preset;
    const preview = describePoopPresetDraft(draft);
    return {
      label: preview.label,
      description: preview.description,
      draft_json: JSON.stringify(draft),
      sort_order: index,
    };
  });
}

export function getDefaultFeedDraft(feedingType: FeedingType, unitSystem: UnitSystem = "metric"): Partial<FeedingLogDraft> {
  return getDefaultQuickFeedPresets(feedingType, unitSystem)[0]?.draft ?? { food_type: "bottle" };
}

export function getDefaultPoopDraft(feedingType: FeedingType): Partial<PoopLogDraft> {
  return getDefaultQuickPoopPresets(feedingType)[0]?.draft ?? { stool_type: 4, color: "brown", size: "medium" };
}

export const QUICK_POOP_COLORS: Array<{ value: StoolColor; label: string }> = STOOL_COLORS.map((item) => ({
  value: item.value as StoolColor,
  label: item.label,
}));

export const QUICK_POOP_SIZES: Array<{ value: StoolSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
