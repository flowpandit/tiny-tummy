import type { SymptomSeverity, SymptomType, TemperatureMethod } from "./types";

export const SYMPTOM_TYPES: { value: SymptomType; label: string; description: string }[] = [
  {
    value: "fever",
    label: "Fever",
    description: "Raised temperature, chills, or feeling unusually hot.",
  },
  {
    value: "cough_congestion",
    label: "Cough / Congestion",
    description: "Coughing, runny nose, blocked nose, or noisy breathing.",
  },
  {
    value: "low_appetite",
    label: "Low Appetite",
    description: "Less interest in feeds, food, or fluids than usual.",
  },
  {
    value: "low_energy",
    label: "Low Energy",
    description: "Sleepier, quieter, clingier, or less playful than usual.",
  },
  {
    value: "straining",
    label: "Straining",
    description: "Working hard to poop or looking uncomfortable during a bowel movement.",
  },
  {
    value: "pain",
    label: "Pain",
    description: "Crying, obvious discomfort, tummy pain, or pain when pooping.",
  },
  {
    value: "rash",
    label: "Rash",
    description: "New rash, irritation, or skin changes worth tracking.",
  },
  {
    value: "vomiting",
    label: "Vomiting",
    description: "Vomiting or repeated spit-up that feels worth tracking in context.",
  },
  {
    value: "diarrhoea",
    label: "Diarrhoea",
    description: "Loose, watery, or unusually frequent stools.",
  },
  {
    value: "poop_concern",
    label: "Poop Concern",
    description: "Unusual stool, stool changes, or poop details you want to review later.",
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
  {
    value: "other",
    label: "Other",
    description: "Something else you want to keep in the health timeline.",
  },
];

export const SYMPTOM_SEVERITIES: { value: SymptomSeverity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

export const TEMPERATURE_METHODS: { value: TemperatureMethod; label: string }[] = [
  { value: "rectal", label: "Rectal" },
  { value: "forehead", label: "Forehead / temporal" },
  { value: "ear", label: "Ear" },
  { value: "armpit", label: "Armpit" },
  { value: "oral", label: "Oral" },
  { value: "other", label: "Other" },
];

export function getSymptomTypeLabel(type: SymptomType): string {
  return SYMPTOM_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function getSymptomSeverityLabel(severity: SymptomSeverity): string {
  return SYMPTOM_SEVERITIES.find((item) => item.value === severity)?.label ?? severity;
}

export function getTemperatureMethodLabel(method: TemperatureMethod | null): string | null {
  if (!method) return null;
  return TEMPERATURE_METHODS.find((item) => item.value === method)?.label ?? method;
}

export function getSymptomSeverityBadgeVariant(severity: SymptomSeverity): "default" | "caution" | "alert" {
  if (severity === "severe") return "alert";
  if (severity === "moderate") return "caution";
  return "default";
}
