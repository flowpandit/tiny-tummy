import type { Child, DiaperEntry, DiaperType } from "./types";
import { parseLocalDate } from "./utils";

export type EliminationViewPreference = "auto" | "diaper" | "poop";

export interface EliminationExperience {
  mode: "diaper" | "poop";
  navLabel: string;
  route: "/diaper" | "/poop";
}

export function getChildAgeDays(dateOfBirth: string): number {
  const birth = parseLocalDate(dateOfBirth);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
}

export function getEliminationViewSettingKey(childId: string): string {
  return `elimination_view:${childId}`;
}

export function getAutomaticEliminationMode(dateOfBirth: string): "diaper" | "poop" {
  return getChildAgeDays(dateOfBirth) < 365 ? "diaper" : "poop";
}

export function resolveEliminationExperience(
  child: Pick<Child, "date_of_birth">,
  preference: EliminationViewPreference | null | undefined,
): EliminationExperience {
  const mode = preference && preference !== "auto"
    ? preference
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
