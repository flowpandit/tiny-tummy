import type { SymptomSeverity, SymptomType } from "./types";

export const SYMPTOM_TYPES: { value: SymptomType; label: string; description: string }[] = [
  {
    value: "straining",
    label: "Straining",
    description: "Working hard to poop or looking uncomfortable during a bowel movement.",
  },
  {
    value: "pain",
    label: "Pain",
    description: "Crying, obvious discomfort, or pain around the tummy or when pooping.",
  },
  {
    value: "rash",
    label: "Rash",
    description: "New rash or irritation that feels relevant to the current bowel pattern.",
  },
  {
    value: "vomiting",
    label: "Vomiting",
    description: "Vomiting or repeated spit-up that feels worth tracking in context.",
  },
  {
    value: "blood_concern",
    label: "Blood Concern",
    description: "Concern about blood in stool or around the bottom.",
  },
  {
    value: "dehydration_concern",
    label: "Dehydration Concern",
    description: "Worry about low fluids, dry mouth, fewer wet nappies, or lethargy.",
  },
];

export const SYMPTOM_SEVERITIES: { value: SymptomSeverity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

export function getSymptomTypeLabel(type: SymptomType): string {
  return SYMPTOM_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function getSymptomSeverityLabel(severity: SymptomSeverity): string {
  return SYMPTOM_SEVERITIES.find((item) => item.value === severity)?.label ?? severity;
}

export function getSymptomSeverityBadgeVariant(severity: SymptomSeverity): "default" | "caution" | "alert" {
  if (severity === "severe") return "alert";
  if (severity === "moderate") return "caution";
  return "default";
}
