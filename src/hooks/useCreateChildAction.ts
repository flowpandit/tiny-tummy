import { useCallback } from "react";
import * as db from "../lib/db";
import { saveAvatar } from "../lib/photos";
import type { Child, ChildSex, FeedingType } from "../lib/types";

export function useCreateChildAction() {
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
    const child = await db.createChild({
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });

    if (avatarBlob) {
      try { await saveAvatar(child.id, avatarBlob); } catch { /* non-critical */ }
    }

    return child;
  }, []);
}
