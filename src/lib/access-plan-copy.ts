import type { AccessKind } from "./feature-access";

export interface SettingsAccessCopy {
  title: string;
  detail: string;
}

export function getSettingsAccessCopy(accessKind: AccessKind): SettingsAccessCopy {
  if (accessKind === "premium") {
    return {
      title: "Lifetime Private unlocked",
      detail: "Full local tracking, reports, backup/export, and multi-child support stay available without a subscription.",
    };
  }

  return {
    title: "Free plan",
    detail: "Useful local tracking stays free. Lifetime Private unlocks the full local app forever.",
  };
}
