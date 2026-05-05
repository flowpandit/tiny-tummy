import { Button } from "../ui/button";
import type { ReactNode } from "react";
import {
  formatHandoffDateTime,
  formatHandoffTime,
  getHandoffSummaryCountsLabel,
  type HandoffDueItem,
  type HandoffEventSummary,
  type HandoffSummary,
  type HandoffTimelineItem,
  type HandoffWatchItem,
} from "../../lib/handoff-summary";

interface CaregiverHandoffPanelProps {
  summary: HandoffSummary;
  parentNote: string;
  canUseNativeShare: boolean;
  isCopying: boolean;
  isSharing: boolean;
  isGeneratingPdf: boolean;
  onParentNoteChange: (value: string) => void;
  onCopy: () => void;
  onShare: () => void;
  onGeneratePdf: () => void;
  onRefresh: () => void;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-h-[74px] rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3 md:min-h-[92px] md:px-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-[var(--color-text)] md:text-[1.75rem]">
        {value}
      </p>
    </div>
  );
}

function HandoffSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-5 first:pt-0">
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]">
        {title}
      </h2>
      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function EventRow({ label, event }: { label: string; event: HandoffEventSummary | null }) {
  return (
    <div className="flex min-h-[54px] items-start justify-between gap-3 border-b border-[var(--color-home-divider)] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[0.95rem] font-semibold text-[var(--color-text)]">{label}</p>
        <p className="mt-0.5 text-[0.82rem] leading-snug text-[var(--color-text-secondary)]">
          {event ? event.detail : "No log yet"}
        </p>
      </div>
      <p className="shrink-0 text-right text-[0.82rem] font-semibold text-[var(--color-text-soft)]">
        {event ? formatHandoffTime(event.occurredAt) : "-"}
      </p>
    </div>
  );
}

function DueRow({ label, item }: { label: string; item: HandoffDueItem }) {
  const detail = item.windowStart && item.windowEnd
    ? `${formatHandoffTime(item.windowStart)} to ${formatHandoffTime(item.windowEnd)}`
    : item.detail;

  return (
    <div className="rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3">
      <p className="text-[0.82rem] font-semibold text-[var(--color-text)]">{label}</p>
      <p className="mt-1 text-[0.95rem] font-semibold leading-snug text-[var(--color-text)]">{item.label}</p>
      <p className="mt-1 text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}

function WatchItemRow({ item }: { item: HandoffWatchItem }) {
  return (
    <li className="rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3">
      <p className="text-[0.9rem] font-semibold leading-snug text-[var(--color-text)]">{item.label}</p>
      {item.detail && (
        <p className="mt-1 text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">{item.detail}</p>
      )}
    </li>
  );
}

function TimelineRow({ item }: { item: HandoffTimelineItem }) {
  return (
    <li className="flex gap-3 border-b border-[var(--color-home-divider)] py-3 last:border-b-0">
      <p className="w-[76px] shrink-0 text-[0.82rem] font-semibold text-[var(--color-text-soft)]">
        {formatHandoffTime(item.occurredAt)}
      </p>
      <div className="min-w-0 flex-1">
        <p className="text-[0.94rem] font-semibold leading-snug text-[var(--color-text)]">{item.title}</p>
        <p className="mt-0.5 text-[0.82rem] leading-snug text-[var(--color-text-secondary)]">{item.detail}</p>
      </div>
    </li>
  );
}

export function CaregiverHandoffPanel({
  summary,
  parentNote,
  canUseNativeShare,
  isCopying,
  isSharing,
  isGeneratingPdf,
  onParentNoteChange,
  onCopy,
  onShare,
  onGeneratePdf,
  onRefresh,
}: CaregiverHandoffPanelProps) {
  const lastEvents = summary.lastEvents;

  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-[22px] border shadow-[var(--shadow-home-card)] md:rounded-[28px]"
        style={{
          background: "var(--color-home-card-surface)",
          borderColor: "var(--color-home-card-border)",
        }}
      >
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
                Caregiver handoff
              </p>
              <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--color-text)] md:text-[2.25rem]">
                {summary.child.name}
              </h1>
              <p className="mt-1 max-w-[48ch] text-[0.88rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.95rem]">
                {getHandoffSummaryCountsLabel(summary)}
              </p>
              <p className="mt-1 text-[0.78rem] text-[var(--color-text-soft)]">
                Generated {formatHandoffDateTime(summary.generatedAt)}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" className="self-start" onClick={onRefresh}>
              Refresh
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StatCell label="Poops" value={summary.todaySummary.poopCount} />
            <StatCell label="Wet" value={summary.todaySummary.wetDiaperCount} />
            <StatCell label="Feeds" value={summary.todaySummary.feedCount} />
            <StatCell label="Sleep" value={summary.todaySummary.sleepTotal} />
          </div>
        </div>

        <div className="border-t border-[var(--color-home-divider)] px-4 py-4 md:px-6 md:py-6">
          <HandoffSection title="Last important events">
            <div>
              <EventRow label="Last poop" event={lastEvents.lastPoop} />
              <EventRow label="Last wet diaper" event={lastEvents.lastWetDiaper} />
              <EventRow label="Last dirty diaper" event={lastEvents.lastDirtyDiaper} />
              <EventRow label="Last feed" event={lastEvents.lastFeed} />
              <EventRow label="Last sleep" event={lastEvents.lastSleep} />
              <EventRow label="Last symptom" event={lastEvents.lastSymptom} />
            </div>
          </HandoffSection>

          <HandoffSection title="Likely due next">
            <div className="grid gap-2 md:grid-cols-3">
              <DueRow label="Feed" item={summary.nextDue.nextFeed} />
              <DueRow label="Sleep" item={summary.nextDue.nextSleep} />
              <DueRow label="Diaper" item={summary.nextDue.nextDiaperCheck} />
            </div>
          </HandoffSection>

          <HandoffSection title="Watch items">
            {summary.watchItems.length > 0 ? (
              <ul className="grid gap-2">
                {summary.watchItems.map((item) => (
                  <WatchItemRow key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-4 text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
                No watch items logged for this window.
              </p>
            )}
          </HandoffSection>

          <HandoffSection title="What happened today">
            {summary.timeline.length > 0 ? (
              <ul>
                {summary.timeline.map((item) => (
                  <TimelineRow key={`${item.kind}-${item.occurredAt}-${item.title}`} item={item} />
                ))}
              </ul>
            ) : (
              <p className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-4 text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
                No events logged yet.
              </p>
            )}
          </HandoffSection>

          <HandoffSection title="Parent note">
            <textarea
              value={parentNote}
              onChange={(event) => onParentNoteChange(event.target.value)}
              rows={4}
              placeholder="Add anything the caregiver should know."
              className="min-h-[112px] w-full resize-y rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3 text-[0.92rem] leading-relaxed text-[var(--color-text)] outline-none transition-shadow placeholder:text-[var(--color-text-soft)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </HandoffSection>

          <div className="mt-5 rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-3 py-3 md:px-4">
            <p className="text-[0.8rem] leading-snug text-[var(--color-text-secondary)]">
              {summary.privacyNote}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button type="button" variant="cta" onClick={onShare} disabled={isSharing || isCopying || isGeneratingPdf}>
                {isSharing ? "Preparing..." : canUseNativeShare ? "Share" : "Share text"}
              </Button>
              <Button type="button" variant="secondary" onClick={onCopy} disabled={isCopying || isSharing || isGeneratingPdf}>
                {isCopying ? "Copying..." : "Copy text"}
              </Button>
              <Button type="button" variant="secondary" onClick={onGeneratePdf} disabled={isCopying || isSharing || isGeneratingPdf}>
                {isGeneratingPdf ? "Preparing PDF..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
