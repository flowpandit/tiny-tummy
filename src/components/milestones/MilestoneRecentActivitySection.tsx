import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/page-layout";
import { getMilestoneActivityNote, getMilestoneBadgeViewModel, getMilestoneEmptyExamples, formatMilestoneStamp } from "../../lib/milestone-view-model";
import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import { timeSince } from "../../lib/utils";
import type { MilestoneEntry } from "../../lib/types";

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

function ActivityItem({
  entry,
  isLast,
}: {
  entry: MilestoneEntry;
  isLast: boolean;
}) {
  const badge = getMilestoneBadgeViewModel(entry);

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
          {getMilestoneActivityNote(entry)}
        </p>
      </article>
    </div>
  );
}

export function MilestoneRecentActivitySection({
  logs,
  isLoading,
  onAddMilestone,
}: {
  logs: MilestoneEntry[];
  isLoading: boolean;
  onAddMilestone: () => void;
}) {
  const latestMilestone = logs[0] ?? null;

  return (
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
              <Button type="button" variant="secondary" size="md" className="gap-2" onClick={onAddMilestone}>
                <PlusGlyph />
                Add first milestone
              </Button>
              <div className="mx-auto max-w-[32ch] rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-4 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
                  Useful examples
                </p>
                <div className="mt-3 space-y-2">
                  {getMilestoneEmptyExamples().map((example) => (
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
  );
}
