import type { BottleContent, BreastSide, FoodType } from "./types";

export const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "breast_milk", label: "Breastfeed" },
  { value: "formula", label: "Formula" },
  { value: "bottle", label: "Bottle" },
  { value: "pumping", label: "Pumping" },
  { value: "solids", label: "Solids" },
  { value: "water", label: "Water" },
  { value: "other", label: "Other" },
];

export const BOTTLE_CONTENTS: { value: BottleContent; label: string }[] = [
  { value: "breast_milk", label: "Breast milk" },
  { value: "formula", label: "Formula" },
  { value: "mixed", label: "Mixed" },
];

export const BREAST_SIDES: { value: BreastSide; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];
