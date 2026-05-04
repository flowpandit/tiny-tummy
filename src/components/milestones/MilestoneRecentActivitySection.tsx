import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { EmptyState } from "../ui/page-layout";
import { getMilestoneActivityNote, getMilestoneBadgeViewModel, getMilestoneEmptyExamples, formatMilestoneStamp } from "../../lib/milestone-view-model";
import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import type { MilestoneEntry } from "../../lib/types";

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MilestoneGlyph({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 5.5 14.01 9.57l4.49.65-3.25 3.16.77 4.47L12 15.74 7.98 17.85l.77-4.47-3.25-3.16 4.49-.65L12 5.5Z" />
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
    <div className="relative flex w-full items-start gap-2.5 py-2 text-left md:gap-3">
      <div className="flex w-[74px] shrink-0 items-start gap-2 md:w-[92px]">
        <div className="relative mt-1 flex w-2.5 justify-center self-stretch">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: badge.dotColor }} />
          {!isLast && (
            <span className="absolute top-4 h-[54px] w-px bg-[var(--color-home-divider)]" aria-hidden="true" />
          )}
        </div>
        <p className="min-w-0 pt-0.5 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.76rem]">
          {formatMilestoneStamp(entry.logged_at)}
        </p>
      </div>

      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9"
        style={{
          background: `color-mix(in srgb, ${badge.dotColor} 14%, white)`,
          color: badge.dotColor,
        }}
      >
        <MilestoneGlyph className="h-4.5 w-4.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.86rem]">
            {getMilestoneTypeLabel(entry.milestone_type)}
          </p>
          <span className="shrink-0 rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-chip-surface)] px-2 py-0.5 text-[0.62rem] font-semibold text-[var(--color-tracker-chip-text)]">
            {badge.label}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.74rem]">
          {getMilestoneActivityNote(entry)}
        </p>
      </div>

      {!isLast && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[84px] bottom-0 h-px bg-[var(--color-home-divider)] md:inset-x-[108px]"
        />
      )}
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
  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
            Recent activity
          </p>
          <Link
            to="/history"
            className="text-[0.68rem] font-semibold text-[#7259f2] transition-opacity hover:opacity-75 md:text-[0.74rem]"
          >
            See all
          </Link>
        </div>

        <div className="mt-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2.5 py-2 md:gap-3">
                  <div className="h-8 w-[74px] animate-pulse rounded-[12px] bg-[var(--color-home-empty-surface)] md:w-[92px]" />
                  <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-home-empty-surface)] md:h-9 md:w-9" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-36 animate-pulse rounded-full bg-[var(--color-home-empty-surface)]" />
                    <div className="h-3 w-52 max-w-full animate-pulse rounded-full bg-[var(--color-home-empty-surface)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<MilestoneGlyph className="h-7 w-7 text-[var(--color-primary)]" />}
              title="No milestones yet"
              description="Use milestones for context changes that help explain what comes next."
              action={(
                <div className="space-y-4">
                  <Button type="button" variant="secondary" size="md" className="gap-2" onClick={onAddMilestone}>
                    <PlusGlyph />
                    Add first milestone
                  </Button>
                  <div className="mx-auto max-w-[32ch] rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-home-empty-surface)] px-4 py-4 text-left">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)]">
                      Useful examples
                    </p>
                    <div className="mt-3 space-y-2">
                      {getMilestoneEmptyExamples().map((example) => (
                        <p key={example} className="text-[0.74rem] leading-snug text-[var(--color-text-secondary)]">
                          {example}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-5"
            />
          ) : (
            logs.map((entry, index) => (
              <ActivityItem key={entry.id} entry={entry} isLast={index === logs.length - 1} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
