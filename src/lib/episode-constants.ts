import type { EpisodeEventType, EpisodeType } from "./types";

export const EPISODE_TYPES: {
  value: EpisodeType;
  label: string;
  description: string;
}[] = [
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
    value: "solids_transition",
    label: "Solids transition",
    description: "Track new foods, water, and bowel changes after starting solids.",
  },
];

export const EPISODE_EVENT_TYPES: {
  value: EpisodeEventType;
  label: string;
}[] = [
  { value: "symptom", label: "Symptom" },
  { value: "hydration", label: "Hydration" },
  { value: "food", label: "Food" },
  { value: "intervention", label: "Intervention" },
  { value: "progress", label: "Progress" },
];

export function getEpisodeTypeLabel(type: EpisodeType): string {
  return EPISODE_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function getEpisodeEventTypeLabel(type: EpisodeEventType): string {
  return EPISODE_EVENT_TYPES.find((item) => item.value === type)?.label ?? type;
}
