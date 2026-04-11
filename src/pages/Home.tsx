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
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useCaregiverNote } from "../hooks/useCaregiverNote";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { buildChildDailySummary } from "../lib/child-summary";
import { getBreastfeedingSessionSettingKey, parseBreastfeedingSession } from "../lib/breastfeeding";
import { syncSmartRemindersForChild, syncSmartRemindersForChildren } from "../lib/notifications";
import * as db from "../lib/db";
import { HomeTopSection } from "../components/home/HomeTopSection";
import { RecentActivity } from "../components/home/RecentActivity";
import { CareToolsSection } from "../components/home/CareToolsSection";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { LogForm } from "../components/logging/LogForm";
import { DietLogForm } from "../components/logging/DietLogForm";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { EpisodeSheet } from "../components/episodes/EpisodeSheet";
import { NoLogsYet } from "../components/empty-states/NoLogsYet";
import { SymptomSheet } from "../components/symptoms/SymptomSheet";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import {
  HomeActionBottleIcon,
  HomeActionBreastfeedIcon,
  HomeActionDiaperIcon,
  HomeActionEpisodeIcon,
  HomeActionSleepIcon,
  HomeActionSymptomIcon,
} from "../components/ui/icons";
import { useToast } from "../components/ui/toast";
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
      void refreshFeedingLogs();
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeChild, refreshFeedingLogs]);

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
  const showBreastfeedAction = activeChild.feeding_type === "breast" || activeChild.feeding_type === "mixed";
  const episodeActionLabel = activeEpisode ? "Add episode update" : "Start episode";
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
    <div className="flex flex-col gap-3 pb-2 pt-0.5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />
      {hasLogs && (
        <div
          className={`pointer-events-none fixed inset-x-0 z-30 transition-all duration-200 ${showStickyChildBar ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
          style={{
            top: 0,
            height: "calc(var(--safe-area-top) + 74px)",
            background: "var(--gradient-home-sticky-overlay)",
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
          avatarAnchorRef={avatarAnchorRef}
          otherChildren={otherChildren}
          onSelectChild={setActiveChildId}
        />
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
        />
      )}

      <div className="px-4 pt-1">
        <div className="grid grid-cols-3 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            style={{ background: "var(--gradient-home-action-primary)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <HomeActionDiaperIcon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-[0.74rem] font-semibold leading-none">{experience.mode === "diaper" ? "Log diaper" : "Log poop"}</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => openFeedingForm()}
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            style={{ background: "var(--gradient-home-action-feed)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
              <HomeActionBottleIcon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">Log feed</p>
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
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-55"
            style={{ background: "var(--gradient-home-action-breastfeed)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
              <HomeActionBreastfeedIcon className="h-4 w-4" />
            </span>
            <div className="mt-1 flex items-center gap-0.5">
              <p className="text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">
                {showBreastfeedAction ? "Breastfeed" : "Repeat last feed"}
              </p>
              {showBreastfeedAction && activeBreastfeedingSide && (
                <span
                  className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-surface-strong)] px-0.5 text-[0.52rem] font-bold text-[var(--color-primary)]"
                  aria-label={activeBreastfeedingSide === "left" ? "Left breastfeeding timer running" : "Right breastfeeding timer running"}
                >
                  {activeBreastfeedingSide === "left" ? "L" : "R"}
                </span>
              )}
            </div>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSleepSheetOpen(true)}
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            style={{ background: "var(--gradient-home-action-sleep)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center text-[var(--color-text)]">
              <HomeActionSleepIcon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">Log sleep</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => openEpisodeSheet(activeEpisode ? "update" : "start")}
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            style={{ background: "var(--gradient-home-action-episode)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <HomeActionEpisodeIcon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-[0.74rem] font-semibold leading-none">{episodeActionLabel}</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSymptomSheetOpen(true)}
            className="flex h-[64px] flex-col items-center justify-center rounded-[14px] px-1.5 py-1 text-center text-white shadow-[var(--shadow-medium)] transition-colors hover:brightness-[1.02]"
            style={{ background: "var(--gradient-home-action-symptom)" }}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              <HomeActionSymptomIcon className="h-4 w-4" />
            </span>
            <p className="mt-1 text-[0.74rem] font-semibold leading-none">Log symptom</p>
          </motion.button>
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
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-home-hover-surface)]"
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

          <div className="mt-3">
            <button
              type="button"
              onClick={handleSaveHandoffNote}
              disabled={!handoffNoteChanged || isSavingHandoffNote}
              className="w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-[14px] font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingHandoffNote ? "Saving..." : "Save note"}
            </button>
          </div>
        </div>
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

      <CareToolsSection />

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
