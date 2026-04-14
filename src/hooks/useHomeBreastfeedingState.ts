import { useCallback, useEffect, useState } from "react";
import { getBreastfeedingSessionSettingKey, parseBreastfeedingSession } from "../lib/breastfeeding";
import { useDbClient } from "../contexts/DatabaseContext";
import { useVisibilityRefresh } from "./useVisibilityRefresh";
import type { Child } from "../lib/types";

export function useHomeBreastfeedingState(
  activeChild: Child | null,
  refreshFeedingLogs: () => Promise<void>,
) {
  const db = useDbClient();
  const [activeBreastfeedingSide, setActiveBreastfeedingSide] = useState<"left" | "right" | null>(null);

  const refreshBreastfeedingSession = useCallback(async () => {
    if (!activeChild) {
      setActiveBreastfeedingSide(null);
      return;
    }

    try {
      const raw = await db.getSetting(getBreastfeedingSessionSettingKey(activeChild.id));
      const session = parseBreastfeedingSession(raw);
      setActiveBreastfeedingSide(session?.activeSide ?? null);
    } catch {
      setActiveBreastfeedingSide(null);
    }
  }, [activeChild]);

  useEffect(() => {
    void refreshBreastfeedingSession();
  }, [refreshBreastfeedingSession]);

  useVisibilityRefresh(async () => {
    await refreshBreastfeedingSession();
    await refreshFeedingLogs();
  }, Boolean(activeChild));

  return { activeBreastfeedingSide };
}
