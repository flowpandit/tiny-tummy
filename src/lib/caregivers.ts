import type { Caregiver, ChildCaregiver } from "./types";

export const CURRENT_CAREGIVER_SETTING_KEY = "current_caregiver_id";

export const CAREGIVER_ROLE_OPTIONS = [
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "grandparent", label: "Grandparent" },
  { value: "nanny", label: "Nanny" },
  { value: "daycare", label: "Daycare" },
  { value: "other", label: "Other" },
] as const;

export type CaregiverRole = typeof CAREGIVER_ROLE_OPTIONS[number]["value"];

export const CAREGIVER_AVATAR_COLORS = [
  "#7C3AED",
  "#DB2777",
  "#0F766E",
  "#2563EB",
  "#B45309",
  "#64748B",
];

const ROLE_LABELS = new Map<string, string>(
  CAREGIVER_ROLE_OPTIONS.map((option) => [option.value, option.label]),
);

export interface ChildCaregiverProfile extends Caregiver {
  child_caregiver_id: string;
  child_id: string;
  relationship_to_child: string | null;
  permissions: string | null;
  link_created_at: string;
  link_updated_at: string;
}

export type CaregiverDraft = {
  display_name: string;
  role: CaregiverRole;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  avatar_color: string;
  is_primary: number;
};

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCaregiverRole(value: string | null | undefined): CaregiverRole {
  const normalized = cleanOptionalText(value)?.toLowerCase();
  if (normalized && ROLE_LABELS.has(normalized)) {
    return normalized as CaregiverRole;
  }

  return "other";
}

export function getCaregiverRoleLabel(value: string | null | undefined): string {
  return ROLE_LABELS.get(parseCaregiverRole(value)) ?? "Other";
}

export function buildCaregiverDraft(input: {
  displayName: string;
  role?: string | null;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
  isPrimary?: boolean;
}): CaregiverDraft {
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("Caregiver name is required.");
  }

  const role = parseCaregiverRole(input.role);
  const avatarColor = cleanOptionalText(input.avatarColor) ?? CAREGIVER_AVATAR_COLORS[0];

  return {
    display_name: displayName,
    role,
    relationship: cleanOptionalText(input.relationship) ?? role,
    email: cleanOptionalText(input.email),
    phone: cleanOptionalText(input.phone),
    avatar_color: avatarColor,
    is_primary: input.isPrimary ? 1 : 0,
  };
}

export function getCaregiverInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function findLinkedCurrentCaregiverForChild(
  currentCaregiverId: string | null | undefined,
  childCaregivers: ChildCaregiverProfile[],
): ChildCaregiverProfile | null {
  if (!currentCaregiverId) return null;
  return childCaregivers.find((caregiver) => caregiver.id === currentCaregiverId) ?? null;
}

export function getRelationshipLabel(
  caregiver: Pick<Caregiver, "role" | "relationship"> | Pick<ChildCaregiver, "relationship_to_child">,
): string {
  if ("relationship_to_child" in caregiver) {
    return getCaregiverRoleLabel(caregiver.relationship_to_child);
  }

  return getCaregiverRoleLabel(caregiver.relationship ?? caregiver.role);
}
