import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import breastfeedIcon from "../assets/svg-assets/icons/breastfeed-icon.svg";
import { Button } from "../components/ui/button";
import { ScenicHero } from "../components/layout/ScenicHero";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
import { TrackerMetricRing } from "../components/tracking/TrackerPrimitives";
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
import type { BreastSide, FeedingEntry } from "../lib/types";

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
  const { activeChild } = useChildContext();
  const { showError, showSuccess } = useToast();
  const [durations, setDurations] = useState<SessionDurations>({ left: 0, right: 0 });
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [lastUsedSide, setLastUsedSide] = useState<BreastSide | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [recentHistory, setRecentHistory] = useState<FeedingEntry[]>([]);
  const supportsBreastfeeding = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";

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
      db.getFeedingLogs(activeChild.id, 12),
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

  if (!activeChild) return null;

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
      const feedingLogs = await db.getFeedingLogs(activeChild.id, 12);
      setRecentHistory(
        feedingLogs
          .filter((log) => log.food_type === "breast_milk" && (log.breast_side === "left" || log.breast_side === "right" || log.breast_side === "both"))
          .slice(0, 3),
      );
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

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
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
            </InsetPanel>

            {recentHistory.length > 0 && (
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
                  {recentHistory.map((log, index) => {
                    const tone = getBreastHistoryTone(log.breast_side);
                    return (
                      <div key={log.id} className="flex items-center gap-2.5">
                        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                          {index < recentHistory.length - 1 && (
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
          </>
        )}
      </div>
    </PageBody>
  );
}
