import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import { formatMilestoneStamp } from "../../lib/milestone-view-model";
import type { MilestoneEntry } from "../../lib/types";
import { Card, CardContent } from "../ui/card";
import { HomeToolMilestonesIcon } from "../ui/icons";

function InsightArt() {
  return (
    <div className="pointer-events-none absolute bottom-5 right-5 hidden h-20 w-20 items-center justify-center rounded-full bg-[var(--color-tracker-art-surface)] text-[#36a868] md:flex" aria-hidden="true">
      <HomeToolMilestonesIcon className="h-11 w-11" />
    </div>
  );
}

function ContextTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-next-neutral-surface)] px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] md:text-[0.7rem]">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
        {value}
      </p>
      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
        {detail}
      </p>
    </div>
  );
}

export function MilestoneInsightCard({
  childName,
  journeyCopy,
  latestMilestone,
  lastThirtyDays,
  totalMilestones,
}: {
  childName: string;
  journeyCopy: string;
  latestMilestone: MilestoneEntry | null;
  lastThirtyDays: number;
  totalMilestones: number;
}) {
  const latestLabel = latestMilestone ? getMilestoneTypeLabel(latestMilestone.milestone_type) : "No context yet";
  const latestDetail = latestMilestone ? formatMilestoneStamp(latestMilestone.logged_at) : "Add one when a routine shift might explain changes.";
  const paceLabel = lastThirtyDays === 0 ? "Quiet month" : `${lastThirtyDays} recent`;
  const paceDetail = totalMilestones === 0
    ? "Milestones are optional context, not daily tasks."
    : `${totalMilestones} saved across ${childName}'s record.`;

  return (
    <Card
      className="relative h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--gradient-tracker-insight-growth)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <InsightArt />
      <CardContent className="relative overflow-hidden p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 md:max-w-[calc(100%_-_96px)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#36a868] md:text-[0.74rem]">
              Context insight
            </p>
            <p className="mt-3 text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.12rem]">
              {latestMilestone ? `${childName}'s newest context is on file` : "Milestones are ready when context changes"}
            </p>
            <p className="mt-2 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              {journeyCopy}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--color-healthy-bg)] px-2.5 py-1 text-[0.66rem] font-semibold text-[var(--color-healthy)] md:px-3 md:text-[0.72rem]">
            {latestMilestone ? "On file" : "Start"}
          </span>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-2.5 md:mt-5 md:p-3">
          <p className="px-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.72rem]">
            Pattern context
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ContextTile label="Latest" value={latestLabel} detail={latestDetail} />
            <ContextTile label="Recent pace" value={paceLabel} detail={paceDetail} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
