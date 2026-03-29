import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useStats } from "../hooks/useStats";
import { useEpisodes } from "../hooks/useEpisodes";
import { useSymptoms } from "../hooks/useSymptoms";
import { useCaregiverNote } from "../hooks/useCaregiverNote";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { getChildStatus } from "../lib/tauri";
import { buildChildDailySummary } from "../lib/child-summary";
import { timeSince } from "../lib/utils";
import { syncSmartRemindersForChild, syncSmartRemindersForChildren } from "../lib/notifications";
import { getFeedingEntryDisplayLabel } from "../lib/feeding";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import * as db from "../lib/db";
import { ChildSwitcherCard } from "../components/home/ChildSwitcherCard";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
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
import { Badge } from "../components/ui/badge";
import { useToast } from "../components/ui/toast";
import type { FeedingEntry, FeedingLogDraft, FeedingType, HealthStatus, PoopEntry, PoopLogDraft } from "../lib/types";

interface QuickFeedPreset {
  id: string;
  label: string;
  draft: Partial<FeedingLogDraft>;
}

interface QuickPoopPreset {
  id: string;
  label: string;
  description: string;
  draft: Partial<PoopLogDraft>;
}

function getQuickFeedPresets(feedingType: FeedingType): QuickFeedPreset[] {
  switch (feedingType) {
    case "breast":
      return [
        { id: "breast-left", label: "Breast left", draft: { food_type: "breast_milk", breast_side: "left" } },
        { id: "breast-right", label: "Breast right", draft: { food_type: "breast_milk", breast_side: "right" } },
        { id: "pumping", label: "Pumping", draft: { food_type: "pumping" } },
        { id: "bottle", label: "Bottle", draft: { food_type: "bottle" } },
      ];
    case "formula":
      return [
        { id: "formula", label: "Formula", draft: { food_type: "formula" } },
        { id: "bottle", label: "Bottle", draft: { food_type: "bottle" } },
        { id: "water", label: "Water", draft: { food_type: "water" } },
        { id: "solids", label: "Solids", draft: { food_type: "solids" } },
      ];
    case "solids":
      return [
        { id: "solids", label: "Solids", draft: { food_type: "solids" } },
        { id: "water", label: "Water", draft: { food_type: "water" } },
        { id: "bottle", label: "Bottle", draft: { food_type: "bottle" } },
        { id: "other", label: "Other food", draft: { food_type: "other" } },
      ];
    case "mixed":
    default:
      return [
        { id: "breast-left", label: "Breast left", draft: { food_type: "breast_milk", breast_side: "left" } },
        { id: "breast-right", label: "Breast right", draft: { food_type: "breast_milk", breast_side: "right" } },
        { id: "bottle", label: "Bottle", draft: { food_type: "bottle" } },
        { id: "solids", label: "Solids", draft: { food_type: "solids" } },
      ];
  }
}

function getQuickPoopPresets(feedingType: FeedingType): QuickPoopPreset[] {
  const common: QuickPoopPreset[] = [
    {
      id: "normal",
      label: "Normal",
      description: "Type 4, medium",
      draft: { stool_type: 4, color: feedingType === "breast" ? "yellow" : "brown", size: "medium" as const },
    },
    {
      id: "hard",
      label: "Hard",
      description: "Type 2, smaller poop",
      draft: { stool_type: 2, color: "brown", size: "small" as const },
    },
    {
      id: "loose",
      label: "Loose",
      description: "Type 6, softer stool",
      draft: { stool_type: 6, color: feedingType === "breast" ? "yellow" : null, size: "medium" as const },
    },
    {
      id: "large",
      label: "Large",
      description: "Type 4, larger stool",
      draft: { stool_type: 4, color: "brown", size: "large" as const },
    },
  ];

  if (feedingType === "breast") {
    return [
      {
        id: "mustard",
        label: "Mustard",
        description: "Type 5, yellow",
        draft: { stool_type: 5, color: "yellow", size: "medium" },
      },
      common[0],
      common[1],
      common[2],
    ];
  }

  return common;
}

function getCurrentFeedingTimestamp(): string {
  const now = new Date();
  return `${now.toISOString().split("T")[0]}T${now.toTimeString().slice(0, 5)}:00`;
}

function getCurrentPoopTimestamp(): string {
  const now = new Date();
  return `${now.toISOString().split("T")[0]}T${now.toTimeString().slice(0, 5)}:00`;
}

function getRepeatablePoopEntry(lastPoop: PoopEntry | null): PoopEntry | null {
  if (
    !lastPoop
    || lastPoop.is_no_poop === 1
    || lastPoop.stool_type === null
    || !lastPoop.color
    || !lastPoop.size
  ) {
    return null;
  }

  if (lastPoop.stool_type < 3 || lastPoop.stool_type > 5) {
    return null;
  }

  const colorInfo = STOOL_COLORS.find((item) => item.value === lastPoop.color);
  if (colorInfo?.isRedFlag) {
    return null;
  }

  const ageMs = Date.now() - new Date(lastPoop.logged_at).getTime();
  if (ageMs > 72 * 60 * 60 * 1000) {
    return null;
  }

  return lastPoop;
}

function getPoopPatternLabel(entry: PoopEntry): string {
  const typeLabel = entry.stool_type
    ? BITSS_TYPES.find((item) => item.type === entry.stool_type)?.label ?? `Type ${entry.stool_type}`
    : "Logged";
  const colorLabel = entry.color
    ? STOOL_COLORS.find((item) => item.value === entry.color)?.label ?? entry.color
    : "No color";

  return `Type ${entry.stool_type} · ${typeLabel} · ${colorLabel} · ${entry.size}`;
}

export function Home() {
  const navigate = useNavigate();
  const { activeChild, children, setActiveChildId } = useChildContext();
  const { showError, showSuccess } = useToast();
  const { logs, lastRealPoop, refresh: refreshLogs } = usePoopLogs(activeChild?.id ?? null);
  const { logs: feedingLogs, refresh: refreshFeedingLogs } = useFeedingLogs(activeChild?.id ?? null);
  const { activeEpisode, events: episodeEvents, recentEpisodes, refresh: refreshEpisodes } = useEpisodes(activeChild?.id ?? null);
  const { logs: symptomLogs, refresh: refreshSymptoms } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { frequency, consistency, colorDist } = useStats(activeChild?.id ?? null, 7);
  const { runChecks } = useAlertEngine();
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [poopDraft, setPoopDraft] = useState<Partial<PoopLogDraft> | null>(null);
  const [feedingFormOpen, setFeedingFormOpen] = useState(false);
  const [feedingDraft, setFeedingDraft] = useState<Partial<FeedingLogDraft> | null>(null);
  const [episodeSheetOpen, setEpisodeSheetOpen] = useState(false);
  const [episodeSheetMode, setEpisodeSheetMode] = useState<"default" | "start" | "update">("default");
  const [symptomSheetOpen, setSymptomSheetOpen] = useState(false);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [status, setStatus] = useState<HealthStatus>("healthy");
  const [normalDesc, setNormalDesc] = useState("");
  const [childSwitcherExpanded, setChildSwitcherExpanded] = useState(false);
  const {
    note: handoffNote,
    setNote: setHandoffNote,
    isSaving: isSavingHandoffNote,
    hasChanges: handoffNoteChanged,
    save: saveHandoffNote,
    reset: resetHandoffNote,
  } = useCaregiverNote(activeChild?.id ?? null);

  useEffect(() => {
    if (!activeChild) return;
    getChildStatus(
      activeChild.date_of_birth,
      activeChild.feeding_type,
      lastRealPoop?.logged_at ?? null,
    ).then(([s, desc]) => {
      setStatus(s);
      setNormalDesc(desc);
    });
  }, [activeChild, lastRealPoop]);

  useEffect(() => {
    if (children.length === 0) return;
    syncSmartRemindersForChildren(children).catch(() => {
      // Reminder sync is non-critical
    });
  }, [children]);

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
    await runChecks(activeChild);
    await refreshAlerts();
    await syncSmartRemindersForChild(activeChild);
  };

  const openPoopForm = (draft?: Partial<PoopLogDraft> | null) => {
    setPoopDraft(draft ?? null);
    setLogFormOpen(true);
  };

  const openEpisodeSheet = (mode: "default" | "start" | "update" = "default") => {
    setEpisodeSheetMode(mode);
    setEpisodeSheetOpen(true);
  };

  const handleNoPoop = async () => {
    await db.logNoPoop(activeChild.id);
    await refreshLogs();
    await syncSmartRemindersForChild(activeChild);
  };

  const handleFeedingLogged = async () => {
    await refreshFeedingLogs();
    await syncSmartRemindersForChild(activeChild);
  };

  const openFeedingForm = (draft?: Partial<FeedingLogDraft> | null) => {
    setFeedingDraft(draft ?? null);
    setFeedingFormOpen(true);
  };

  const handleRepeatLastFeed = async () => {
    const lastFeed = feedingLogs[0];
    if (!lastFeed) return;

    try {
      await db.createFeedingLog({
        child_id: activeChild.id,
        logged_at: getCurrentFeedingTimestamp(),
        food_type: lastFeed.food_type,
        food_name: lastFeed.food_name,
        amount_ml: lastFeed.amount_ml,
        duration_minutes: lastFeed.duration_minutes,
        breast_side: lastFeed.breast_side,
        bottle_content: lastFeed.bottle_content,
        reaction_notes: null,
        is_constipation_support: lastFeed.is_constipation_support,
        notes: null,
      });
      await handleFeedingLogged();
      showSuccess("Repeated the last feed.");
    } catch {
      showError("Could not repeat the last feed. Please try again.");
    }
  };

  const handleRepeatLastPoop = async () => {
    const repeatablePoop = getRepeatablePoopEntry(lastRealPoop);
    if (!repeatablePoop) return;

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
      await handleLogged();
      showSuccess("Repeated the last normal poop pattern.");
    } catch {
      showError("Could not repeat the last poop pattern. Please try again.");
    }
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

  const hasLogs = logs.length > 0;
  const lastPoopLabel = lastRealPoop?.logged_at ? timeSince(lastRealPoop.logged_at) : null;
  const summary = buildChildDailySummary({
    poopLogs: logs,
    feedingLogs,
    alerts,
    activeEpisode,
    episodeEvents,
    symptomLogs,
  });
  const lastFeed = summary.lastFeed;
  const latestSymptom = summary.latestSymptom;
  const repeatablePoop = getRepeatablePoopEntry(lastRealPoop);
  const quickFeedPresets = getQuickFeedPresets(activeChild.feeding_type);
  const quickPoopPresets = getQuickPoopPresets(activeChild.feeding_type);
  const episodeActionLabel = activeEpisode ? "Add episode update" : "Start episode";
  const episodeActionDescription = activeEpisode
    ? "Jump straight into the active episode update form."
    : "Track constipation, diarrhoea, or solids transition.";

  return (
    <div className="flex flex-col gap-4 pb-3 pt-0.5">
      {/* Alerts */}
      <AlertBanner alerts={alerts} onDismiss={dismiss} />

      {hasLogs ? (
        <>
          <div className="px-3">
            <div className="relative h-[84px]">
              <ChildSwitcherCard
                activeChild={activeChild}
                children={children}
                expanded={childSwitcherExpanded}
                lastPoopLabel={lastPoopLabel}
                onToggle={() => setChildSwitcherExpanded((open) => !open)}
                onSelectChild={(childId) => {
                  setActiveChildId(childId);
                  setChildSwitcherExpanded(false);
                }}
              />

              <AnimatePresence>
                {!childSwitcherExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                  >
                    <div className="h-11 min-w-[182px] max-w-full rounded-full bg-[var(--color-healthy-bg)] px-4 text-center text-[13px] font-semibold text-[var(--color-healthy)] shadow-[var(--shadow-soft)] whitespace-nowrap flex items-center justify-center">
                      {status === "healthy" ? "All looks normal" : status === "caution" ? "Keep an eye on it" : "Pay attention"}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-4">
            <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
                Time since last poop
              </p>
              <div className="mt-4 flex items-center gap-5">
                <TimeSinceIndicator
                  lastPoopAt={lastRealPoop?.logged_at ?? null}
                  status={status}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[20px] font-semibold leading-tight text-[var(--color-text)]">
                    {status === "healthy"
                      ? `Still in ${activeChild.name}'s usual range`
                      : status === "caution"
                        ? `Still within ${activeChild.name}'s usual range`
                        : `Time to pay closer attention`}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                    Feeds, stool type, and color are all easy to review at a glance.
                  </p>
                  <p className="mt-4 text-[12px] text-[var(--color-text-soft)]">{normalDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <NoLogsYet
          childName={activeChild.name}
          onLogFirst={() => openPoopForm()}
        />
      )}

      <div className="px-4">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick actions</p>
          <p className="mt-2 text-[16px] font-semibold text-[var(--color-text)]">Log the next thing fast</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            Keep the most common actions above the fold so the app feels faster in real use.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => openPoopForm()}
              className="min-h-[104px] rounded-[18px] bg-[var(--color-cta)] px-4 py-4 text-left text-white shadow-[var(--shadow-medium)] transition-colors hover:bg-[var(--color-cta-hover)]"
            >
              <p className="text-[15px] font-semibold">Log poop</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/80">
                Open the full poop logger with presets and notes.
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => openFeedingForm()}
              className="min-h-[104px] rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
            >
              <p className="text-[15px] font-semibold text-[var(--color-text)]">Log feed</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Start a feed or meal log with quick presets.
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleNoPoop}
              className="min-h-[104px] rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
            >
              <p className="text-[15px] font-semibold text-[var(--color-text)]">No-poop day</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Mark today if nothing happened so the timeline stays accurate.
              </p>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => openEpisodeSheet(activeEpisode ? "update" : "start")}
              className="min-h-[104px] rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-white/70"
            >
              <p className="text-[15px] font-semibold text-[var(--color-text)]">{episodeActionLabel}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                {episodeActionDescription}
              </p>
            </motion.button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setSymptomSheetOpen(true)}
              className="w-full rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
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

      <div className="px-4">
        <div className="mt-4 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick poop start</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                Start with the most likely pattern, then change anything in the sheet if it is not exact.
              </p>
            </div>
            {repeatablePoop && (
              <button
                type="button"
                onClick={handleRepeatLastPoop}
                className="shrink-0 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
              >
                Repeat last normal poop
              </button>
            )}
          </div>

          {repeatablePoop && (
            <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
              Last safe pattern: {getPoopPatternLabel(repeatablePoop)}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {quickPoopPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => openPoopForm(preset.draft)}
                className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left transition-colors hover:bg-white/70"
              >
                <p className="text-[14px] font-medium text-[var(--color-text)]">{preset.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-soft)]">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick feed start</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                Start with the type already chosen, then add details only if needed.
              </p>
            </div>
            {lastFeed && (
              <button
                type="button"
                onClick={handleRepeatLastFeed}
                className="shrink-0 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
              >
                Repeat last feed
              </button>
            )}
          </div>

          {lastFeed && (
            <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
              Last feed: {getFeedingEntryDisplayLabel(lastFeed)}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {quickFeedPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => openFeedingForm(preset.draft)}
                className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 text-left text-[14px] font-medium text-[var(--color-text)] transition-colors hover:bg-white/70"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {(logs.length > 0 || feedingLogs.length > 0) && (
        <RecentActivity
          poopLogs={logs}
          feedingLogs={feedingLogs}
          onEditPoop={setEditingPoop}
          onEditMeal={setEditingMeal}
        />
      )}

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
