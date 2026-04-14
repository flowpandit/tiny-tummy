import { useCallback, useEffect, useState } from "react";
import {
  buildFeedPresetRecordInput,
  describeFeedPresetDraft,
  ensureEssentialFeedPresets,
  getDefaultQuickFeedPresets,
  hydrateFeedPresets,
  type QuickFeedPreset,
} from "../lib/quick-presets";
import { getBreastfeedingSessionSettingKey, parseBreastfeedingSession } from "../lib/breastfeeding";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import { useDbClient } from "../contexts/DatabaseContext";
import type { Child, FeedingEntry, FeedingLogDraft, UnitSystem } from "../lib/types";
import { useVisibilityRefresh } from "./useVisibilityRefresh";

function getCurrentFeedingTimestamp(): string {
  return combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime());
}

export function useFeedPageState({
  activeChild,
  unitSystem,
  onError,
  onSuccess,
  refreshLogs,
}: {
  activeChild: Child | null;
  unitSystem: UnitSystem;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  refreshLogs: () => Promise<void>;
}) {
  const db = useDbClient();
  const [quickFeedPresets, setQuickFeedPresets] = useState<QuickFeedPreset[]>([]);
  const [activeBreastfeedingSide, setActiveBreastfeedingSide] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (!activeChild) {
      setQuickFeedPresets([]);
      return;
    }

    let cancelled = false;

    setQuickFeedPresets(ensureEssentialFeedPresets(
      getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
      activeChild.feeding_type,
      unitSystem,
    ));

    db.getQuickPresets(activeChild.id, "feed").then((feedRows) => {
      if (cancelled) return;
      const hydratedFeed = hydrateFeedPresets(feedRows, unitSystem);
      setQuickFeedPresets(
        ensureEssentialFeedPresets(
          hydratedFeed.length > 0 ? hydratedFeed : getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
          activeChild.feeding_type,
          unitSystem,
        ),
      );
    }).catch(() => {
      if (!cancelled) {
        setQuickFeedPresets(ensureEssentialFeedPresets(
          getDefaultQuickFeedPresets(activeChild.feeding_type, unitSystem),
          activeChild.feeding_type,
          unitSystem,
        ));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild, unitSystem]);

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

  useVisibilityRefresh(refreshBreastfeedingSession, Boolean(activeChild));

  const repeatLastFeed = useCallback(async (lastFeed: FeedingEntry | null) => {
    if (!activeChild || !lastFeed) return;

    try {
      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: getCurrentFeedingTimestamp(),
        food_type: lastFeed.food_type,
        food_name: lastFeed.food_name,
        amount_ml: lastFeed.amount_ml,
        duration_minutes: lastFeed.duration_minutes,
        breast_side: lastFeed.breast_side,
        bottle_content: lastFeed.bottle_content,
        reaction_notes: null,
        is_constipation_support: lastFeed.is_constipation_support,
        notes: null,
      });
      await refreshLogs();
      onSuccess("Repeated the last feed.");
    } catch {
      onError("Could not repeat the last feed. Please try again.");
    }
  }, [activeChild, onError, onSuccess, refreshLogs]);

  const logQuickFeedPreset = useCallback(async (preset: QuickFeedPreset) => {
    if (!activeChild) return;

    if (!preset.draft.food_type) {
      onError("This feed tile is missing a feed type.");
      return;
    }

    try {
      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: getCurrentFeedingTimestamp(),
        food_type: preset.draft.food_type,
        food_name: preset.draft.food_name?.trim() ? preset.draft.food_name.trim() : null,
        amount_ml: preset.draft.amount_ml?.trim() ? Number(preset.draft.amount_ml.trim()) : null,
        duration_minutes: preset.draft.duration_minutes?.trim() ? Number(preset.draft.duration_minutes.trim()) : null,
        breast_side: preset.draft.breast_side ?? null,
        bottle_content: preset.draft.bottle_content ?? null,
        reaction_notes: null,
        is_constipation_support: preset.draft.is_constipation_support ? 1 : 0,
        notes: null,
      });
      await refreshLogs();
      onSuccess(`${preset.label} logged.`);
    } catch {
      onError("Could not log that feed. Please try again.");
    }
  }, [activeChild, onError, onSuccess, refreshLogs]);

  const saveFeedPresets = useCallback(async (drafts: Array<Partial<FeedingLogDraft>>) => {
    if (!activeChild) return false;

    const nextPresets = drafts.map((draft, index) => {
      const preview = describeFeedPresetDraft(draft, unitSystem);
      return {
        id: `feed-preset-${index}`,
        label: preview.label,
        description: preview.description,
        draft,
      };
    });

    try {
      await db.replaceQuickPresets(activeChild.id, "feed", buildFeedPresetRecordInput(drafts, unitSystem));
      setQuickFeedPresets(ensureEssentialFeedPresets(nextPresets, activeChild.feeding_type, unitSystem));
      onSuccess("Quick feed tiles updated.");
      return true;
    } catch {
      onError("Could not save the quick feed tiles. Please try again.");
      return false;
    }
  }, [activeChild, onError, onSuccess, unitSystem]);

  return {
    activeBreastfeedingSide,
    quickFeedPresets,
    logQuickFeedPreset,
    repeatLastFeed,
    saveFeedPresets,
  };
}
