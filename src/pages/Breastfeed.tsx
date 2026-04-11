import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import breastfeedIcon from "../assets/svg-assets/icons/breastfeed-icon.svg";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
import { TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
import { DietLogForm } from "../components/logging/DietLogForm";
import { useToast } from "../components/ui/toast";
import { useChildContext } from "../contexts/ChildContext";
import { syncSmartRemindersForChild } from "../lib/notifications";
import {
  type BreastfeedingSessionState,
  getBreastfeedingSessionSettingKey,
  formatBreastfeedingClock,
  formatBreastfeedingSummary,
  getEmptyBreastfeedingSession,
  getBreastfeedingLastSideSettingKey,
  getOppositeBreastSide,
  getRoundedDurationMinutes,
  parseBreastfeedingSession,
} from "../lib/breastfeeding";
import { combineLocalDateAndTimeToUtcIso, getCurrentLocalDate, getCurrentLocalTime } from "../lib/utils";
import * as db from "../lib/db";
import type { BreastSide, FeedingEntry, FeedingLogDraft } from "../lib/types";

type SessionDurations = Record<"left" | "right", number>;

function getRecentHistoryDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays > 1) return `${diffDays} days ago`;

  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getBreastHistoryTone(side: BreastSide | null) {
  if (side === "left") {
    return {
      mirrored: false,
      bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 30%, transparent) 0%, color-mix(in srgb, #c84c89 30%, transparent) 100%)",
    };
  }
  if (side === "right") {
    return {
      mirrored: true,
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 30%, transparent) 0%, color-mix(in srgb, #6f8df0 30%, transparent) 100%)",
    };
  }
  return {
    mirrored: false,
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 26%, transparent) 0%, color-mix(in srgb, #84a7ff 26%, transparent) 100%)",
  };
}

function getBreastHistorySummary(log: FeedingEntry): string {
  const sideLabel = log.breast_side === "both" ? "Both sides" : log.breast_side === "right" ? "Right side" : "Left side";
  const durationLabel = log.duration_minutes ? `${log.duration_minutes} min` : "Logged";
  return `${sideLabel} · ${durationLabel}`;
}

function getBreastPatternLabel(side: BreastSide | null) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "Both";
}

function getBreastPatternTone(side: BreastSide | null) {
  if (side === "left") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 70%, white) 0%, color-mix(in srgb, #c84c89 76%, white) 100%)",
      border: "color-mix(in srgb, #c84c89 72%, white)",
      text: "color-mix(in srgb, #7a2453 88%, black)",
    };
  }
  if (side === "right") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, #84a7ff 72%, white) 0%, color-mix(in srgb, #6f8df0 78%, white) 100%)",
      border: "color-mix(in srgb, #6f8df0 72%, white)",
      text: "color-mix(in srgb, #28498c 88%, black)",
    };
  }
  return {
    bg: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 58%, white) 0%, color-mix(in srgb, #84a7ff 62%, white) 100%)",
    border: "color-mix(in srgb, #8f83c9 70%, white)",
    text: "color-mix(in srgb, #55487f 90%, black)",
  };
}

function BreastSideButton({
  side,
  isActive,
  isLastUsed,
  durationMs,
  onClick,
}: {
  side: "left" | "right";
  isActive: boolean;
  isLastUsed: boolean;
  durationMs: number;
  onClick: () => void;
}) {
  const sideLabel = side === "left" ? "Left" : "Right";
  const tone = side === "left"
    ? {
      chipBg: "linear-gradient(135deg, #de5c9f 0%, #c84c89 100%)",
      cardBg: "color-mix(in srgb, var(--color-surface-strong) 84%, #de5c9f 16%)",
      buttonBg: "linear-gradient(135deg, #de5c9f 0%, #ca4d8e 100%)",
    }
    : {
      chipBg: "linear-gradient(135deg, #84a7ff 0%, #6f8df0 100%)",
      cardBg: "color-mix(in srgb, var(--color-surface-strong) 84%, #84a7ff 16%)",
      buttonBg: "linear-gradient(135deg, #84a7ff 0%, #6f8df0 100%)",
    };

  return (
    <div
      className={`relative min-w-0 rounded-[24px] border px-3 pb-11 pt-3 text-left transition-all duration-200 ${isActive
        ? "border-[var(--color-primary)] shadow-[var(--shadow-medium)]"
        : "border-[var(--color-border)] shadow-[var(--shadow-soft)]"
        }`}
      style={{ background: tone.cardBg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)]"
            style={{ background: tone.chipBg }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-4.5 w-4.5"
              style={{
                backgroundColor: "white",
                transform: side === "right" ? "scaleX(-1)" : undefined,
                WebkitMaskImage: `url(${breastfeedIcon})`,
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
                maskImage: `url(${breastfeedIcon})`,
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-[var(--color-text)]">
              {sideLabel}
            </p>
            {isLastUsed && !isActive && (
              <span className="mt-1.5 inline-flex rounded-full border border-[var(--color-border)] bg-white/55 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)]">
                Used last
              </span>
            )}
          </div>
        </div>
        {isActive && (
          <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-[var(--color-text)]">
            Running
          </span>
        )}
      </div>

      <div className="px-0.5 pb-0 pt-1 text-center">
        <p className="font-[var(--font-display)] text-[2.55rem] font-semibold tracking-[-0.06em] leading-none text-[var(--color-text)]">
          {formatBreastfeedingClock(durationMs)}
        </p>
        <p className="mt-2 text-[0.82rem] leading-tight text-[var(--color-text-secondary)]">
          {isActive ? "Tap to keep timing." : "Tap to start."}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="absolute bottom-[-14px] left-1/2 flex h-[56px] w-[56px] -translate-x-1/2 items-center justify-center rounded-full text-white shadow-[var(--shadow-medium)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: tone.buttonBg }}
        aria-label={isActive ? `Continue timing ${sideLabel}` : `Start ${sideLabel}`}
      >
        {isActive ? (
          <span className="flex items-center gap-1.5">
            <span className="h-6 w-2 rounded-full bg-white" />
            <span className="h-6 w-2 rounded-full bg-white" />
          </span>
        ) : (
          <span
            className="ml-0.5 h-0 w-0 border-b-[11px] border-l-[18px] border-t-[11px] border-b-transparent border-l-white border-t-transparent"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}

function getDurationRingDisplay(durationMs: number, gradient: string) {
  if (durationMs <= 0) {
    return {
      value: "0",
      unit: "mins",
      gradient,
    };
  }

  const roundedMinutes = getRoundedDurationMinutes(durationMs);

  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    return {
      value: `${hours}`,
      unit: minutes > 0 ? `${minutes}m` : "hrs",
      gradient,
    };
  }

  return {
    value: `${roundedMinutes}`,
    unit: "mins",
    gradient,
  };
}

export function Breastfeed() {
  const navigate = useNavigate();
  const { activeChild, refreshChildren } = useChildContext();
  const { showError, showSuccess } = useToast();
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

  useEffect(() => {
    const refreshTick = () => setTick(Date.now());
    window.addEventListener("focus", refreshTick);
    document.addEventListener("visibilitychange", refreshTick);
    return () => {
      window.removeEventListener("focus", refreshTick);
      document.removeEventListener("visibilitychange", refreshTick);
    };
  }, []);

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
      await syncSmartRemindersForChild(activeChild);
      await refreshRecentBreastHistory();
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
    await refreshRecentBreastHistory();
    await syncSmartRemindersForChild(activeChild);
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

            {displayRecentHistory.length > 0 && (
              <section className="px-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[1rem] font-semibold text-[var(--color-text)]">Recent history</p>
                  <Link
                    to="/history"
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-strong)]"
                  >
                    See all
                  </Link>
                </div>
                <div className="mt-2.5 space-y-2">
                  {displayRecentHistory.map((log, index) => {
                    const tone = getBreastHistoryTone(log.breast_side);
                    return (
                      <div key={log.id} className="flex items-center gap-2.5">
                        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                          {index < displayRecentHistory.length - 1 && (
                            <span
                              className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                              style={{ backgroundColor: "var(--color-border)" }}
                            />
                          )}
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)]"
                            style={{ background: tone.bg }}
                          >
                            <span
                              aria-hidden="true"
                              className="inline-block h-4.5 w-4.5"
                              style={{
                                backgroundColor: "var(--color-text)",
                                transform: tone.mirrored ? "scaleX(-1)" : undefined,
                                WebkitMaskImage: `url(${breastfeedIcon})`,
                                WebkitMaskRepeat: "no-repeat",
                                WebkitMaskPosition: "center",
                                WebkitMaskSize: "contain",
                                maskImage: `url(${breastfeedIcon})`,
                                maskRepeat: "no-repeat",
                                maskPosition: "center",
                                maskSize: "contain",
                              }}
                            />
                          </span>
                        </div>
                        <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                          <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                          {getBreastHistorySummary(log)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="px-1" ref={patternSectionRef}>
              <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
                <p className="text-[0.9rem] font-semibold text-[var(--color-text)]">24-hour pattern</p>

                <div className="mt-2.5 overflow-x-auto pb-1">
                  <div className="w-[520px] min-w-full">
                    <div className="space-y-2">
                      <div className="relative h-[92px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-2.5 py-2.5">
                        {patternLogs.length === 0 ? (
                          <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border)] text-[0.86rem] text-[var(--color-text-soft)]">
                            No breastfeeding logs yet
                          </div>
                        ) : (
                          <>
                            <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-24 gap-1.5">
                              {Array.from({ length: 24 }, (_, hour) => (
                                <div key={hour} className="h-[64px] rounded-[8px] bg-[var(--color-bg-elevated)]/32" />
                              ))}
                            </div>
                            <div className="absolute inset-x-2.5 top-[14px] space-y-[8px]">
                              {(["left", "right", "both"] as const).map((side) => (
                                <div key={side} className="relative h-4.5">
                                  {patternLogs
                                    .filter((log) => log.breast_side === side)
                                    .map((log) => {
                                      const loggedAt = new Date(log.logged_at);
                                      const left = ((loggedAt.getHours() + loggedAt.getMinutes() / 60) / 24) * 100;
                                      const durationMinutes = Math.max(log.duration_minutes ?? 0, 1);
                                      const widthPercent = Math.max((durationMinutes / (24 * 60)) * 100, 1.4);
                                      const tone = getBreastPatternTone(log.breast_side);
                                      return (
                                        <button
                                          type="button"
                                          key={log.id}
                                          aria-label={`${getBreastPatternLabel(log.breast_side)} feed at ${loggedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} for ${durationMinutes} minutes`}
                                          className="absolute top-0 h-4.5 rounded-[6px] border shadow-[var(--shadow-soft)]"
                                          onClick={() => setSelectedPatternLogId((current) => current === log.id ? null : log.id)}
                                          style={{
                                            left: `${left}%`,
                                            width: `${widthPercent}%`,
                                            minWidth: durationMinutes < 8 ? "16px" : "20px",
                                            maxWidth: "96px",
                                            background: tone.bg,
                                            borderColor: tone.border,
                                          }}
                                        />
                                      );
                                    })}
                                </div>
                              ))}
                            </div>
                            {selectedPatternLog && (
                              <div
                                className="absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft)]"
                                style={{
                                  left: `${((new Date(selectedPatternLog.logged_at).getHours() + new Date(selectedPatternLog.logged_at).getMinutes() / 60) / 24) * 100}%`,
                                  width: "132px",
                                  maxWidth: "132px",
                                }}
                              >
                                <p className="text-[0.72rem] font-semibold text-[var(--color-text)]">
                                  {getBreastPatternLabel(selectedPatternLog.breast_side)} feed
                                </p>
                                <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-secondary)]">
                                  {new Date(selectedPatternLog.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </p>
                                <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)]">
                                  {selectedPatternLog.duration_minutes ? `${selectedPatternLog.duration_minutes} min` : "Logged"}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-5 px-0.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                        <span>12A</span>
                        <span className="text-center">6A</span>
                        <span className="text-center">12P</span>
                        <span className="text-center">6P</span>
                        <span className="text-right">11:59P</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(["left", "right", "both"] as const).map((side) => {
                    const tone = getBreastPatternTone(side);
                    return (
                      <span
                        key={side}
                        className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.75 text-[10px] font-medium"
                        style={{ borderColor: tone.border, color: tone.text, background: tone.bg }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: tone.bg }} />
                        {getBreastPatternLabel(side)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </section>

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
