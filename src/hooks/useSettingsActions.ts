import { useCallback } from "react";
import { useRepositories } from "../contexts/DatabaseContext";
import type { Child, ChildSex, FeedingType } from "../lib/types";

export function useDeleteChildAction(refreshChildren: () => Promise<void>) {
  const { children } = useRepositories();
  return useCallback(async (id: string) => {
    await children.deleteChild(id);
    await refreshChildren();
  }, [children, refreshChildren]);
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
  const { children } = useRepositories();
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
    await children.updateChild(child.id, {
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });
    onSaved();
    onClose();
  }, [child.id, children, onClose, onSaved]);
}

export function useUpdateChildFeedingTypeAction(refreshChildren?: () => Promise<void>) {
  const { children } = useRepositories();
  return useCallback(async (childId: string, feedingType: FeedingType) => {
    await children.updateChild(childId, { feeding_type: feedingType });
    if (refreshChildren) {
      await refreshChildren();
    }
  }, [children, refreshChildren]);
}
