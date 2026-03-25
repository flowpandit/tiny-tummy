import type { FoodType } from "./types";

export const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "breast_milk", label: "Breast milk" },
  { value: "formula", label: "Formula" },
  { value: "solids", label: "Solids" },
  { value: "water", label: "Water" },
  { value: "other", label: "Other" },
];
