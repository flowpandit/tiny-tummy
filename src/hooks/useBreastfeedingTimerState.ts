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
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
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

  const flushActiveDuration = useCallback(async (): Promise<BreastfeedingSessionState> => {
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
    await persistSession(nextSession);
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

    const finalSession = await flushActiveDuration();
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
        await db.setSetting(getBreastfeedingLastSideSettingKey(activeChild.id), saveSide);
      }

      const clearedSession = getEmptyBreastfeedingSession(saveSide);
      setDurations(clearedSession.durations);
      setActiveSide(null);
      setActiveStartedAt(null);
      setLastUsedSide(clearedSession.lastUsedSide);
      setTick(Date.now());
      await persistSession(clearedSession);
      await runPostLogActions({
        refresh: [refreshRecentBreastHistory],
        reminders: true,
      });
      onSuccess("Breastfeeding session saved.");
    } catch {
      onError("Could not save the breastfeeding session.");
      setDurations(finalSession.durations);
    } finally {
      setIsSaving(false);
    }
  }, [activeChild, flushActiveDuration, onError, onSuccess, persistSession, refreshRecentBreastHistory, runPostLogActions]);

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
    lastUsedSide,
    leftDuration,
    patternLogs,
    rightDuration,
    suggestedStartSide,
    totalDuration,
  };
}
