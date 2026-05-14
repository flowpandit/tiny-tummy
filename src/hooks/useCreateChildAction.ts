import { useCallback } from "react";
import { useRepositories, useServices } from "../contexts/DatabaseContext";
import { saveAvatar } from "../lib/photos";
import type { Child, ChildSex, FeedingType } from "../lib/types";

export function useCreateChildAction() {
  const { children } = useRepositories();
  const { caregivers } = useServices();
  return useCallback(async ({
    name,
    dob,
    sex,
    feedingType,
    avatarColor,
    avatarBlob,
  }: {
    name: string;
    dob: string;
    sex: ChildSex;
    feedingType: FeedingType;
    avatarColor: string;
    avatarBlob?: Blob | null;
  }): Promise<Child> => {
    const child = await children.createChild({
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });

    const currentCaregiver = await caregivers.getCurrentCaregiver();
    if (currentCaregiver) {
      await caregivers.linkCaregiverToChild(
        child.id,
        currentCaregiver.id,
        currentCaregiver.relationship ?? currentCaregiver.role,
      );
    }

    if (avatarBlob) {
      try { await saveAvatar(child.id, avatarBlob); } catch { /* non-critical */ }
    }

    return child;
  }, [caregivers, children]);
}
