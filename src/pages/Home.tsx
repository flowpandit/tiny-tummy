import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useStats } from "../hooks/useStats";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useCaregiverNote } from "../hooks/useCaregiverNote";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { buildChildDailySummary } from "../lib/child-summary";
import { getBreastfeedingSessionSettingKey, parseBreastfeedingSession } from "../lib/breastfeeding";
import { timeSince } from "../lib/utils";
import { syncSmartRemindersForChild, syncSmartRemindersForChildren } from "../lib/notifications";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import * as db from "../lib/db";
import { HomeTopSection } from "../components/home/HomeTopSection";
import { WeeklyPatternCard } from "../components/home/WeeklyPatternCard";
import { EpisodeCard } from "../components/home/EpisodeCard";
import { RecentActivity } from "../components/home/RecentActivity";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { LogForm } from "../components/logging/LogForm";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { EpisodeSheet } from "../components/episodes/EpisodeSheet";
import { NoLogsYet } from "../components/empty-states/NoLogsYet";
import { SymptomSheet } from "../components/symptoms/SymptomSheet";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/toast";
import { DiscoveryLinks } from "../components/discovery/DiscoveryLinks";
import { DiaperLogForm } from "../components/logging/DiaperLogForm";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { CompactChildNav } from "../components/layout/CompactChildNav";
import type { DiaperEntry, DiaperLogDraft, FeedingEntry, FeedingLogDraft, PoopEntry, PoopLogDraft } from "../lib/types";

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithOrigin = (path: string) => navigate(path, { state: { origin: location.pathname } });
  const { activeChild, children, setActiveChildId } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
  const { showError, showSuccess } = useToast();
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const {
    logs: diaperLogs,
    refresh: refreshDiaperLogs,
  } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: feedingLogs, refresh: refreshFeedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { logs: sleepLogs, refresh: refreshSleepLogs } = useSleepLogs(activeChild?.id ?? null);
  const { activeEpisode, events: episodeEvents, recentEpisodes, refresh: refreshEpisodes } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs, refresh: refreshSymptoms } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { frequency, consistency, colorDist } = useStats(activeChild?.id ?? null, 7);
  const { runChecks } = useAlertEngine();
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [poopDraft, setPoopDraft] = useState<Partial<PoopLogDraft> | null>(null);
  const [diaperFormOpen, setDiaperFormOpen] = useState(false);
  const [diaperDraft, setDiaperDraft] = useState<Partial<DiaperLogDraft> | null>(null);
  const [feedingFormOpen, setFeedingFormOpen] = useState(false);
  const [feedingDraft, setFeedingDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [episodeSheetOpen, setEpisodeSheetOpen] = useState(false);
  const [episodeSheetMode, setEpisodeSheetMode] = useState<"default" | "start" | "update">("default");
  const [symptomSheetOpen, setSymptomSheetOpen] = useState(false);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingDiaper, setEditingDiaper] = useState<DiaperEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [activeBreastfeedingSide, setActiveBreastfeedingSide] = useState<"left" | "right" | null>(null);
  const [showStickyChildBar, setShowStickyChildBar] = useState(false);
  const avatarAnchorRef = useRef<HTMLDivElement | null>(null);
  const hasDiaperLogs = diaperLogs.length > 0;
  const hasLogs = experience.mode === "diaper" ? hasDiaperLogs : logs.length > 0;
  const {
    note: handoffNote,
    setNote: setHandoffNote,
    isSaving: isSavingHandoffNote,
    hasChanges: handoffNoteChanged,
    save: saveHandoffNote,
    reset: resetHandoffNote,
  } = useCaregiverNote(activeChild?.id ?? null);

  useEffect(() => {
    if (children.length === 0) return;
    syncSmartRemindersForChildren(children).catch(() => {
      // Reminder sync is non-critical
    });
  }, [children]);

  useEffect(() => {
    if (!activeChild) {
      setActiveBreastfeedingSide(null);
      return;
    }

    let cancelled = false;

    const refreshBreastfeedingSession = () => {
      db.getSetting(getBreastfeedingSessionSettingKey(activeChild.id))
        .then((raw: string | null) => {
          if (cancelled) return;
          const session = parseBreastfeedingSession(raw);
          setActiveBreastfeedingSide(session?.activeSide ?? null);
        })
        .catch(() => {
          if (!cancelled) {
            setActiveBreastfeedingSide(null);
          }
        });
    };

    refreshBreastfeedingSession();

    const handleVisibility = () => {
      refreshBreastfeedingSession();
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeChild]);

  useEffect(() => {
    if (!hasLogs) {
      setShowStickyChildBar(false);
      return;
    }

    const avatarAnchor = avatarAnchorRef.current;
    if (!avatarAnchor) return;

    const scrollRoot = avatarAnchor.closest("main");
    if (!(scrollRoot instanceof HTMLElement)) return;

    const updateStickyBar = () => {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const anchorTop = avatarAnchor.getBoundingClientRect().top;
      setShowStickyChildBar(anchorTop <= rootTop + 12);
    };

    updateStickyBar();
    scrollRoot.addEventListener("scroll", updateStickyBar, { passive: true });
    window.addEventListener("resize", updateStickyBar);

    return () => {
      scrollRoot.removeEventListener("scroll", updateStickyBar);
      window.removeEventListener("resize", updateStickyBar);
    };
  }, [activeChild, hasLogs]);

  useEffect(() => {
    if (!activeChild) return;
    db.reconcileAutoNoPoopDays(activeChild.id).then((changes: number) => {
      if (changes > 0) {
        void refreshLogs();
      }
    }).catch(() => {
      // Auto no-poop marking is non-critical
    });
  }, [
    activeChild,
    logs[0]?.id,
    feedingLogs[0]?.id,
    symptomLogs[0]?.id,
    recentEpisodes[0]?.id,
  ]);

  useEffect(() => {
    if (!activeChild) return;
    syncSmartRemindersForChild(activeChild).catch(() => {
      // Reminder sync is non-critical
    });
  }, [
    activeChild,
    lastRealPoop?.id,
    lastRealPoop?.logged_at,
    lastRealPoop?.color,
    feedingLogs[0]?.id,
    feedingLogs[0]?.logged_at,
    activeEpisode?.id,
    activeEpisode?.status,
    activeEpisode?.episode_type,
    episodeEvents[0]?.id,
    episodeEvents[0]?.logged_at,
  ]);

  // Run alert checks on mount, when child changes, and every 30 minutes
  useEffect(() => {
    if (!activeChild) return;

    const check = () => runChecks(activeChild).then(() => refreshAlerts());
    check();

    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeChild, runChecks, refreshAlerts]);

  if (!activeChild) return null;

  const handleLogged = async () => {
    await refreshLogs();
    await refreshDiaperLogs();
    await runChecks(activeChild);
    await refreshAlerts();
    await syncSmartRemindersForChild(activeChild);
  };

  const openPoopForm = (draft?: Partial<PoopLogDraft> | null) => {
    setPoopDraft(draft ?? null);
    setLogFormOpen(true);
  };

  const openDiaperForm = (draft?: Partial<DiaperLogDraft> | null) => {
    setDiaperDraft(draft ?? null);
    setDiaperFormOpen(true);
  };

  const openEpisodeSheet = (mode: "default" | "start" | "update" = "default") => {
    setEpisodeSheetMode(mode);
    setEpisodeSheetOpen(true);
  };

  const handleFeedingLogged = async () => {
    await refreshFeedingLogs();
    await syncSmartRemindersForChild(activeChild);
  };

  const openFeedingForm = (draft?: Partial<FeedingLogDraft> | null) => {
    setFeedingDraft(draft ?? null);
    setFeedingFormOpen(true);
  };

  const handleSaveHandoffNote = async () => {
    try {
      await saveHandoffNote();
      showSuccess("Caregiver note saved.");
    } catch {
      showError("Could not save the caregiver note. Please try again.");
    }
  };

  const handleEpisodeUpdated = async () => {
    await refreshEpisodes();
    await syncSmartRemindersForChild(activeChild);
  };

  const handleSymptomLogged = async () => {
    await refreshSymptoms();
    await refreshEpisodes();
  };

  const handleSleepLogged = async () => {
    await refreshSleepLogs();
  };
  const summary = buildChildDailySummary({
    poopLogs: logs,
    diaperLogs,
    feedingLogs,
    alerts,
    activeEpisode,
    episodeEvents,
    symptomLogs,
  });
  const lastFeed = summary.lastFeed;
  const latestSymptom = summary.latestSymptom;
  const showBreastfeedAction = activeChild.feeding_type === "breast" || activeChild.feeding_type === "mixed";
  const episodeActionLabel = activeEpisode ? "Add episode update" : "Start episode";
  const episodeActionDescription = activeEpisode
    ? "Jump straight into the active episode update form."
    : "Track constipation, diarrhoea, or solids transition.";
  const sleepSummaryHours = sleepLogs
    .filter((entry) => {
      const started = new Date(entry.started_at);
      return Date.now() - started.getTime() < 24 * 60 * 60 * 1000;
    })
    .reduce((sum, entry) => {
      const end = entry.ended_at ? new Date(entry.ended_at).getTime() : Date.now();
      const start = new Date(entry.started_at).getTime();
      return sum + Math.max(0, end - start);
    }, 0);
  const sleepSummaryLabel = sleepSummaryHours > 0
    ? `${Math.floor(sleepSummaryHours / (1000 * 60 * 60))}h ${Math.round((sleepSummaryHours % (1000 * 60 * 60)) / (1000 * 60))}m`
    : "0h";
  const sleepSummaryHoursValue = sleepSummaryHours / (1000 * 60 * 60);
  const sleepNapCount = sleepLogs.filter((entry) => entry.sleep_type === "nap").length;
  const otherChildren = children.filter((child) => child.id !== activeChild.id);

  return (
    <div className="flex flex-col gap-0 pb-3 pt-0.5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />
      {hasLogs && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-30 transition-all duration-200 ${showStickyChildBar ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
          style={{
            top: 0,
            height: "calc(var(--safe-area-top) + 74px)",
            background: "linear-gradient(180deg, rgba(255,250,243,0.95) 0%, rgba(255,250,243,0.55) 74%, transparent 100%)",
            backdropFilter: "blur(24px) saturate(1.02)",
            WebkitBackdropFilter: "blur(24px) saturate(1.02)",
          }}
        >
          <div
            className="mx-auto flex max-w-[600px] items-center justify-between gap-3 bg-transparent px-4 py-3"
            style={{ marginTop: "calc(var(--safe-area-top) + 16px)" }}
          >
            <CompactChildNav
              activeChild={activeChild}
              otherChildren={otherChildren}
              onSelectChild={setActiveChildId}
              className="flex w-full items-center justify-between gap-3"
            />
          </div>
        </div>
      )}

      {hasLogs ? (
        <HomeTopSection
          activeChild={activeChild}
          summary={summary}
          sleepSummaryLabel={sleepSummaryLabel}
          sleepSummaryHoursValue={sleepSummaryHoursValue}
          sleepNapCount={sleepNapCount}
          onContinueToDashboard={() => navigate("/dashboard")}
          avatarAnchorRef={avatarAnchorRef}
        />
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
        />
      )}

      <div className="px-4 pt-2">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick actions</p>
          <p className="mt-2 font-[var(--font-display)] text-[2rem] font-semibold leading-[0.98] tracking-[-0.035em] text-[var(--color-text)]">Log the next thing gently</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            Keep the next likely care actions close without turning the home screen into a utility grid.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
              className="min-h-[114px] rounded-[24px] bg-[linear-gradient(180deg,#efac88_0%,#eb9772_100%)] px-4 py-4 text-left text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            >
              <p className="text-[15px] font-semibold">{experience.mode === "diaper" ? "Log diaper" : "Log poop"}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/80">
                {experience.mode === "diaper"
                  ? "Start with wet, dirty, or mixed in the young-baby workflow."
                  : "Open the full poop logger with presets and notes."}
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => openFeedingForm()}
              className="min-h-[114px] rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(192,222,195,0.92)_0%,rgba(235,245,233,0.92)_100%)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
            >
              <p className="text-[15px] font-semibold text-[var(--color-text)]">Log feed</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Start a feed or meal log with quick presets.
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (showBreastfeedAction) {
                  navigateWithOrigin("/breastfeed");
                  return;
                }
                navigateWithOrigin("/feed");
              }}
              disabled={!showBreastfeedAction && !lastFeed}
              className="min-h-[114px] rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(220,231,248,0.92)_0%,rgba(246,249,254,0.92)_100%)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-[var(--color-text)]">
                  {showBreastfeedAction ? "Breastfeed" : "Repeat last feed"}
                </p>
                {showBreastfeedAction && activeBreastfeedingSide && (
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary)]"
                    aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
                    title={activeBreastfeedingSide === "left" ? "Left running" : "Right running"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0V10c0 .199.079.39.22.53l2.25 2.25a.75.75 0 1 0 1.06-1.06L10.75 9.69V6.75Z" clipRule="evenodd" />
                    </svg>
                    {activeBreastfeedingSide === "left" ? "L" : "R"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                {showBreastfeedAction
                  ? "Open the side-by-side timer for left and right breast."
                  : "Reuse the last feed structure without filling the form again."}
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setSleepSheetOpen(true)}
              className="min-h-[114px] rounded-[24px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(236,223,243,0.92)_0%,rgba(250,244,252,0.92)_100%)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
            >
              <p className="text-[15px] font-semibold text-[var(--color-text)]">Log sleep</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Start a nap or night sleep log with timer or manual times.
              </p>
            </motion.button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => openEpisodeSheet(activeEpisode ? "update" : "start")}
              className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
            >
              <p className="text-[14px] font-semibold text-[var(--color-text)]">{episodeActionLabel}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                {episodeActionDescription}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSymptomSheetOpen(true)}
              className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
            >
              <p className="text-[14px] font-semibold text-[var(--color-text)]">Log symptom</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Capture straining, pain, vomiting, rash, dehydration concern, or blood concern.
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Caregiver note</p>
              <p className="mt-2 text-[15px] font-semibold text-[var(--color-text)]">Leave the next person a clear note</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/handoff")}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
            >
              Open Handoff
            </button>
          </div>

          <textarea
            value={handoffNote}
            onChange={(event) => setHandoffNote(event.target.value)}
            placeholder="e.g. Offer more water at lunch and watch for another poop this afternoon."
            rows={3}
            className="mt-3 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleSaveHandoffNote}
              disabled={!handoffNoteChanged || isSavingHandoffNote}
              className="flex-1 rounded-full bg-[var(--color-primary)] px-4 py-3 text-[14px] font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingHandoffNote ? "Saving..." : "Save note"}
            </button>
            <button
              type="button"
              onClick={resetHandoffNote}
              disabled={!handoffNoteChanged}
              className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-[14px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Symptoms</p>
              <p className="mt-2 text-[15px] font-semibold text-[var(--color-text)]">Recent symptom context</p>
            </div>
            <button
              type="button"
              onClick={() => setSymptomSheetOpen(true)}
              className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
            >
              Add symptom
            </button>
          </div>

          {!latestSymptom ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              No symptoms logged yet. Add symptoms when they help explain a bowel pattern or doctor visit.
            </p>
          ) : (
            <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {getSymptomTypeLabel(latestSymptom.symptom_type)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                    {timeSince(latestSymptom.logged_at)} · {latestSymptom.episode_id ? "linked to episode" : "standalone"}
                  </p>
                </div>
                <Badge variant={getSymptomSeverityBadgeVariant(latestSymptom.severity)}>
                  {getSymptomSeverityLabel(latestSymptom.severity)}
                </Badge>
              </div>
              {latestSymptom.notes && (
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {latestSymptom.notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {hasLogs && (
        <div className="px-4">
          <WeeklyPatternCard
            frequency={frequency}
            consistency={consistency}
            colorDist={colorDist}
            poopLogs={logs}
          />
        </div>
      )}

      <div className="px-4">
        <EpisodeCard
          activeEpisode={activeEpisode}
          events={episodeEvents}
          recentEpisodes={recentEpisodes}
          onOpen={() => openEpisodeSheet("default")}
        />
      </div>

      {/* Recent activity */}
      {(logs.length > 0 || feedingLogs.length > 0) && (
        <RecentActivity
          poopLogs={experience.mode === "diaper" ? [] : logs}
          diaperLogs={experience.mode === "diaper" ? diaperLogs : []}
          feedingLogs={feedingLogs}
          onEditPoop={setEditingPoop}
          onEditDiaper={setEditingDiaper}
          onEditMeal={setEditingMeal}
        />
      )}

      <div className="px-4">
        <DiscoveryLinks
          eyebrow="Care tools"
          title="Open the right surface"
          description="The less-frequent pages stay one tap away without taking over the bottom nav."
          items={[
            {
              to: "/history",
              title: "History",
              description: "Review the full timeline across logs.",
            },
            {
              to: "/growth",
              title: "Growth",
              description: "Check weight, length, and head trends.",
              tone: "info",
            },
            {
              to: "/milestones",
              title: "Milestones",
              description: "See context like solids, illness, or teething.",
            },
            {
              to: "/handoff",
              title: "Caregiver handoff",
              description: "Share the current state with the next person.",
              tone: "healthy",
            },
          ]}
        />
      </div>

      {/* Log form sheet */}
      <LogForm
        open={logFormOpen}
        onClose={() => {
          setLogFormOpen(false);
          setPoopDraft(null);
        }}
        childId={activeChild.id}
        onLogged={handleLogged}
        initialDraft={poopDraft}
      />

      <DiaperLogForm
        open={diaperFormOpen}
        onClose={() => {
          setDiaperFormOpen(false);
          setDiaperDraft(null);
        }}
        childId={activeChild.id}
        onLogged={handleLogged}
        initialDraft={diaperDraft}
      />

      {/* Diet log form sheet */}
      <DietLogForm
        open={feedingFormOpen}
        onClose={() => {
          setFeedingFormOpen(false);
          setFeedingDraft(null);
        }}
        childId={activeChild.id}
        onLogged={handleFeedingLogged}
        initialDraft={feedingDraft}
      />

      <EpisodeSheet
        open={episodeSheetOpen}
        onClose={() => {
          setEpisodeSheetOpen(false);
          setEpisodeSheetMode("default");
        }}
        childId={activeChild.id}
        activeEpisode={activeEpisode}
        events={episodeEvents}
        onUpdated={handleEpisodeUpdated}
        initialMode={episodeSheetMode}
      />

      <SymptomSheet
        open={symptomSheetOpen}
        onClose={() => setSymptomSheetOpen(false)}
        childId={activeChild.id}
        activeEpisode={activeEpisode}
        onLogged={handleSymptomLogged}
      />

      <SleepLogSheet
        open={sleepSheetOpen}
        onClose={() => setSleepSheetOpen(false)}
        childId={activeChild.id}
        onLogged={handleSleepLogged}
      />

      {/* Edit sheets */}
      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => setEditingPoop(null)}
          onSaved={() => { refreshLogs(); refreshFeedingLogs(); }}
          onDeleted={() => { refreshLogs(); refreshFeedingLogs(); }}
        />
      )}
      {editingDiaper && (
        <EditDiaperSheet
          key={editingDiaper.id}
          entry={editingDiaper}
          open={!!editingDiaper}
          onClose={() => setEditingDiaper(null)}
          onSaved={() => { setEditingDiaper(null); void handleLogged(); }}
          onDeleted={() => { setEditingDiaper(null); void handleLogged(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => { refreshLogs(); refreshFeedingLogs(); }}
          onDeleted={() => { refreshLogs(); refreshFeedingLogs(); }}
        />
      )}
    </div>
  );
}
