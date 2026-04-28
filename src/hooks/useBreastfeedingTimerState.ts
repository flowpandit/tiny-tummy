import { useCallback, useEffect, useMemo, useState } from "react";
import { useVisibilityRefresh } from "./useVisibilityRefresh";
import {
  type BreastfeedingSessionState,
  getBreastfeedingSessionSettingKey,
  formatBreastfeedingSummary,
  getEmptyBreastfeedingSession,
  getBreastfeedingLastSideSettingKey,
  getOppositeBreastSide,
  getRoundedDurationMinutes,
  parseBreastfeedingSession,
} from "../lib/breastfeeding";
import {
  combineLocalDateAndTimeToUtcIso,
  getCurrentLocalDate,
  getCurrentLocalTime,
  generateId,
  nowISO,
} from "../lib/utils";
import { useDbClient } from "../contexts/DatabaseContext";
import type { BreastSide, Child, FeedingEntry } from "../lib/types";

type SessionDurations = Record<"left" | "right", number>;

function getBreastfeedingHistoryRows(feedingLogs: FeedingEntry[], limit: number) {
  return feedingLogs
    .filter((log) => log.food_type === "breast_milk" && (log.breast_side === "left" || log.breast_side === "right" || log.breast_side === "both"))
    .slice(0, limit);
}

export function useBreastfeedingTimerState({
  activeChild,
  refreshChildren,
  runPostLogActions,
  onError,
  onSuccess,
}: {
  activeChild: Child | null;
  refreshChildren: () => Promise<void>;
  runPostLogActions: (input: { refresh?: Array<() => Promise<void>>; reminders?: boolean; alerts?: boolean }) => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const db = useDbClient();
  const [durations, setDurations] = useState<SessionDurations>({ left: 0, right: 0 });
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [lastUsedSide, setLastUsedSide] = useState<BreastSide | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [recentHistory, setRecentHistory] = useState<FeedingEntry[]>([]);
  const [isTransitioningToMixed, setIsTransitioningToMixed] = useState(false);

  useEffect(() => {
    if (!activeSide) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSide]);

  useVisibilityRefresh(() => {
    setTick(Date.now());
  });

  useEffect(() => {
    if (!activeChild) {
      setDurations({ left: 0, right: 0 });
      setActiveSide(null);
      setActiveStartedAt(null);
      setLastUsedSide(null);
      setRecentHistory([]);
      setTick(Date.now());
      return;
    }

    let cancelled = false;

    setDurations({ left: 0, right: 0 });
    setActiveSide(null);
    setActiveStartedAt(null);
    setLastUsedSide(null);
    setRecentHistory([]);
    setTick(Date.now());

    Promise.all([
      db.getSetting(getBreastfeedingSessionSettingKey(activeChild.id)),
      db.getSetting(getBreastfeedingLastSideSettingKey(activeChild.id)),
      db.getFeedingLogs(activeChild.id, 32),
    ]).then(([sessionRaw, savedSide, feedingLogs]) => {
      if (cancelled) return;

      const recentBreastLog = feedingLogs.find(
        (log) => log.food_type === "breast_milk" && (log.breast_side === "left" || log.breast_side === "right"),
      );
      const resolvedSide = (savedSide === "left" || savedSide === "right")
        ? savedSide
        : recentBreastLog?.breast_side ?? null;
      const restoredSession = parseBreastfeedingSession(sessionRaw) ?? getEmptyBreastfeedingSession(resolvedSide);
      const nextLastUsedSide = restoredSession.lastUsedSide ?? resolvedSide;

      setDurations(restoredSession.durations);
      setActiveSide(restoredSession.activeSide);
      setActiveStartedAt(restoredSession.activeStartedAt);
      setLastUsedSide(nextLastUsedSide);
      setRecentHistory(getBreastfeedingHistoryRows(feedingLogs, 32));
      setTick(Date.now());
    }).catch(() => {
      if (!cancelled) {
        setDurations({ left: 0, right: 0 });
        setActiveSide(null);
        setActiveStartedAt(null);
        setLastUsedSide(null);
        setRecentHistory([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

  const refreshRecentBreastHistory = useCallback(async () => {
    if (!activeChild) return;
    const feedingLogs = await db.getFeedingLogs(activeChild.id, 32);
    setRecentHistory(getBreastfeedingHistoryRows(feedingLogs, 32));
  }, [activeChild]);

  const persistSession = useCallback(async (session: BreastfeedingSessionState) => {
    if (!activeChild) return;
    await db.setSetting(getBreastfeedingSessionSettingKey(activeChild.id), JSON.stringify(session));
  }, [activeChild]);

  const flushActiveDuration = useCallback(async (options: { persist?: boolean } = { persist: true }): Promise<BreastfeedingSessionState> => {
    if (!activeSide || !activeStartedAt) {
      return {
        durations,
        activeSide,
        activeStartedAt,
        lastUsedSide,
      };
    }

    const nextSession: BreastfeedingSessionState = {
      durations: {
        ...durations,
        [activeSide]: durations[activeSide] + (Date.now() - activeStartedAt),
      },
      activeSide: null,
      activeStartedAt: null,
      lastUsedSide: activeSide,
    };
    setDurations(nextSession.durations);
    setLastUsedSide(nextSession.lastUsedSide);
    setActiveSide(null);
    setActiveStartedAt(null);
    setTick(Date.now());
    if (options.persist) {
      await persistSession(nextSession);
    }
    return nextSession;
  }, [activeSide, activeStartedAt, durations, lastUsedSide, persistSession]);

  const handleStartSide = useCallback(async (side: "left" | "right") => {
    const now = Date.now();
    const nextDurations = activeSide && activeStartedAt
      ? {
        ...durations,
        [activeSide]: durations[activeSide] + (now - activeStartedAt),
      }
      : durations;

    const nextSession: BreastfeedingSessionState = {
      durations: nextDurations,
      activeSide: side,
      activeStartedAt: now,
      lastUsedSide: side,
    };

    setDurations(nextDurations);
    setTick(now);
    setActiveSide(side);
    setActiveStartedAt(now);
    setLastUsedSide(side);
    await persistSession(nextSession);
  }, [activeSide, activeStartedAt, durations, persistSession]);

  const handlePause = useCallback(async () => {
    await flushActiveDuration();
  }, [flushActiveDuration]);

  const handleSave = useCallback(async () => {
    if (!activeChild) return;

    const finalSession = await flushActiveDuration({ persist: false });
    const saveSide = finalSession.lastUsedSide;
    const sidesUsed = (["left", "right"] as const).filter((side) => finalSession.durations[side] >= 1000);

    if (sidesUsed.length === 0) {
      onError("Start a side before saving the feed.");
      return;
    }

    setIsSaving(true);

    try {
      const totalDurationMs = sidesUsed.reduce((sum, side) => sum + finalSession.durations[side], 0);
      const sideBreakdown = sidesUsed
        .map((side) => `${side === "left" ? "Left" : "Right"} ${formatBreastfeedingSummary(finalSession.durations[side])}`)
        .join(" • ");
      const breastSide = sidesUsed.length === 2 ? "both" : sidesUsed[0];

      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime()),
        food_type: "breast_milk",
        duration_minutes: getRoundedDurationMinutes(totalDurationMs),
        breast_side: breastSide,
        notes: `Timed breastfeeding session • ${sideBreakdown}`,
      });

      if (saveSide === "left" || saveSide === "right") {
        await db.setSetting(getBreastfeedingLastSideSettingKey(activeChild.id), saveSide).catch(() => {});
      }

      const clearedSession = getEmptyBreastfeedingSession(saveSide);
      setDurations(clearedSession.durations);
      setActiveSide(null);
      setActiveStartedAt(null);
      setLastUsedSide(clearedSession.lastUsedSide);
      setTick(Date.now());
      
      await persistSession(clearedSession);

      // Manually update the local history state immediately for a snappy UI
      const newEntry: FeedingEntry = {
        id: generateId(), // Temporary ID for UI
        child_id: activeChild.id,
        logged_at: combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime()),
        food_type: "breast_milk",
        duration_minutes: getRoundedDurationMinutes(totalDurationMs),
        breast_side: breastSide,
        notes: `Timed breastfeeding session • ${sideBreakdown}`,
        food_name: null,
        amount_ml: null,
        bottle_content: null,
        reaction_notes: null,
        is_constipation_support: 0,
        created_at: nowISO(),
      };
      setRecentHistory((prev) => [newEntry, ...prev].slice(0, 30));
      setIsSaving(false);

      onSuccess("Breastfeeding session saved.");

      try {
        // Tiny delay before database refresh ensures SQLite index is settled (especially in WAL mode)
        await new Promise((resolve) => setTimeout(resolve, 150));
        await runPostLogActions({
          refresh: [refreshRecentBreastHistory],
          reminders: true,
        });
      } catch (err) {
        console.error("Post-save actions failed:", err);
        await refreshRecentBreastHistory().catch(() => {});
      }
    } catch (err) {
      setIsSaving(false);
      const errorDetail = err instanceof Error ? err.message : String(err);
      onError(`Could not save the breastfeeding session: ${errorDetail}`);
      setDurations(finalSession.durations);
      await persistSession(finalSession).catch(() => {});
    }
  }, [activeChild, db, flushActiveDuration, onError, onSuccess, persistSession, refreshRecentBreastHistory, runPostLogActions]);

  const handleConfirmSolidTransition = useCallback(async () => {
    if (!activeChild) return false;

    try {
      setIsTransitioningToMixed(true);
      await db.createMilestoneLog({
        child_id: activeChild.id,
        milestone_type: "started_solids",
        logged_at: combineLocalDateAndTimeToUtcIso(getCurrentLocalDate(), getCurrentLocalTime()),
        notes: null,
      });
      await db.updateChild(activeChild.id, { feeding_type: "mixed" });
      await refreshChildren();
      onSuccess("Started solids saved to milestones.");
      return true;
    } catch {
      onError("Could not save the solids milestone and switch feeding type.");
      return false;
    } finally {
      setIsTransitioningToMixed(false);
    }
  }, [activeChild, db, onError, onSuccess, refreshChildren]);

  const handleFeedLogged = useCallback(async () => {
    await runPostLogActions({
      refresh: [refreshRecentBreastHistory],
      reminders: true,
    });
  }, [refreshRecentBreastHistory, runPostLogActions]);

  const leftDuration = useMemo(() => (
    activeSide === "left" && activeStartedAt ? durations.left + (tick - activeStartedAt) : durations.left
  ), [activeSide, activeStartedAt, durations.left, tick]);
  const rightDuration = useMemo(() => (
    activeSide === "right" && activeStartedAt ? durations.right + (tick - activeStartedAt) : durations.right
  ), [activeSide, activeStartedAt, durations.right, tick]);
  const totalDuration = leftDuration + rightDuration;
  const suggestedStartSide = useMemo(() => getOppositeBreastSide(lastUsedSide), [lastUsedSide]);
  const displayRecentHistory = useMemo(() => recentHistory.slice(0, 3), [recentHistory]);
  const patternLogs = useMemo(() => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    return recentHistory
      .filter((log) => {
        if (log.food_type !== "breast_milk") return false;
        if (log.breast_side !== "left" && log.breast_side !== "right" && log.breast_side !== "both") return false;
        return new Date(log.logged_at).getTime() >= cutoff;
      })
      .sort((left, right) => new Date(left.logged_at).getTime() - new Date(right.logged_at).getTime());
  }, [recentHistory]);

  const last24hDurations = useMemo(() => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const logs = recentHistory.filter((log) => {
      if (log.food_type !== "breast_milk") return false;
      const side = log.breast_side;
      if (side !== "left" && side !== "right" && side !== "both") return false;
      return new Date(log.logged_at).getTime() >= cutoff;
    });

    let left = 0;
    let right = 0;

    for (const log of logs) {
      const durationMs = (log.duration_minutes ?? 0) * 60000;
      if (log.breast_side === "left") {
        left += durationMs;
      } else if (log.breast_side === "right") {
        right += durationMs;
      } else if (log.breast_side === "both") {
        left += durationMs / 2;
        right += durationMs / 2;
      }
    }

    return { left, right };
  }, [recentHistory]);

  const last24hLeftDuration = last24hDurations.left + leftDuration;
  const last24hRightDuration = last24hDurations.right + rightDuration;
  
  // For visual consistency in the rings, we sum the rounded minutes of each side
  // This prevents cases where "6 + 5 = 10" due to separate rounding.
  const leftMins = Math.round(last24hLeftDuration / 60000);
  const rightMins = Math.round(last24hRightDuration / 60000);
  const last24hTotalDuration = (leftMins + rightMins) * 60000;

  return {
    activeSide,
    canShowSolidTransition: activeChild?.feeding_type === "breast",
    displayRecentHistory,
    handleConfirmSolidTransition,
    handleFeedLogged,
    handlePause,
    handleSave,
    handleStartSide,
    isSaving,
    isTransitioningToMixed,
    last24hLeftDuration,
    last24hRightDuration,
    last24hTotalDuration,
    lastUsedSide,
    leftDuration,
    patternLogs,
    rightDuration,
    suggestedStartSide,
    totalDuration,
  };
}
