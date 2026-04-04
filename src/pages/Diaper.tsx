import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { AlertBanner } from "../components/dashboard/AlertBanner";
import { DiaperLogForm } from "../components/logging/DiaperLogForm";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { ScenicHero } from "../components/layout/ScenicHero";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { EmptyState, InsetPanel, PageBody, SectionHeading } from "../components/ui/page-layout";
import { DiscoveryLinks } from "../components/discovery/DiscoveryLinks";
import { TimeSinceIndicator } from "../components/home/TimeSinceIndicator";
import {
  TrackerEntryRow,
  TrackerEntryTable,
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
  const recentLogs = useMemo(() => logs.slice(0, 10), [logs]);

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
        <Card className="-mt-32 relative z-10 border-transparent bg-transparent shadow-none backdrop-blur-0">
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
        <div className="space-y-4">
          <Card>
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
                  {lastDiaper.stool_type ? ` · Type ${lastDiaper.stool_type}` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <DiscoveryLinks
            eyebrow="Adjacent views"
            title="Keep stool-focused work close by"
            description="Diaper tracking handles the young-baby workflow, while the poop page stays available when you want the full bowel-specific view."
            items={[
              {
                to: "/poop",
                title: "Poop page",
                description: "Open the bowel-first analysis surface directly.",
              },
              {
                to: "/history",
                title: "History",
                description: "Review the wider timeline across logs.",
              },
              {
                to: "/feed",
                title: "Feed",
                description: "Compare feeding timing with wet and dirty output.",
                tone: "info",
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current diaper status</p>
                  <p className="mt-1.5 text-[1.4rem] font-semibold tracking-[-0.035em] text-[var(--color-text)]">
                    {hydrationStatus.title}
                  </p>
                  <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{hydrationStatus.description}</p>
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

              <div className="mt-3 grid grid-cols-2 gap-2.5">
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
                          Type {lastDirtyDiaper.stool_type}
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
            </CardContent>
          </Card>

          {recentLogs.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl text-[var(--color-primary)]">+</span>}
              title="Start the diaper page with the first log"
              description="Once wet, dirty, or mixed diapers are logged, this page can show hydration rhythm and diaper summaries."
              action={<Button variant="primary" onClick={() => setFormOpen(true)}>Add first diaper log</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <SectionHeading
                    title="Recent diaper entries"
                    description="Every recent diaper log in one list, with quick editing when details need correcting."
                  />
                </div>
              </CardHeader>
              <CardContent>
                <TrackerEntryTable leftHeader="When" mainHeader="Details">
                  {recentLogs.map((log) => {
                    const colorHex = log.color ? STOOL_COLORS.find((item) => item.value === log.color)?.hex : undefined;
                    const stoolLabel = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type)?.label : null;
                    const urineLabel = getUrineColorLabel(log.urine_color);
                    const summary = [
                      getDiaperTypeLabel(log.diaper_type),
                      urineLabel,
                      stoolLabel ? `Type ${log.stool_type} ${stoolLabel}` : null,
                      log.color ? STOOL_COLORS.find((item) => item.value === log.color)?.label ?? log.color : null,
                    ].filter(Boolean).join(" · ");

                    return (
                      <TrackerEntryRow key={log.id} onClick={() => setEditingLog(log)}>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">{timeSince(log.logged_at)}</p>
                          <p className="mt-1 text-xs text-[var(--color-text-soft)]">{new Date(log.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: colorHex ?? (log.diaper_type === "wet" ? "#d6b74f" : "#c08937") }}
                            />
                            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{summary}</p>
                          </div>
                          <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{log.notes || "No extra notes"}</p>
                        </div>
                      </TrackerEntryRow>
                    );
                  })}
                </TrackerEntryTable>
              </CardContent>
            </Card>
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
