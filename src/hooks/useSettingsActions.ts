import { useCallback } from "react";
import * as db from "../lib/db";
import type { Child, ChildSex, FeedingType } from "../lib/types";

export function useDeleteChildAction(refreshChildren: () => Promise<void>) {
  return useCallback(async (id: string) => {
    await db.deleteChild(id);
    await refreshChildren();
  }, [refreshChildren]);
}

export function useUpdateChildAction({
  child,
  onSaved,
  onClose,
}: {
  child: Child;
  onSaved: () => void;
  onClose: () => void;
}) {
  return useCallback(async ({
    name,
    dob,
    sex,
    feedingType,
    avatarColor,
  }: {
    name: string;
    dob: string;
    sex: ChildSex | null;
    feedingType: FeedingType;
    avatarColor: string;
  }) => {
    await db.updateChild(child.id, {
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });
    onSaved();
    onClose();
  }, [child.id, onClose, onSaved]);
}

export function useUpdateChildFeedingTypeAction(refreshChildren?: () => Promise<void>) {
  return useCallback(async (childId: string, feedingType: FeedingType) => {
    await db.updateChild(childId, { feeding_type: feedingType });
    if (refreshChildren) {
      await refreshChildren();
    }
  }, [refreshChildren]);
}
