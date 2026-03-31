import type { MilestoneType } from "./types";

export const MILESTONE_OPTIONS: Array<{
  value: MilestoneType;
  label: string;
  description: string;
}> = [
  {
    value: "started_solids",
    label: "Started solids",
    description: "Useful when stool and feeding patterns start changing quickly.",
  },
  {
    value: "teething",
    label: "Teething",
    description: "Helpful context for unsettled days, appetite changes, or extra drool.",
  },
  {
    value: "medication_started",
    label: "Medication started",
    description: "Track when new medicine may affect bowels, appetite, or sleep.",
  },
  {
    value: "allergy_concern",
    label: "Allergy concern",
    description: "Mark a possible reaction window for later review.",
  },
  {
    value: "illness",
    label: "Illness",
    description: "Capture sickness periods that may explain broader changes.",
  },
  {
    value: "travel_or_daycare_change",
    label: "Travel or daycare change",
    description: "A routine shift that can affect feeding, sleep, and bowel patterns.",
  },
  {
    value: "toilet_training_interest",
    label: "Toilet training interest",
    description: "Light context for behavior changes without turning this into a potty app.",
  },
];

export function getMilestoneTypeLabel(value: MilestoneType): string {
  return MILESTONE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function getMilestoneTypeDescription(value: MilestoneType): string {
  return MILESTONE_OPTIONS.find((item) => item.value === value)?.description ?? "";
}
