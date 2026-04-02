import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import watercolorClouds from "../assets/watercolor-clouds.svg";
import watercolorMountains from "../assets/watercolor-mountains.svg";
import watercolorSun from "../assets/watercolor-sun.svg";
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
import { Avatar } from "../components/child/Avatar";
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
import type { DiaperEntry, DiaperLogDraft, FeedingEntry, FeedingLogDraft, PoopEntry, PoopLogDraft } from "../lib/types";

function SunMoodIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <circle cx="24" cy="24" r="9.5" fill="#F6D97B" stroke="#E6B25F" strokeWidth="2" />
      {[
        [24, 5, 24, 11],
        [24, 37, 24, 43],
        [5, 24, 11, 24],
        [37, 24, 43, 24],
        [11.2, 11.2, 15.5, 15.5],
        [32.5, 32.5, 36.8, 36.8],
        [11.2, 36.8, 15.5, 32.5],
        [32.5, 15.5, 36.8, 11.2],
      ].map(([x1, y1, x2, y2], index) => (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F0C98A" strokeWidth="2.4" strokeLinecap="round" />
      ))}
      <path d="M20.5 27.1c.9 1.1 2.1 1.6 3.5 1.6 1.5 0 2.7-.5 3.5-1.6" fill="none" stroke="#9F6F3A" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="20" cy="22" r="1.3" fill="#9F6F3A" />
      <circle cx="28" cy="22" r="1.3" fill="#9F6F3A" />
    </svg>
  );
}

function RainbowMoodIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <path d="M11 30a13 13 0 0 1 26 0" fill="none" stroke="#F08D7E" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 30a10 10 0 0 1 20 0" fill="none" stroke="#F2C97D" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 30a7 7 0 0 1 14 0" fill="none" stroke="#8FC4E8" strokeWidth="4" strokeLinecap="round" />
      <path d="M13 31c0-3.5 2.9-6.4 6.4-6.4 2.3 0 4.2 1 5.3 2.8 1.1-1.8 3-2.8 5.3-2.8 3.5 0 6.4 2.9 6.4 6.4 0 3.1-2.5 5.6-5.6 5.6H18.6A5.6 5.6 0 0 1 13 31Z" fill="#F7F8FB" stroke="#BFD0E6" strokeWidth="1.8" />
    </svg>
  );
}

function MoonMoodIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      <path d="M29.8 10.4c-6.8 1.2-12 7.2-12 14.4 0 3.8 1.4 7.2 3.8 9.9-6.3-.7-11.2-6-11.2-12.5 0-7 5.7-12.7 12.7-12.7 2.5 0 4.8.7 6.7 1.9Z" fill="#F4D38A" stroke="#C89749" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m33.5 13 1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4Z" fill="#F4D38A" />
      <path d="m38 19 1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1L38 19Z" fill="#F8E8BD" />
    </svg>
  );
}

function DiaperSummaryIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <path d="M8 9.5c0 1.4-.3 3-.9 4.5-.8 2-1.1 4-.8 5.9l.3 1.7c.2 1.3 1.3 2.3 2.7 2.3h13.4c1.3 0 2.5-1 2.7-2.3l.3-1.7c.3-1.9 0-3.9-.8-5.9-.6-1.5-.9-3.1-.9-4.5H21c0 2.2-1.8 4-4 4h-2c-2.2 0-4-1.8-4-4H8Z" fill="none" stroke="#93A7B9" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M11 9.5h10" stroke="#93A7B9" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12.2 18.5c1.3 1.1 2.5 1.6 3.8 1.6 1.3 0 2.5-.5 3.8-1.6" fill="none" stroke="#C7A36B" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function BottleSummaryIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <path d="M13 5h6v3.4l1.7 1.8c1 1 1.5 2.3 1.5 3.7V24a3 3 0 0 1-3 3h-6.4a3 3 0 0 1-3-3V13.9c0-1.4.5-2.7 1.5-3.7L13 8.4V5Z" fill="none" stroke="#D9A16D" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 15h8M12 19h8" stroke="#D9A16D" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 5h2" stroke="#D9A16D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SleepSummaryIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <path d="M21.9 7.6c-4.8.8-8.4 5-8.4 10 0 2.5.9 4.9 2.6 6.8-4.4-.5-7.8-4.2-7.8-8.7 0-4.9 4-8.9 8.9-8.9 1.7 0 3.3.5 4.7 1.3Z" fill="#D9C8EE" stroke="#A892C8" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m22.8 10.2.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8.8-1.8Z" fill="#EADDF7" />
    </svg>
  );
}

export function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateWithOrigin = (path: string) => navigate(path, { state: { origin: location.pathname } });
  const { activeChild, children } = useChildContext();
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

  const hasDiaperLogs = diaperLogs.length > 0;
  const hasLogs = experience.mode === "diaper" ? hasDiaperLogs : logs.length > 0;
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
  const moodCards = [
    { label: "Feeling Good", icon: <SunMoodIcon />, tone: "bg-[rgba(255,237,222,0.9)]" },
    { label: "Managing Okay", icon: <RainbowMoodIcon />, tone: "bg-[rgba(255,252,247,0.95)]" },
    { label: "Need a Moment", icon: <MoonMoodIcon />, tone: "bg-[rgba(255,252,247,0.95)]" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-3 pt-0.5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />

      {hasLogs ? (
        <>
          <section className="-mx-4 -mt-2 overflow-hidden px-4 pb-3 pt-1">
            <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
              <defs>
                <clipPath id="home-hero-curve" clipPathUnits="objectBoundingBox">
                  <path d="M0,0 H1 V0.62 Q0.6,0.74 0,0.64 Z" />
                </clipPath>
              </defs>
            </svg>
            <div
              className="relative h-[350px] overflow-hidden px-4 pt-6"
              style={{ clipPath: "url(#home-hero-curve)" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_76%_18%,rgba(255,214,119,0.58)_0%,rgba(255,214,119,0.2)_20%,rgba(255,255,255,0)_50%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,204,170,0.14)_0%,rgba(255,255,255,0)_44%)]" />
              <img src={watercolorClouds} alt="" aria-hidden="true" className="pointer-events-none absolute left-[-14px] top-[18px] w-[calc(100%+28px)] opacity-95" />
              <img src={watercolorSun} alt="" aria-hidden="true" className="pointer-events-none absolute right-[14px] top-[10px] w-[130px] opacity-95" />
              <img src={watercolorMountains} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[74px] w-full scale-[1.12] opacity-100" />
              <div className="pointer-events-none absolute inset-x-[-6%] top-[86px] h-[165px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(245,221,208,0.08)_40%,rgba(238,183,155,0.2)_100%)]" />
              <div className="pointer-events-none absolute left-[12px] top-[106px] h-12 w-20 rounded-full bg-white/46 blur-[8px]" />
              <div className="pointer-events-none absolute left-[42px] top-[112px] h-8 w-8 rounded-full bg-white/54 blur-[6px]" />
              <div className="pointer-events-none absolute left-[72px] top-[108px] h-9 w-9 rounded-full bg-white/36 blur-[8px]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(251,245,234,0)_0%,rgba(251,245,234,0.62)_72%,rgba(251,245,234,0.94)_100%)]" />
              <div className="relative flex h-full items-start pt-8">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full pr-[102px]"
                >
                  <h1 className="font-[var(--font-display)] text-[2.05rem] font-extrabold leading-[1.1] tracking-[-0.05em] text-[#E79A88]">
                    How are you holding up today?
                  </h1>
                  <p className="mt-2 text-[0.98rem] leading-tight tracking-[-0.02em] text-[var(--color-text)]">
                    Daily Check-in: Parent & Baby Care
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <Avatar
                      childId={activeChild.id}
                      name={activeChild.name}
                      color={activeChild.avatar_color}
                      size="sm"
                      className="h-10 w-10 border-2 border-white/70 shadow-[var(--shadow-soft)]"
                    />
                    <div>
                      <p className="text-[1.05rem] font-semibold text-[var(--color-text)]">{activeChild.name}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="px-4">
              <div className="-mt-24 grid grid-cols-3 gap-3">
                {moodCards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    className={`min-h-[96px] rounded-[20px] border border-[rgba(155,126,102,0.14)] px-2 py-3 text-center shadow-[0_10px_22px_rgba(184,146,118,0.12)] ${card.tone}`}
                  >
                    <div className="flex justify-center">{card.icon}</div>
                    <p className="mt-2 text-[0.92rem] font-semibold leading-tight text-[var(--color-text)]">{card.label}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[22px] border border-[rgba(155,126,102,0.14)] bg-[rgba(255,252,247,0.94)] p-4 shadow-[0_14px_28px_rgba(184,146,118,0.11)]">
                <p className="text-[1.05rem] font-medium text-[var(--color-text)]">Quick Summary (Last 24h)</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[5px] border-[rgba(240,158,126,0.9)] bg-white shadow-[0_0_0_4px_rgba(255,237,228,0.78)]">
                      <div className="flex flex-col items-center">
                        <DiaperSummaryIcon />
                        <p className="mt-1 text-[0.9rem] font-semibold leading-none text-[var(--color-text)]">Diapers: {summary.todayWetDiapers + summary.todayDirtyDiapers}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">{summary.todayWetDiapers} Wet, {summary.todayDirtyDiapers} Dirty</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[5px] border-[rgba(240,158,126,0.9)] bg-white shadow-[0_0_0_4px_rgba(255,237,228,0.78)]">
                      <div className="flex flex-col items-center">
                        <BottleSummaryIcon />
                        <p className="mt-1 text-[0.9rem] font-semibold leading-none text-[var(--color-text)]">Feeds: {summary.todayFeeds}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">{lastFeed ? `Last ${timeSince(lastFeed.logged_at)}` : "No feed yet"}</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[5px] border-[rgba(240,158,126,0.9)] bg-white shadow-[0_0_0_4px_rgba(255,237,228,0.78)]">
                      <div className="flex flex-col items-center">
                        <SleepSummaryIcon />
                        <p className="mt-1 text-[0.88rem] font-semibold leading-none text-[var(--color-text)]">Sleep: {sleepSummaryLabel}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--color-text-secondary)]">
                      {sleepLogs.length > 0 ? `${sleepLogs.filter((entry) => entry.sleep_type === "nap").length} Naps` : "No sleep logs"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="mt-4 h-12 w-full rounded-full bg-[var(--color-cta)] px-5 text-[0.98rem] font-semibold text-white shadow-[var(--shadow-medium)]"
              >
                Continue to Dashboard
              </button>
            </div>
          </section>
        </>
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => experience.mode === "diaper" ? openDiaperForm({ diaper_type: "wet", urine_color: "normal" }) : openPoopForm()}
        />
      )}

      <div className="px-4">
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
