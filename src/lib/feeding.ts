import { BOTTLE_CONTENTS, BREAST_SIDES, FOOD_TYPES } from "./diet-constants";
import type { BottleContent, BreastSide, DietEntry, FoodType } from "./types";

export function getFoodTypeLabel(foodType: FoodType): string {
  return FOOD_TYPES.find((item) => item.value === foodType)?.label ?? foodType;
}

export function getBottleContentLabel(content: BottleContent): string {
  return BOTTLE_CONTENTS.find((item) => item.value === content)?.label ?? content;
}

export function getBreastSideLabel(side: BreastSide): string {
  return BREAST_SIDES.find((item) => item.value === side)?.label ?? side;
}

export function getDietEntryPrimaryLabel(entry: DietEntry): string {
  if (entry.food_type === "solids" || entry.food_type === "other") {
    const typeLabel = getFoodTypeLabel(entry.food_type);
    return entry.food_name ? `${typeLabel}: ${entry.food_name}` : typeLabel;
  }

  if (entry.food_type === "bottle") {
    return entry.bottle_content
      ? `Bottle: ${getBottleContentLabel(entry.bottle_content)}`
      : "Bottle";
  }

  return getFoodTypeLabel(entry.food_type);
}

export function getDietEntryDetailParts(entry: DietEntry): string[] {
  const parts: string[] = [];

  if (entry.breast_side) {
    parts.push(getBreastSideLabel(entry.breast_side));
  }

  if (entry.amount_ml !== null) {
    parts.push(`${entry.amount_ml} ml`);
  }

  if (entry.duration_minutes !== null) {
    parts.push(`${entry.duration_minutes} min`);
  }

  if (entry.is_constipation_support) {
    parts.push("constipation support");
  }

  return parts;
}

export function getDietEntryDisplayLabel(entry: DietEntry): string {
  const details = getDietEntryDetailParts(entry);
  const primary = getDietEntryPrimaryLabel(entry);
  return details.length > 0 ? `${primary} · ${details.join(" · ")}` : primary;
}

export function getDietEntrySecondaryText(entry: DietEntry): string | null {
  return entry.reaction_notes ?? entry.notes ?? null;
}
