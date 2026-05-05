import {
  CAREGIVER_AVATAR_COLORS,
  CURRENT_CAREGIVER_SETTING_KEY,
  buildCaregiverDraft,
  parseCaregiverRole,
  type CaregiverDraft,
  type ChildCaregiverProfile,
} from "../caregivers";
import type { AppRepositories } from "../repositories";
import type { Caregiver } from "../types";

export interface SaveCaregiverInput {
  displayName: string;
  role: string;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarColor?: string | null;
  isPrimary?: boolean;
}

export interface CaregiverService {
  listChildCaregivers(childId: string): Promise<ChildCaregiverProfile[]>;
  listAvailableCaregiversForChild(childId: string): Promise<Caregiver[]>;
  createCaregiverForChild(childId: string, input: SaveCaregiverInput): Promise<Caregiver>;
  createDefaultCaregiverForChild(childId: string): Promise<Caregiver>;
  updateCaregiver(caregiverId: string, input: SaveCaregiverInput): Promise<void>;
  linkCaregiverToChild(childId: string, caregiverId: string, relationship?: string | null): Promise<void>;
  unlinkCaregiverFromChild(linkId: string): Promise<void>;
  deleteCaregiver(caregiverId: string): Promise<void>;
  setPrimaryCaregiver(caregiverId: string | null): Promise<void>;
  getCurrentCaregiver(): Promise<Caregiver | null>;
  setCurrentCaregiver(caregiverId: string | null): Promise<void>;
}

function toCaregiverDraft(input: SaveCaregiverInput): CaregiverDraft {
  return buildCaregiverDraft({
    displayName: input.displayName,
    role: input.role,
    relationship: input.relationship ?? input.role,
    email: input.email,
    phone: input.phone,
    avatarColor: input.avatarColor,
    isPrimary: input.isPrimary,
  });
}

function relationshipForLink(input: Pick<CaregiverDraft, "relationship" | "role">): string {
  return input.relationship ?? input.role;
}

function byCaregiverId(profiles: ChildCaregiverProfile[]): Set<string> {
  return new Set(profiles.map((profile) => profile.id));
}

export function createCaregiverService(
  repositories: Pick<AppRepositories, "caregivers" | "settings">,
): CaregiverService {
  return {
    listChildCaregivers(childId) {
      return repositories.caregivers.listCaregiversForChild(childId);
    },

    async listAvailableCaregiversForChild(childId) {
      const [allCaregivers, linkedProfiles] = await Promise.all([
        repositories.caregivers.listActiveCaregivers(),
        repositories.caregivers.listCaregiversForChild(childId),
      ]);
      const linkedIds = byCaregiverId(linkedProfiles);
      return allCaregivers.filter((caregiver) => !linkedIds.has(caregiver.id));
    },

    async createCaregiverForChild(childId, input) {
      const draft = toCaregiverDraft(input);
      const caregiver = await repositories.caregivers.createCaregiver({
        ...draft,
        is_primary: 0,
      });
      await repositories.caregivers.linkCaregiverToChild({
        childId,
        caregiverId: caregiver.id,
        relationshipToChild: relationshipForLink(draft),
      });

      if (draft.is_primary === 1) {
        await repositories.caregivers.setPrimaryCaregiver(caregiver.id);
        return {
          ...caregiver,
          is_primary: 1,
        };
      }

      return caregiver;
    },

    async createDefaultCaregiverForChild(childId) {
      const linked = await repositories.caregivers.listCaregiversForChild(childId);
      const existingPrimary = linked.find((profile) => profile.is_primary === 1);
      if (existingPrimary) return existingPrimary;

      const caregiver = await repositories.caregivers.createCaregiver({
        display_name: "Primary caregiver",
        role: "parent",
        relationship: "parent",
        email: null,
        phone: null,
        avatar_color: CAREGIVER_AVATAR_COLORS[0],
        is_primary: 0,
      });
      await repositories.caregivers.linkCaregiverToChild({
        childId,
        caregiverId: caregiver.id,
        relationshipToChild: "parent",
      });
      await repositories.caregivers.setPrimaryCaregiver(caregiver.id);
      return {
        ...caregiver,
        is_primary: 1,
      };
    },

    async updateCaregiver(caregiverId, input) {
      const draft = toCaregiverDraft(input);
      await repositories.caregivers.updateCaregiver(caregiverId, {
        ...draft,
        is_primary: undefined,
      });

      if (draft.is_primary === 1) {
        await repositories.caregivers.setPrimaryCaregiver(caregiverId);
      } else {
        const current = await repositories.caregivers.getCaregiver(caregiverId);
        if (current?.is_primary === 1) {
          await repositories.caregivers.setPrimaryCaregiver(null);
        }
      }
    },

    async linkCaregiverToChild(childId, caregiverId, relationship) {
      const caregiver = await repositories.caregivers.getCaregiver(caregiverId);
      if (!caregiver) throw new Error("Caregiver was not found.");

      await repositories.caregivers.linkCaregiverToChild({
        childId,
        caregiverId,
        relationshipToChild: parseCaregiverRole(relationship ?? caregiver.relationship ?? caregiver.role),
      });
    },

    unlinkCaregiverFromChild(linkId) {
      return repositories.caregivers.deleteChildCaregiverLink(linkId);
    },

    async deleteCaregiver(caregiverId) {
      await repositories.caregivers.deleteCaregiver(caregiverId);
      const currentCaregiverId = await repositories.settings.getSetting(CURRENT_CAREGIVER_SETTING_KEY);
      if (currentCaregiverId === caregiverId) {
        await repositories.settings.deleteSetting(CURRENT_CAREGIVER_SETTING_KEY);
      }
    },

    setPrimaryCaregiver(caregiverId) {
      return repositories.caregivers.setPrimaryCaregiver(caregiverId);
    },

    async getCurrentCaregiver() {
      const caregiverId = await repositories.settings.getSetting(CURRENT_CAREGIVER_SETTING_KEY);
      if (!caregiverId) return null;
      return repositories.caregivers.getCaregiver(caregiverId);
    },

    async setCurrentCaregiver(caregiverId) {
      if (!caregiverId) {
        await repositories.settings.deleteSetting(CURRENT_CAREGIVER_SETTING_KEY);
        return;
      }

      const caregiver = await repositories.caregivers.getCaregiver(caregiverId);
      if (!caregiver) throw new Error("Caregiver was not found.");
      await repositories.settings.setSetting(CURRENT_CAREGIVER_SETTING_KEY, caregiverId);
    },
  };
}
