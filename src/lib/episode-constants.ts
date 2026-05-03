import type { EpisodeEventType, EpisodeType } from "./types";

export const EPISODE_TYPES: {
  value: EpisodeType;
  label: string;
  description: string;
}[] = [
  {
    value: "fever_illness",
    label: "Fever / Illness",
    description: "Track temperature, symptoms, fluids, medicine, and recovery.",
  },
  {
    value: "stomach_bug",
    label: "Stomach Bug",
    description: "Track vomiting, diarrhoea, appetite, fluids, and progress.",
  },
  {
    value: "vomiting",
    label: "Vomiting",
    description: "Track vomiting, fluids, triggers, and how often it happens.",
  },
  {
    value: "rash_skin",
    label: "Rash / Skin",
    description: "Track rash changes, discomfort, medicine, and notes.",
  },
  {
    value: "medication_reaction",
    label: "Medication / Reaction",
    description: "Track medicine timing, symptoms, and possible reactions.",
  },
  {
    value: "constipation",
    label: "Constipation",
    description: "Track hard stools, straining, hydration, and what you tried.",
  },
  {
    value: "diarrhoea",
    label: "Diarrhoea",
    description: "Track loose stools, fluids, symptoms, and recovery.",
  },
  {
    value: "other",
    label: "Other",
    description: "Track any health concern across multiple updates.",
  },
];

export const EPISODE_EVENT_TYPES: {
  value: EpisodeEventType;
  label: string;
}[] = [
  { value: "symptom", label: "Symptom" },
  { value: "temperature", label: "Temperature" },
  { value: "hydration", label: "Hydration" },
  { value: "food", label: "Food" },
  { value: "medication", label: "Medication" },
  { value: "intervention", label: "Intervention" },
  { value: "progress", label: "Progress" },
];

export function getEpisodeTypeLabel(type: EpisodeType): string {
  return EPISODE_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function getEpisodeEventTypeLabel(type: EpisodeEventType): string {
  return EPISODE_EVENT_TYPES.find((item) => item.value === type)?.label ?? type;
}
