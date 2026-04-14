import { useCallback } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import type { Child, ChildSex, FeedingType } from "../lib/types";

export function useDeleteChildAction(refreshChildren: () => Promise<void>) {
  const db = useDbClient();
  return useCallback(async (id: string) => {
    await db.deleteChild(id);
    await refreshChildren();
  }, [db, refreshChildren]);
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
  const db = useDbClient();
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
  }, [child.id, db, onClose, onSaved]);
}

export function useUpdateChildFeedingTypeAction(refreshChildren?: () => Promise<void>) {
  const db = useDbClient();
  return useCallback(async (childId: string, feedingType: FeedingType) => {
    await db.updateChild(childId, { feeding_type: feedingType });
    if (refreshChildren) {
      await refreshChildren();
    }
  }, [db, refreshChildren]);
}
