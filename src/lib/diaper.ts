import type { Child, DiaperEntry, DiaperType } from "./types";
import { parseLocalDate } from "./utils";

export type EliminationViewPreference = "auto" | "diaper" | "poop";

export interface EliminationExperience {
  mode: "diaper" | "poop";
  navLabel: string;
  route: "/diaper" | "/poop";
}

const INFANT_DIAPER_CUTOFF_DAYS = 365;

export function getChildAgeDays(dateOfBirth: string): number {
  const birth = parseLocalDate(dateOfBirth);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
}

export function getEliminationViewSettingKey(childId: string): string {
  return `elimination_view:${childId}`;
}

export function getAutomaticEliminationMode(dateOfBirth: string): "diaper" | "poop" {
  return getChildAgeDays(dateOfBirth) < INFANT_DIAPER_CUTOFF_DAYS ? "diaper" : "poop";
}

export function getAllowedEliminationViewPreferences(
  child: Pick<Child, "date_of_birth"> | null,
): EliminationViewPreference[] {
  if (!child) return ["auto", "diaper", "poop"];
  return getAutomaticEliminationMode(child.date_of_birth) === "diaper"
    ? ["auto", "diaper"]
    : ["auto", "diaper", "poop"];
}

export function normalizeEliminationViewPreference(
  child: Pick<Child, "date_of_birth"> | null,
  preference: EliminationViewPreference | null | undefined,
): EliminationViewPreference {
  if (!preference || !["auto", "diaper", "poop"].includes(preference)) {
    return "auto";
  }

  if (!child) {
    return preference;
  }

  return getAllowedEliminationViewPreferences(child).includes(preference)
    ? preference
    : "auto";
}

export function resolveEliminationExperience(
  child: Pick<Child, "date_of_birth">,
  preference: EliminationViewPreference | null | undefined,
): EliminationExperience {
  const normalizedPreference = normalizeEliminationViewPreference(child, preference);
  const mode = normalizedPreference !== "auto"
    ? normalizedPreference
    : getAutomaticEliminationMode(child.date_of_birth);

  return {
    mode,
    navLabel: mode === "diaper" ? "Diaper" : "Poop",
    route: mode === "diaper" ? "/diaper" : "/poop",
  };
}

export function getDiaperTypeLabel(type: DiaperType): string {
  if (type === "wet") return "Wet diaper";
  if (type === "mixed") return "Mixed diaper";
  return "Dirty diaper";
}

export function diaperIncludesWet(type: DiaperType): boolean {
  return type === "wet" || type === "mixed";
}

export function diaperIncludesStool(type: DiaperType): boolean {
  return type === "dirty" || type === "mixed";
}

export function getUrineColorLabel(value: DiaperEntry["urine_color"]): string | null {
  if (value === "pale") return "Pale urine";
  if (value === "dark") return "Dark urine";
  if (value === "normal") return "Normal urine";
  return null;
}
