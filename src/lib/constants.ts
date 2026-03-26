import type { StoolColor, FeedingType } from "./types";

export const BITSS_TYPES = [
  { type: 1, label: "Hard lumps", description: "Separate hard lumps, like nuts (constipation)" },
  { type: 2, label: "Lumpy sausage", description: "Sausage-shaped but lumpy (mild constipation)" },
  { type: 3, label: "Cracked sausage", description: "Like a sausage with surface cracks (normal)" },
  { type: 4, label: "Smooth snake", description: "Smooth, soft sausage or snake (ideal)" },
  { type: 5, label: "Soft blobs", description: "Soft blobs with clear-cut edges (lacking fibre)" },
  { type: 6, label: "Mushy", description: "Fluffy, mushy pieces with ragged edges (mild diarrhoea)" },
  { type: 7, label: "Liquid", description: "Watery, entirely liquid, no solid pieces (diarrhoea)" },
] as const;

export const STOOL_COLORS: {
  value: StoolColor;
  hex: string;
  label: string;
  description: string;
  isRedFlag: boolean;
}[] = [
  {
    value: "yellow",
    hex: "#C49B2A",
    label: "Yellow / Mustard",
    description: "Normal for breastfed babies. Mustard-like, often seedy in texture.",
    isRedFlag: false,
  },
  {
    value: "green",
    hex: "#4A5E2A",
    label: "Green",
    description: "Normal. Common with iron supplements, some formulas, or when bile passes quickly.",
    isRedFlag: false,
  },
  {
    value: "brown",
    hex: "#6B4226",
    label: "Brown",
    description: "Normal for babies eating solids and toddlers. The most common healthy color.",
    isRedFlag: false,
  },
  {
    value: "orange",
    hex: "#A0652A",
    label: "Orange / Tan",
    description: "Normal. Often from carotene-rich foods like carrots, sweet potato, or squash.",
    isRedFlag: false,
  },
  {
    value: "black",
    hex: "#2B2320",
    label: "Black / Tarry",
    description: "Normal only in the first few days (meconium). After that, may indicate upper GI bleeding — contact your pediatrician.",
    isRedFlag: true,
  },
  {
    value: "red",
    hex: "#7A3030",
    label: "Red / Bloody",
    description: "May contain blood. Could be from small anal fissures or foods like beets. Worth mentioning to your pediatrician.",
    isRedFlag: true,
  },
  {
    value: "white",
    hex: "#D6CCBA",
    label: "White / Clay",
    description: "Not normal. Can indicate a bile duct blockage (biliary atresia). Contact your pediatrician promptly.",
    isRedFlag: true,
  },
];

export const STOOL_SIZES = [
  { value: "small" as const, label: "Small" },
  { value: "medium" as const, label: "Medium" },
  { value: "large" as const, label: "Large" },
];

export const FEEDING_TYPES: { value: FeedingType; label: string }[] = [
  { value: "breast", label: "Breastfed" },
  { value: "formula", label: "Formula" },
  { value: "mixed", label: "Mixed" },
  { value: "solids", label: "Solids" },
];

export const AVATAR_COLORS = [
  "#2563EB",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#22C55E",
  "#06B6D4",
];
