import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useDiaperLogs } from "../hooks/useDiaperLogs";
import { useSymptoms } from "../hooks/useSymptoms";
import { useAlerts } from "../hooks/useAlerts";
import { useAlertEngine } from "../hooks/useAlertEngine";
import { useEliminationPreference } from "../hooks/useEliminationPreference";
import { diaperIncludesStool, diaperIncludesWet, getChildAgeDays, getDiaperTypeLabel, getUrineColorLabel } from "../lib/diaper";
import { formatLocalDateKey, isOnLocalDay, timeSince } from "../lib/utils";
import { STOOL_COLORS, BITSS_TYPES } from "../lib/constants";
import { syncSmartRemindersForChild } from "../lib/notifications";
import diaperWetIcon from "../assets/svg-assets/icons/diaper-wet.svg";
import diaperDirtyIcon from "../assets/svg-assets/icons/diaper-dirty.svg";
import diaperMixedIcon from "../assets/svg-assets/icons/diaper-mixed.svg";
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { DiaperLogForm } from "../components/logging/DiaperLogForm";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { ScenicHero } from "../components/layout/ScenicHero";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { EmptyState, InsetPanel, PageBody } from "../components/ui/page-layout";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import {
  HomeToolGrowthIcon,
  HomeToolHistoryIcon,
  HomeToolMilestonesIcon,
} from "../components/ui/icons";
import {
  TrackerMetricPanel,
  TrackerMetricRing,
} from "../components/tracking/TrackerPrimitives";
import type { DiaperEntry, DiaperLogDraft } from "../lib/types";

interface Prediction {
  title: string;
  detail: string;
}

interface RingDisplay {
  value: string;
  unit: string;
  label: string;
  gradient: string;
}

function getDayKey(date: Date = new Date()): string {
  return formatLocalDateKey(date);
}

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

function getRelevantLogs(logs: DiaperEntry[], type: "wet" | "dirty") {
  return logs.filter((log) => type === "wet"
    ? diaperIncludesWet(log.diaper_type)
    : diaperIncludesStool(log.diaper_type));
}

function formatRange(hours: number[]) {
  const [start, end] = hours;
  if (end < 24) return `${Math.round(start)}-${Math.round(end)}h`;
  return `${(start / 24).toFixed(1)}-${(end / 24).toFixed(1)}d`;
}

function getPrediction(logs: DiaperEntry[], dateOfBirth: string, type: "wet" | "dirty"): Prediction {
  const relevant = getRelevantLogs(logs, type).slice(0, 8);
  const ageDays = getChildAgeDays(dateOfBirth);
  const baseline = type === "wet"
    ? ageDays < 14 ? [2, 4] : ageDays < 180 ? [2, 5] : ageDays < 365 ? [3, 6] : [4, 8]
    : ageDays < 14 ? [4, 12] : ageDays < 56 ? [4, 18] : ageDays < 180 ? [8, 48] : ageDays < 365 ? [12, 36] : [18, 48];

  if (relevant.length < 2) {
    return {
      title: type === "wet" ? "Wet rhythm baseline" : "Dirty rhythm baseline",
      detail: `Expect a usual range around ${formatRange(baseline)} until more logs personalise it.`,
    };
  }

  const intervals: number[] = [];
  for (let index = 0; index < relevant.length - 1; index += 1) {
    const current = new Date(relevant[index].logged_at).getTime();
    const next = new Date(relevant[index + 1].logged_at).getTime();
    const intervalHours = (current - next) / 3600000;
    if (intervalHours > 0 && intervalHours < 72) {
      intervals.push(intervalHours);
    }
  }

  if (intervals.length === 0) {
    return {
      title: type === "wet" ? "Wet rhythm baseline" : "Dirty rhythm baseline",
      detail: `Expect a usual range around ${formatRange(baseline)} until the pattern settles.`,
    };
  }

  const averageHours = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const earliest = Math.max(1, averageHours * 0.7);
  const latest = averageHours * 1.3;

  return {
    title: type === "wet" ? "Next wet diaper" : "Next dirty diaper",
    detail: `Recent logs suggest roughly every ${Math.round(averageHours)}h, usually landing in a ${formatRange([earliest, latest])} window.`,
  };
}

function getHydrationStatus(logs: DiaperEntry[], symptomType?: string) {
  const wetLogs = getRelevantLogs(logs, "wet");
  const lastWet = wetLogs[0] ?? null;
  const todayWetCount = wetLogs.filter((log) => isOnLocalDay(log.logged_at, getDayKey())).length;
  const recentDarkUrine = wetLogs.some((log) => log.urine_color === "dark" && Date.now() - new Date(log.logged_at).getTime() < 24 * 3600000);
  const hoursSinceWet = lastWet ? (Date.now() - new Date(lastWet.logged_at).getTime()) / 3600000 : Number.POSITIVE_INFINITY;

  if (symptomType === "dehydration_concern" || recentDarkUrine || hoursSinceWet >= 8) {
    return {
      tone: "cta" as const,
      title: "Hydration needs a check",
      description: "Wet output is light, late, or darker than usual. Recheck feeding and hydration context.",
    };
  }

  if (todayWetCount < 4 || hoursSinceWet >= 5) {
    return {
      tone: "info" as const,
      title: "Watch wet output",
      description: "Keep logging wet diapers so hydration changes are easier to spot early.",
    };
  }

  return {
    tone: "healthy" as const,
    title: "Wet output looks steady",
    description: "Recent wet diapers suggest hydration is staying in a normal-looking rhythm.",
  };
}

function getPredictionRingDisplay(prediction: Prediction): RingDisplay {
  const match = prediction.detail.match(/every (\d+)h/);
  const hours = match?.[1] ?? "--";

  return {
    value: hours,
    unit: "hrs",
    label: "Typical gap",
    gradient: "conic-gradient(from 210deg, var(--color-cta) 0deg, var(--color-gold) 170deg, var(--color-apricot) 360deg)",
  };
}

function getHydrationRingDisplay(status: ReturnType<typeof getHydrationStatus>, todayWetCount: number): RingDisplay {
  return {
    value: `${todayWetCount}`,
    unit: "today",
    label: status.tone === "cta" ? "Needs watch" : status.tone === "info" ? "Keep logging" : "Hydration",
    gradient: status.tone === "cta"
      ? "conic-gradient(from 210deg, #f59b7a 0deg, #d86a50 200deg, #f0c6b6 360deg)"
      : status.tone === "info"
        ? "conic-gradient(from 210deg, var(--color-info) 0deg, #8aa7ea 180deg, #c1d4ff 360deg)"
        : "conic-gradient(from 210deg, var(--color-healthy) 0deg, #9dcf9d 180deg, #d8edd6 360deg)",
  };
}

function getHydrationAccentColor(tone: ReturnType<typeof getHydrationStatus>["tone"]): string {
  if (tone === "cta") return "var(--color-alert)";
  if (tone === "info") return "var(--color-info)";
  return "var(--color-healthy)";
}

function getStoolShortLabel(stoolType?: number | null): string | null {
  if (!stoolType) return null;
  const stoolLabel = BITSS_TYPES.find((item) => item.type === stoolType)?.label;
  return stoolLabel?.split(" ")[0] ?? null;
}

function getDiaperSummary(log: DiaperEntry): string {
  const stoolLabel = getStoolShortLabel(log.stool_type);
  const urineLabel = getUrineColorLabel(log.urine_color);
  return [
    getDiaperTypeLabel(log.diaper_type),
    urineLabel,
    stoolLabel,
  ].filter(Boolean).join(" · ");
}

function getRecentHistoryDiaperIcon(diaperType: DiaperEntry["diaper_type"]): string {
  if (diaperType === "wet") return diaperWetIcon;
  if (diaperType === "mixed") return diaperMixedIcon;
  return diaperDirtyIcon;
}

function getDiaperPatternTone(diaperType: DiaperEntry["diaper_type"]) {
  if (diaperType === "wet") {
    return {
      bg: "color-mix(in srgb, var(--color-info) 32%, transparent)",
      border: "color-mix(in srgb, var(--color-info) 52%, transparent)",
      text: "var(--color-info)",
    };
  }
  if (diaperType === "mixed") {
    return {
      bg: "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 34%, transparent) 0%, color-mix(in srgb, #c08937 34%, transparent) 100%)",
      border: "color-mix(in srgb, #9f8dbd 48%, transparent)",
      text: "var(--color-primary)",
    };
  }
  return {
    bg: "color-mix(in srgb, #c08937 32%, transparent)",
    border: "color-mix(in srgb, #c08937 54%, transparent)",
    text: "#9a6b2f",
  };
}

export function Diaper() {
  const navigate = useNavigate();
  const { activeChild } = useChildContext();
  const { experience } = useEliminationPreference(activeChild);
  const { logs, lastDiaper, lastWetDiaper, lastDirtyDiaper, refresh } = useDiaperLogs(activeChild?.id ?? null);
  const { logs: symptomLogs } = useSymptoms(activeChild?.id ?? null);
  const { alerts, refresh: refreshAlerts, dismiss } = useAlerts(activeChild?.id ?? null);
  const { runChecks } = useAlertEngine();
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DiaperLogDraft> | null>(null);
  const [editingLog, setEditingLog] = useState<DiaperEntry | null>(null);
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [selectedPatternLogId, setSelectedPatternLogId] = useState<string | null>(null);
  const patternSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (experience.mode === "poop") {
      navigate("/poop", { replace: true });
    }
  }, [experience.mode, navigate]);

  const todayKey = getDayKey();
  const todayLogs = logs.filter((log) => isOnLocalDay(log.logged_at, todayKey));
  const todayWetCount = todayLogs.filter((log) => diaperIncludesWet(log.diaper_type)).length;
  const todayDirtyCount = todayLogs.filter((log) => diaperIncludesStool(log.diaper_type)).length;
  const todayMixedCount = todayLogs.filter((log) => log.diaper_type === "mixed").length;
  const hydrationStatus = getHydrationStatus(logs, symptomLogs[0]?.symptom_type);
  const recentLogs = useMemo(() => logs.slice(0, 3), [logs]);
  const patternLogs = useMemo(
    () => [...todayLogs].sort((left, right) => new Date(left.logged_at).getTime() - new Date(right.logged_at).getTime()),
    [todayLogs],
  );
  const selectedPatternLog = useMemo(
    () => patternLogs.find((log) => log.id === selectedPatternLogId) ?? null,
    [patternLogs, selectedPatternLogId],
  );

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

  if (!activeChild) return null;
  if (experience.mode === "poop") return null;
  const child = activeChild;
  const wetPrediction = getPrediction(logs, child.date_of_birth, "wet");
  const dirtyPrediction = getPrediction(logs, child.date_of_birth, "dirty");
  const predictionRing = getPredictionRingDisplay(wetPrediction);
  const hydrationRing = getHydrationRingDisplay(hydrationStatus, todayWetCount);

  const handleLogged = async () => {
    await refresh();
    await runChecks(child);
    await refreshAlerts();
    await syncSmartRemindersForChild(child);
  };

  return (
    <PageBody className="mt-0 space-y-0 px-0 py-0">
      <ScenicHero
        child={child}
        title="Diaper"
        description="Track wet, dirty, and mixed diapers fast while keeping stool detail when it matters."
        action={(
          <Button variant="cta" size="sm" onClick={() => setFormOpen(true)}>
            Add
          </Button>
        )}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        scene="diaper"
      />

      <div className="space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <Card className="-mt-32 mb-0 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <TimeSinceIndicator
                  timestamp={lastWetDiaper?.logged_at ?? null}
                  status={hydrationStatus.tone === "cta" ? "alert" : hydrationStatus.tone === "info" ? "caution" : "healthy"}
                />
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Last wet</p>
              </div>
              <TrackerMetricRing
                value={predictionRing.value}
                unit={predictionRing.unit}
                label={predictionRing.label}
                gradient={predictionRing.gradient}
              />
              <TrackerMetricRing
                value={hydrationRing.value}
                unit={hydrationRing.unit}
                label={hydrationRing.label}
                gradient={hydrationRing.gradient}
              />
            </div>
          </CardContent>
        </Card>

        <AlertBanner alerts={alerts} onDismiss={dismiss} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-5">
          <div className="min-w-0 space-y-4">
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Quick diaper start</p>
                    <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                      Start with the most likely diaper event, then fill in stool or urine detail only when it matters.
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setDraft({ diaper_type: "wet", urine_color: "normal" }); setFormOpen(true); }}
                      className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/15"
                    >
                      Wet diaper
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDraft({ diaper_type: "dirty" }); setFormOpen(true); }}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                    >
                      Dirty diaper
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDraft({ diaper_type: "mixed", urine_color: "normal" }); setFormOpen(true); }}
                      className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-white/70"
                    >
                      Mixed diaper
                    </button>
                  </div>
                </div>

                {lastDiaper && (
                  <p className="mt-3 text-[12px] text-[var(--color-text-soft)]">
                    Last logged: {getDiaperTypeLabel(lastDiaper.diaper_type)}
                    {lastDiaper.urine_color ? ` · ${getUrineColorLabel(lastDiaper.urine_color)}` : ""}
                    {getStoolShortLabel(lastDiaper.stool_type) ? ` · ${getStoolShortLabel(lastDiaper.stool_type)}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="min-w-0 space-y-4">
            <Card className="relative overflow-hidden">
              <span
                aria-hidden="true"
                className="absolute bottom-1.5 left-0 top-1.5 w-1.5 rounded-r-full"
                style={{ backgroundColor: getHydrationAccentColor(hydrationStatus.tone) }}
              />
              <CardContent className="overflow-hidden py-3.5 pl-7 pr-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current diaper status</p>
                    <p
                      className="mt-1 text-[0.95rem] font-semibold"
                      style={{ color: getHydrationAccentColor(hydrationStatus.tone) }}
                    >
                      {hydrationStatus.title}
                    </p>
                    <p className="mt-1 max-w-[34ch] text-[0.92rem] leading-snug text-[var(--color-text-secondary)]">{hydrationStatus.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${hydrationStatus.tone === "cta"
                      ? "bg-[var(--color-alert-bg)] text-[var(--color-alert)]"
                      : hydrationStatus.tone === "info"
                        ? "bg-[var(--color-info-bg)] text-[var(--color-info)]"
                        : "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]"
                      }`}
                  >
                    {hydrationStatus.tone === "cta" ? "Watch" : hydrationStatus.tone === "info" ? "Monitor" : "Stable"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusExpanded((current) => !current)}
                  className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--color-text-secondary)] transition-opacity hover:opacity-75"
                  aria-expanded={statusExpanded}
                >
                  {statusExpanded ? "See less" : "See more"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-4 w-4 transition-transform ${statusExpanded ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.137l3.71-3.907a.75.75 0 1 1 1.08 1.04l-4.25 4.474a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                <AnimatePresence initial={false}>
                  {statusExpanded && (
                    <motion.div
                      key="status-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={{ y: -6 }}
                        animate={{ y: 0 }}
                        exit={{ y: -6 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="pt-2 pr-0.5"
                      >
                        <div className="grid grid-cols-2 gap-2.5">
                          <TrackerMetricPanel
                            eyebrow="Today output"
                            value={`${todayWetCount}/${todayDirtyCount}`}
                            description={`${todayWetCount} wet and ${todayDirtyCount} dirty so far`}
                            tone="healthy"
                          />
                          <TrackerMetricPanel
                            eyebrow="Mixed diapers"
                            value={`${todayMixedCount}`}
                            description="Counted in both wet and dirty totals"
                            tone="info"
                          />
                          <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely wet diaper</p>
                                <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{wetPrediction.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{wetPrediction.detail}</p>
                              </div>
                              <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                                hydration
                              </span>
                            </div>
                          </InsetPanel>
                          <InsetPanel className="col-span-2 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Dirty diaper rhythm</p>
                            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{dirtyPrediction.detail}</p>
                            {lastDirtyDiaper && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                                  Last dirty: {timeSince(lastDirtyDiaper.logged_at)}
                                </span>
                                {lastDirtyDiaper.stool_type && (
                                <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                                    {getStoolShortLabel(lastDirtyDiaper.stool_type)}
                                </span>
                              )}
                                {lastDirtyDiaper.color && (
                                  <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                                    {STOOL_COLORS.find((item) => item.value === lastDirtyDiaper.color)?.label ?? lastDirtyDiaper.color}
                                  </span>
                                )}
                              </div>
                            )}
                          </InsetPanel>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {logs.length === 0 ? (
              <EmptyState
                icon={<span className="text-2xl text-[var(--color-primary)]">+</span>}
                title="Start the diaper page with the first log"
                description="Once wet, dirty, or mixed diapers are logged, this page can show hydration rhythm and diaper summaries."
                action={<Button variant="primary" onClick={() => setFormOpen(true)}>Add first diaper log</Button>}
              />
            ) : (
              <div className="space-y-4">
                <section className="px-1" ref={patternSectionRef}>
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
                    {recentLogs.map((log, index) => {
                      const tint = log.diaper_type === "wet"
                        ? "color-mix(in srgb, var(--color-info) 28%, transparent)"
                        : log.diaper_type === "mixed"
                          ? "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 30%, transparent) 0%, color-mix(in srgb, #c08937 30%, transparent) 100%)"
                          : "color-mix(in srgb, #c08937 28%, transparent)";

                      return (
                        <button
                          key={log.id}
                          type="button"
                          onClick={() => setEditingLog(log)}
                          className="flex w-full items-center gap-2.5 text-left"
                        >
                          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                            {index < recentLogs.length - 1 && (
                              <span
                                className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                                style={{ backgroundColor: "var(--color-border)" }}
                              />
                            )}
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-full"
                              style={log.diaper_type === "mixed" ? { backgroundImage: tint } : { backgroundColor: tint }}
                            >
                              <img
                                src={getRecentHistoryDiaperIcon(log.diaper_type)}
                                alt=""
                                aria-hidden="true"
                                className="h-5 w-5 object-contain"
                              />
                            </span>
                          </div>
                          <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                            <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                            {getDiaperSummary(log)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="px-1">
                  <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.92rem] font-semibold text-[var(--color-text)]">24-hour pattern</p>
                      </div>
                    </div>

                    <div className="mt-2.5 overflow-x-auto pb-1">
                      <div className="w-[520px] min-w-full">
                        <div className="space-y-2">
                          <div className="relative h-[92px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-2.5 py-2.5">
                            {patternLogs.length === 0 ? (
                              <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border)] text-[0.86rem] text-[var(--color-text-soft)]">
                                No data yet
                              </div>
                            ) : (
                              <>
                                <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-24 gap-1.5">
                                  {Array.from({ length: 24 }, (_, hour) => (
                                    <div key={hour} className="h-[64px] rounded-[8px] bg-[var(--color-bg-elevated)]/32" />
                                  ))}
                                </div>
                                <div className="absolute inset-x-2.5 top-[14px] space-y-[8px]">
                                  {(["wet", "dirty", "mixed"] as const).map((type) => (
                                    <div key={type} className="relative h-4.5">
                                      {patternLogs
                                        .filter((log) => log.diaper_type === type)
                                        .map((log) => {
                                          const date = new Date(log.logged_at);
                                          const left = ((date.getHours() + date.getMinutes() / 60) / 24) * 100;
                                          const tone = getDiaperPatternTone(type);
                                          return (
                                            <button
                                              type="button"
                                              key={log.id}
                                              aria-label={`${getDiaperTypeLabel(log.diaper_type)} at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                                              className="absolute top-0 h-4.5 -translate-x-1/2 rounded-[6px] border shadow-[var(--shadow-soft)]"
                                              onClick={() => setSelectedPatternLogId((current) => current === log.id ? null : log.id)}
                                              style={{
                                                left: `${left}%`,
                                                width: log.diaper_type === "mixed" ? "28px" : "22px",
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
                                      width: "100px",
                                      maxWidth: "100px",
                                    }}
                                  >
                                    <p className="text-[0.72rem] font-semibold text-[var(--color-text)]">
                                      {getDiaperTypeLabel(selectedPatternLog.diaper_type)}
                                    </p>
                                    <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-secondary)]">
                                      {new Date(selectedPatternLog.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                    </p>
                                    <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)]">
                                      {selectedPatternLog.diaper_type === "wet"
                                        ? getUrineColorLabel(selectedPatternLog.urine_color)
                                        : selectedPatternLog.diaper_type === "mixed"
                                          ? [getUrineColorLabel(selectedPatternLog.urine_color), getStoolShortLabel(selectedPatternLog.stool_type)].filter(Boolean).join(" • ")
                                          : getStoolShortLabel(selectedPatternLog.stool_type) ?? "Logged"}
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
                      {(["wet", "dirty", "mixed"] as const).map((type) => {
                        const tone = getDiaperPatternTone(type);
                        return (
                          <span
                            key={type}
                            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.75 text-[10px] font-medium"
                            style={{ borderColor: tone.border, color: tone.text, background: tone.bg }}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: tone.bg }} />
                            {getDiaperTypeLabel(type)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <div className="px-1">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Related</p>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <Link
                        to="/dashboard"
                        className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                        style={{ background: "var(--color-home-tool-growth)" }}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                          <HomeToolGrowthIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[0.72rem] font-semibold leading-tight">Trend</span>
                      </Link>
                      <Link
                        to="/history"
                        className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                        style={{ background: "var(--color-home-tool-history)" }}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                          <HomeToolHistoryIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[0.72rem] font-semibold leading-tight">History</span>
                      </Link>
                      <Link
                        to="/guidance"
                        className="flex min-h-[86px] flex-col items-start justify-between rounded-[14px] px-2.5 py-2.5 text-left text-white shadow-[var(--shadow-medium)] transition-transform hover:-translate-y-0.5"
                        style={{ background: "var(--color-home-tool-milestone)" }}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/18">
                          <HomeToolMilestonesIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[0.72rem] font-semibold leading-tight">Guidance</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DiaperLogForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setDraft(null);
          }}
          childId={child.id}
          onLogged={handleLogged}
          initialDraft={draft}
        />

        {editingLog && (
          <EditDiaperSheet
            key={editingLog.id}
            entry={editingLog}
            open={!!editingLog}
            onClose={() => setEditingLog(null)}
            onSaved={() => { setEditingLog(null); void handleLogged(); }}
            onDeleted={() => { setEditingLog(null); void handleLogged(); }}
          />
        )}
      </div>
    </PageBody>
  );
}
