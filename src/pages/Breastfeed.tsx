import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { PageIntro } from "../components/ui/page-intro";
import { InsetPanel, PageBody } from "../components/ui/page-layout";
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
import * as db from "../lib/db";
import type { BreastSide } from "../lib/types";

type SessionDurations = Record<"left" | "right", number>;

function getLocalLoggedAt(offsetSeconds = 0): string {
  const date = new Date(Date.now() + offsetSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-5 py-5 text-left transition-all duration-200 ${
        isActive
          ? "border-[var(--color-primary)] bg-[var(--color-surface-tint)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-elevated)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
            {side}
          </p>
          <p className="mt-3 font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--color-text)]">
            {formatBreastfeedingClock(durationMs)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isActive && (
            <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-[11px] font-semibold text-[var(--color-on-primary)]">
              Running
            </span>
          )}
          {isLastUsed && !isActive && (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
              Used last
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Tap to {isActive ? "keep timing this side" : `start or resume ${side} side`}.
      </p>
    </button>
  );
}

export function Breastfeed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeChild } = useChildContext();
  const { showError, showSuccess } = useToast();
  const [durations, setDurations] = useState<SessionDurations>({ left: 0, right: 0 });
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
  const [lastUsedSide, setLastUsedSide] = useState<BreastSide | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const supportsBreastfeeding = activeChild?.feeding_type === "breast" || activeChild?.feeding_type === "mixed";
  const originPath = location.state && typeof location.state === "object" && "origin" in location.state
    ? (location.state as { origin?: string }).origin
    : undefined;

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
      setTick(Date.now());
      return;
    }

    let cancelled = false;

    setDurations({ left: 0, right: 0 });
    setActiveSide(null);
    setActiveStartedAt(null);
    setLastUsedSide(null);
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
      setTick(Date.now());
    }).catch(() => {
      if (!cancelled) {
        setDurations({ left: 0, right: 0 });
        setActiveSide(null);
        setActiveStartedAt(null);
        setLastUsedSide(null);
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

  const handlePause = async () => {
    await flushActiveDuration();
  };

  const handleReset = async () => {
    const nextSession = getEmptyBreastfeedingSession(lastUsedSide);
    setDurations(nextSession.durations);
    setActiveSide(null);
    setActiveStartedAt(null);
    setTick(Date.now());
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
        logged_at: getLocalLoggedAt(),
        food_type: "breast_milk",
        duration_minutes: getRoundedDurationMinutes(totalDurationMs),
        breast_side: breastSide,
        notes: `Timed breastfeeding session • ${sideBreakdown}`,
      });

      if (saveSide === "left" || saveSide === "right") {
        await db.setSetting(getBreastfeedingLastSideSettingKey(activeChild.id), saveSide);
      }

      const clearedSession = getEmptyBreastfeedingSession(saveSide);
      await persistSession(clearedSession);
      await syncSmartRemindersForChild(activeChild);
      showSuccess("Breastfeeding session saved.");
      navigate(originPath ?? "/");
    } catch {
      showError("Could not save the breastfeeding session.");
      setDurations(finalSession.durations);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageBody>
      <PageIntro
        eyebrow="Feeding"
        title="Breastfeed"
        description="Tap left or right to start timing. Switching sides pauses the first side automatically and keeps both totals together."
        meta={suggestedStartSide ? `Last feed finished on ${lastUsedSide}. Start on ${suggestedStartSide} if that is what you want to offer first.` : "The last-used side will be remembered here for the next feed."}
      />

      {!supportsBreastfeeding ? (
        <InsetPanel>
          <p className="text-sm font-medium text-[var(--color-text)]">Breastfeeding timer is hidden for this child profile.</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Change the feeding type in Settings if this child is breastfed or mixed fed.
          </p>
        </InsetPanel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BreastSideButton
              side="left"
              isActive={activeSide === "left"}
              isLastUsed={lastUsedSide === "left"}
              durationMs={leftDuration}
              onClick={() => handleStartSide("left")}
            />
            <BreastSideButton
              side="right"
              isActive={activeSide === "right"}
              isLastUsed={lastUsedSide === "right"}
              durationMs={rightDuration}
              onClick={() => handleStartSide("right")}
            />
          </div>

          <InsetPanel className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current session</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                  {formatBreastfeedingSummary(totalDuration)}
                </p>
              </div>
              {activeSide && (
                <span className="rounded-full bg-[var(--color-healthy-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--color-healthy)]">
                  {activeSide} side running
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Left total</p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">{formatBreastfeedingSummary(leftDuration)}</p>
              </div>
              <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Right total</p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">{formatBreastfeedingSummary(rightDuration)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handlePause} disabled={!activeSide}>
                Pause
              </Button>
              <Button variant="ghost" className="flex-1" onClick={handleReset} disabled={totalDuration < 1000}>
                Reset
              </Button>
            </div>
          </InsetPanel>

          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Save left and right as separate breastfeed entries.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              The most recently used side will be remembered here next time.
            </p>
            <Button
              variant="cta"
              className="mt-4 w-full"
              onClick={handleSave}
              disabled={totalDuration < 1000 || isSaving}
            >
              {isSaving ? "Saving..." : "Save breastfeeding session"}
            </Button>
          </div>
        </>
      )}
    </PageBody>
  );
}
