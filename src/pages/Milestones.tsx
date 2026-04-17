import { useMemo, useState } from "react";
import { useActiveChild } from "../contexts/ChildContext";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import {
  getMilestoneTypeDescription,
  getMilestoneTypeLabel,
} from "../lib/milestone-constants";
import { cn } from "../lib/cn";
import { formatDate, timeSince } from "../lib/utils";
import type { MilestoneEntry } from "../lib/types";
import { Avatar } from "../components/child/Avatar";
import { MilestoneLogSheet } from "../components/milestones/MilestoneLogSheet";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { EmptyState, PageBody } from "../components/ui/page-layout";

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MilestoneGlyph({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 14.75 3.1-3.1 2.45 2.45 5.2-6.1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18h15" />
    </svg>
  );
}

function getMilestoneBadge(entry: MilestoneEntry): {
  label: string;
  variant: "healthy" | "caution" | "alert" | "info" | "default";
  dotColor: string;
} {
  switch (entry.milestone_type) {
    case "started_solids":
      return { label: "Nutrition", variant: "healthy", dotColor: "var(--color-healthy)" };
    case "medication_started":
      return { label: "Health", variant: "caution", dotColor: "var(--color-caution)" };
    case "allergy_concern":
      return { label: "Concern", variant: "alert", dotColor: "var(--color-alert)" };
    case "illness":
      return { label: "Health", variant: "alert", dotColor: "var(--color-alert)" };
    case "travel_or_daycare_change":
      return { label: "Routine", variant: "info", dotColor: "var(--color-info)" };
    case "toilet_training_interest":
      return { label: "Development", variant: "info", dotColor: "var(--color-info)" };
    case "teething":
      return { label: "Development", variant: "default", dotColor: "var(--color-cta)" };
    default:
      return { label: "Context", variant: "default", dotColor: "var(--color-cta)" };
  }
}

function formatMilestoneStamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatJourneyCopy(logs: MilestoneEntry[]): string {
  if (logs.length === 0) {
    return "A calm record of the changes that help feeding, sleep, and bowel patterns make more sense later.";
  }

  const latest = logs[0];
  const latestLabel = getMilestoneTypeLabel(latest.milestone_type).toLowerCase();
  return `Keeping track of moments like ${latestLabel} helps later changes feel less confusing.`;
}

function getEmptyExamples(): string[] {
  return [
    "Started solids and poops began changing",
    "Medication was introduced after a pediatric visit",
    "Illness or travel shifted sleep and feeding",
  ];
}

function MetricCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 py-4 shadow-[var(--shadow-card)]"
      style={{
        backgroundImage: `radial-gradient(circle at 68% 22%, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 48%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(from 180deg, ${accent} 0 138deg, color-mix(in srgb, ${accent} 12%, transparent) 138deg 360deg)`,
          }}
        >
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            {value}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
        {label}
      </p>
    </div>
  );
}

function ActivityItem({
  entry,
  isLast,
}: {
  entry: MilestoneEntry;
  isLast: boolean;
}) {
  const badge = getMilestoneBadge(entry);
  const note = entry.notes?.trim() || getMilestoneTypeDescription(entry.milestone_type);

  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-4">
      <div className="flex flex-col items-center">
        <span
          className="mt-5 h-3 w-3 rounded-full"
          style={{
            backgroundColor: badge.dotColor,
            boxShadow: `0 0 0 4px color-mix(in srgb, ${badge.dotColor} 14%, transparent)`,
          }}
        />
        {!isLast && (
          <span
            className="mt-2 h-full min-h-12 w-px"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-border-strong) 72%, transparent)" }}
          />
        )}
      </div>

      <article className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">
              {getMilestoneTypeLabel(entry.milestone_type)}
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {formatMilestoneStamp(entry.logged_at)}
            </p>
          </div>
          <Badge variant={badge.variant} className="shrink-0">
            {badge.label}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {note}
        </p>
      </article>
    </div>
  );
}

export function Milestones() {
  const activeChild = useActiveChild();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { logs, isLoading, refresh } = useMilestoneLogs(activeChild?.id ?? null);

  const totalMilestones = logs.length;
  const lastThirtyDays = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);
    return logs.filter((entry) => new Date(entry.logged_at).getTime() >= threshold.getTime()).length;
  }, [logs]);
  const latestMilestone = logs[0] ?? null;

  if (!activeChild) return null;

  return (
    <PageBody className="mt-0 space-y-5 px-4 py-5 md:px-6 lg:px-8">
      <section className="space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-[34px] border border-[var(--color-border)] px-6 pb-7 pt-6 text-center shadow-[var(--shadow-lg)]",
            "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-surface-strong)_96%,transparent)_0%,color-mix(in_srgb,var(--color-bg-elevated)_76%,transparent)_100%)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-cta) 20%, transparent) 0%, transparent 58%)",
            }}
          />
          <div className="relative mx-auto flex w-fit flex-col items-center">
            <div className="rounded-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_68%,white)_0%,color-mix(in_srgb,var(--color-cta)_62%,white)_100%)] p-[3px] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
              <Avatar
                childId={activeChild.id}
                name={activeChild.name}
                color={activeChild.avatar_color}
                size="lg"
                className="h-20 w-20 border-2 border-white/70"
              />
            </div>
            <h1 className="mt-5 font-[var(--font-display)] text-[2.2rem] font-semibold tracking-[-0.04em] text-[var(--color-text)]">
              {activeChild.name}&apos;s Journey
            </h1>
            <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {formatJourneyCopy(logs)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard value={String(totalMilestones)} label="Total milestones" accent="var(--color-cta)" />
          <MetricCard value={String(lastThirtyDays)} label="Last 30 days" accent="var(--color-info)" />
        </div>

        <Button
          type="button"
          variant="cta"
          size="lg"
          className="w-full gap-2 text-[1.02rem] shadow-[var(--shadow-medium)]"
          onClick={() => setSheetOpen(true)}
        >
          <PlusGlyph />
          Add milestone
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
              Recent activity
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Changes worth remembering when a pattern shifts later.
            </p>
          </div>
          {latestMilestone && (
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
              {timeSince(latestMilestone.logged_at)}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[18px_minmax(0,1fr)] gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-5 h-3 w-3 animate-pulse rounded-full bg-[var(--color-border-strong)]" />
                  {index < 2 && <span className="mt-2 h-20 w-px bg-[var(--color-border)]" />}
                </div>
                <div className="h-32 animate-pulse rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-strong)]" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<MilestoneGlyph className="text-[var(--color-primary)]" />}
            title="No milestones yet"
            description="Use milestones for the bigger context changes that help explain what comes next."
            action={(
              <div className="space-y-4">
                <Button type="button" variant="secondary" size="md" className="gap-2" onClick={() => setSheetOpen(true)}>
                  <PlusGlyph />
                  Add first milestone
                </Button>
                <div className="mx-auto max-w-[32ch] rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
                    Useful examples
                  </p>
                  <div className="mt-3 space-y-2">
                    {getEmptyExamples().map((example) => (
                      <p key={example} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {example}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/42 px-5 py-8"
          />
        ) : (
          <div className="space-y-1">
            {logs.map((entry, index) => (
              <ActivityItem key={entry.id} entry={entry} isLast={index === logs.length - 1} />
            ))}
          </div>
        )}
      </section>

      <MilestoneLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childId={activeChild.id}
        onLogged={refresh}
      />
    </PageBody>
  );
}
