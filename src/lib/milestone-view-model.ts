import { getMilestoneTypeDescription, getMilestoneTypeLabel } from "./milestone-constants";
import { formatDate } from "./utils";
import type { MilestoneEntry } from "./types";

export interface MilestoneBadgeViewModel {
  label: string;
  variant: "healthy" | "caution" | "alert" | "info" | "default";
  dotColor: string;
}

export function getMilestoneBadgeViewModel(entry: MilestoneEntry): MilestoneBadgeViewModel {
  switch (entry.milestone_type) {
    case "started_solids":
      return { label: "Nutrition", variant: "healthy", dotColor: "var(--color-healthy)" };
    case "medication_started":
      return { label: "Health", variant: "caution", dotColor: "var(--color-caution)" };
    case "allergy_concern":
      return { label: "Concern", variant: "alert", dotColor: "var(--color-alert)" };
    case "illness":
      return { label: "Health", variant: "alert", dotColor: "var(--color-alert)" };
    case "travel_or_daycare_change":
      return { label: "Routine", variant: "info", dotColor: "var(--color-info)" };
    case "toilet_training_interest":
      return { label: "Development", variant: "info", dotColor: "var(--color-info)" };
    case "teething":
      return { label: "Development", variant: "default", dotColor: "var(--color-cta)" };
    default:
      return { label: "Context", variant: "default", dotColor: "var(--color-cta)" };
  }
}

export function formatMilestoneStamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getMilestoneJourneyCopy(logs: MilestoneEntry[]): string {
  if (logs.length === 0) {
    return "A calm record of the changes that help feeding, sleep, and bowel patterns make more sense later.";
  }

  const latest = logs[0];
  const latestLabel = getMilestoneTypeLabel(latest.milestone_type).toLowerCase();
  return `Keeping track of moments like ${latestLabel} helps later changes feel less confusing.`;
}

export function getMilestoneActivityNote(entry: MilestoneEntry): string {
  return entry.notes?.trim() || getMilestoneTypeDescription(entry.milestone_type);
}

export function getMilestoneEmptyExamples(): string[] {
  return [
    "Started solids and poops began changing",
    "Medication was introduced after a pediatric visit",
    "Illness or travel shifted sleep and feeding",
  ];
}
