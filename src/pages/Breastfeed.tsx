import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BreastSideButton } from "../components/breastfeed/BreastSideButton";
import { BreastfeedPatternCard } from "../components/breastfeed/BreastfeedPatternCard";
import { BreastfeedRecentHistorySection } from "../components/breastfeed/BreastfeedRecentHistorySection";
import { Button } from "../components/ui/button";
import { CareToolsSection } from "../components/home/CareToolsSection";
import { ScenicHero } from "../components/layout/ScenicHero";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
import { TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
import { DietLogForm } from "../components/logging/DietLogForm";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { useChildWorkflowActions } from "../hooks/useChildWorkflowActions";
import { useVisibilityRefresh } from "../hooks/useVisibilityRefresh";
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
import { getDurationRingDisplay } from "../lib/breastfeed-insights";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import * as db from "../lib/db";
import type { BreastSide, FeedingEntry, FeedingLogDraft } from "../lib/types";

type SessionDurations = Record<"left" | "right", number>;

export function Breastfeed() {
  const navigate = useNavigate();
  const { activeChild, refreshChildren } = useChildContext();
  const { showError, showSuccess } = useToast();
  const { runPostLogActions } = useChildWorkflowActions(activeChild);
  const [durations, setDurations] = useState<SessionDurations>({ left: 0, right: 0 });
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [lastUsedSide, setLastUsedSide] = useState<BreastSide | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [recentHistory, setRecentHistory] = useState<FeedingEntry[]>([]);
  const [selectedPatternLogId, setSelectedPatternLogId] = useState<string | null>(null);
  const [showTransitionConfirm, setShowTransitionConfirm] = useState(false);
  const [isTransitioningToMixed, setIsTransitioningToMixed] = useState(false);
  const [feedingFormOpen, setFeedingFormOpen] = useState(false);
  const [feedingDraft, setFeedingDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const supportsBreastfeeding = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";
  const patternSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeSide) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSide]);

  useVisibilityRefresh(() => {
    setTick(Date.now());
  });

  useEffect(() => {
    if (!selectedPatternLogId) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!patternSectionRef.current?.contains(event.target as Node)) {
        setSelectedPatternLogId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [selectedPatternLogId]);

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
      setRecentHistory(
        feedingLogs
          .filter((log) => log.food_type === "breast_milk" && (log.breast_side === "left" || log.breast_side === "right" || log.breast_side === "both"))
          .slice(0, 3),
      );
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

  const getLiveDuration = (side: "left" | "right") => {
    if (activeSide === side && activeStartedAt) {
      return durations[side] + (tick - activeStartedAt);
    }
    return durations[side];
  };

  const leftDuration = getLiveDuration("left");
  const rightDuration = getLiveDuration("right");
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
  const selectedPatternLog = useMemo(
    () => patternLogs.find((log) => log.id === selectedPatternLogId) ?? null,
    [patternLogs, selectedPatternLogId],
  );
  const canShowSolidTransition = activeChild?.feeding_type === "breast";

  if (!activeChild) return null;

  const openFeedingForm = (draft?: Partial<FeedingLogDraft> | null) => {
    setFeedingDraft(draft ?? null);
    setFeedingFormOpen(true);
  };

  const refreshRecentBreastHistory = async () => {
    const feedingLogs = await db.getFeedingLogs(activeChild.id, 32);
    setRecentHistory(
      feedingLogs
        .filter((log) => log.food_type === "breast_milk" && (log.breast_side === "left" || log.breast_side === "right" || log.breast_side === "both"))
        .slice(0, 32),
    );
  };

  const persistSession = async (session: BreastfeedingSessionState) => {
    await db.setSetting(getBreastfeedingSessionSettingKey(activeChild.id), JSON.stringify(session));
  };

  const flushActiveDuration = async (): Promise<BreastfeedingSessionState> => {
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
  };

  const handleStartSide = async (side: "left" | "right") => {
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
  };

  const handleSave = async () => {
    const finalSession = await flushActiveDuration();
    const saveSide = finalSession.lastUsedSide;
    const sidesUsed = (["left", "right"] as const).filter((side) => finalSession.durations[side] >= 1000);

    if (sidesUsed.length === 0) {
      showError("Start a side before saving the feed.");
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
      showSuccess("Breastfeeding session saved.");
    } catch {
      showError("Could not save the breastfeeding session.");
      setDurations(finalSession.durations);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSessionRing = getDurationRingDisplay(totalDuration, "var(--gradient-status-caution)");
  const leftRing = getDurationRingDisplay(leftDuration, "var(--gradient-status-healthy)");
  const rightRing = getDurationRingDisplay(rightDuration, "var(--gradient-status-head)");

  const handlePause = async () => {
    await flushActiveDuration();
  };

  const handleConfirmSolidTransition = async () => {
    try {
      setIsTransitioningToMixed(true);
      await db.updateChild(activeChild.id, { feeding_type: "mixed" });
      await refreshChildren();
      setShowTransitionConfirm(false);
      navigate("/feed", { replace: true });
    } catch {
      showError("Could not switch this child to mixed feeding.");
    } finally {
      setIsTransitioningToMixed(false);
    }
  };

  const handleFeedLogged = async () => {
    await runPostLogActions({
      refresh: [refreshRecentBreastHistory],
      reminders: true,
    });
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      {showTransitionConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-[calc(var(--safe-area-bottom)+108px)] pt-10" onClick={() => setShowTransitionConfirm(false)}>
          <div
            className="w-full max-w-[420px] rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="solid-transition-title"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
              Solids transition
            </p>
            <h2 id="solid-transition-title" className="mt-2 text-xl font-semibold text-[var(--color-text)]">
              Switch to mixed feeding?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Switch this child to mixed feeding once they are having both breastfeeds and other foods. The Feed page will let you log
              breastfeeding alongside solids, bottles, and other feeds.
            </p>
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowTransitionConfirm(false)}
                disabled={isTransitioningToMixed}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => void handleConfirmSolidTransition()}
                disabled={isTransitioningToMixed}
              >
                {isTransitioningToMixed ? "Switching..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ScenicHero
        child={activeChild}
        title="Breastfeed"
        description="Tap left or right to start. Switching sides pauses the other side."
        action={(
          <Button variant="cta" size="sm" onClick={handleSave} disabled={totalDuration < 1000 || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        )}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="breastfeed"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        {!supportsBreastfeeding ? (
          <InsetPanel>
            <p className="text-sm font-medium text-[var(--color-text)]">Breastfeeding timer is hidden for this child profile.</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Change the feeding type in Settings if this child is breastfed or mixed fed.
            </p>
          </InsetPanel>
        ) : (
          <>
            <div className="-mt-32 relative z-10 grid grid-cols-3 gap-3 px-4 pt-4">
              <TrackerMetricRing
                value={leftRing.value}
                unit={leftRing.unit}
                label="Left total"
                gradient={leftRing.gradient}
              />
              <TrackerMetricRing
                value={currentSessionRing.value}
                unit={currentSessionRing.unit}
                label="Current session"
                gradient={currentSessionRing.gradient}
              />
              <TrackerMetricRing
                value={rightRing.value}
                unit={rightRing.unit}
                label="Right total"
                gradient={rightRing.gradient}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <BreastSideButton
                side="left"
                isActive={activeSide === "left"}
                isLastUsed={lastUsedSide === "left"}
                durationMs={leftDuration}
                onClick={() => { void (activeSide === "left" ? handlePause() : handleStartSide("left")); }}
              />
              <BreastSideButton
                side="right"
                isActive={activeSide === "right"}
                isLastUsed={lastUsedSide === "right"}
                durationMs={rightDuration}
                onClick={() => { void (activeSide === "right" ? handlePause() : handleStartSide("right")); }}
              />
            </div>

            <InsetPanel className="space-y-4">
              {lastUsedSide && !activeSide && (
                <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/72 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Next suggested side</p>
                  <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                    Start on the {suggestedStartSide} side.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                    Last feed finished on the {lastUsedSide} side, so the {suggestedStartSide} side should be fuller.
                  </p>
                </div>
              )}
              <Button
                variant="cta"
                className="w-full"
                onClick={handleSave}
                disabled={totalDuration < 1000 || isSaving}
              >
                {isSaving ? "Saving..." : "Save breastfeeding session"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => openFeedingForm()}
              >
                Log bottle, formula, or other feed
              </Button>
            </InsetPanel>

            {displayRecentHistory.length > 0 && <BreastfeedRecentHistorySection logs={displayRecentHistory} />}

            <div ref={patternSectionRef}>
              <BreastfeedPatternCard
                patternLogs={patternLogs}
                selectedPatternLog={selectedPatternLog}
                onToggleLog={(logId) => setSelectedPatternLogId((current) => (current === logId ? null : logId))}
              />
            </div>

            {canShowSolidTransition && (
              <section className="px-1">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowTransitionConfirm(true)}
                >
                  Start solids transition
                </Button>
              </section>
            )}

            <CareToolsSection className="px-1" />
          </>
        )}
      </div>
      <DietLogForm
        open={feedingFormOpen}
        onClose={() => {
          setFeedingFormOpen(false);
          setFeedingDraft(null);
        }}
        childId={activeChild.id}
        initialDraft={feedingDraft}
        onLogged={() => void handleFeedLogged()}
      />
    </PageBody>
  );
}
