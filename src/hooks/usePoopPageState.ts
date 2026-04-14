import { useCallback, useEffect, useState } from "react";
import {
  buildPoopPresetRecordInput,
  describePoopPresetDraft,
  getDefaultQuickPoopPresets,
  hydratePoopPresets,
  type QuickPoopPreset,
} from "../lib/quick-presets";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import { useDbClient } from "../contexts/DatabaseContext";
import type { Child, PoopEntry, PoopLogDraft } from "../lib/types";

function getCurrentPoopTimestamp(): string {
  return combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime());
}

export function usePoopPageState({
  activeChild,
  onError,
  onSuccess,
  refreshLogs,
}: {
  activeChild: Child | null;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  refreshLogs: () => Promise<void>;
}) {
  const db = useDbClient();
  const [quickPoopPresets, setQuickPoopPresets] = useState<QuickPoopPreset[]>([]);

  useEffect(() => {
    if (!activeChild) {
      setQuickPoopPresets([]);
      return;
    }

    let cancelled = false;

    db.getQuickPresets(activeChild.id, "poop")
      .then((rows) => {
        if (cancelled) return;
        const hydrated = hydratePoopPresets(rows);
        setQuickPoopPresets(
          hydrated.length > 0 ? hydrated : getDefaultQuickPoopPresets(activeChild.feeding_type),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setQuickPoopPresets(getDefaultQuickPoopPresets(activeChild.feeding_type));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

  const repeatLastPoop = useCallback(async (repeatablePoop: PoopEntry | null) => {
    if (!activeChild || !repeatablePoop) return;

    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: repeatablePoop.stool_type,
        color: repeatablePoop.color,
        size: repeatablePoop.size,
        notes: null,
        photo_path: null,
      });
      await refreshLogs();
      onSuccess("Repeated the last normal poop pattern.");
    } catch {
      onError("Could not repeat the last poop pattern. Please try again.");
    }
  }, [activeChild, onError, onSuccess, refreshLogs]);

  const logQuickPoopPreset = useCallback(async (preset: QuickPoopPreset) => {
    if (!activeChild) return;

    try {
      await db.createPoopLog({
        child_id: activeChild.id,
        logged_at: getCurrentPoopTimestamp(),
        stool_type: preset.draft.stool_type ?? null,
        color: preset.draft.color ?? null,
        size: preset.draft.size ?? null,
        notes: null,
        photo_path: null,
      });
      await refreshLogs();
      onSuccess(`${preset.label} logged.`);
    } catch {
      onError("Could not log that poop. Please try again.");
    }
  }, [activeChild, onError, onSuccess, refreshLogs]);

  const savePoopPresets = useCallback(async (drafts: Array<Partial<PoopLogDraft>>) => {
    if (!activeChild) return false;

    const nextPresets = drafts.map((draft, index) => {
      const preview = describePoopPresetDraft(draft);
      return {
        id: `poop-preset-${index}`,
        label: preview.label,
        description: preview.description,
        draft,
      };
    });

    try {
      await db.replaceQuickPresets(activeChild.id, "poop", buildPoopPresetRecordInput(drafts));
      setQuickPoopPresets(nextPresets);
      onSuccess("Quick poop tiles updated.");
      return true;
    } catch {
      onError("Could not save the quick poop tiles. Please try again.");
      return false;
    }
  }, [activeChild, onError, onSuccess]);

  return {
    quickPoopPresets,
    repeatLastPoop,
    logQuickPoopPreset,
    savePoopPresets,
  };
}
