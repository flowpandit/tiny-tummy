import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import { formatMilestoneStamp } from "../../lib/milestone-view-model";
import type { MilestoneEntry, MilestoneType } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

const quickActions: Array<{
  type: MilestoneType;
  label: string;
  icon: string;
  surface: string;
  color: string;
}> = [
  {
    type: "started_solids",
    label: "Solids",
    icon: "S",
    surface: "rgba(235, 249, 236, 0.96)",
    color: "#24a767",
  },
  {
    type: "teething",
    label: "Teething",
    icon: "T",
    surface: "rgba(255, 239, 228, 0.98)",
    color: "#c3753d",
  },
  {
    type: "illness",
    label: "Illness",
    icon: "I",
    surface: "rgba(255, 232, 229, 0.92)",
    color: "#c35f52",
  },
];

export function MilestoneQuickLogCard({
  latestMilestone,
  onAddMilestone,
}: {
  latestMilestone: MilestoneEntry | null;
  onAddMilestone: (type?: MilestoneType) => void;
}) {
  return (
    <Card
      className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              Quick log
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              Save the context change while it is still fresh.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddMilestone()}
            className="shrink-0 rounded-full border border-[var(--color-home-card-border)] bg-[var(--color-tracker-pill-surface)] px-3 py-1.5 text-[0.68rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-tracker-pill-surface-hover)] md:text-[0.74rem]"
          >
            More
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5 md:gap-3.5">
          {quickActions.map((action) => (
            <button
              key={action.type}
              type="button"
              onClick={() => onAddMilestone(action.type)}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-tile-surface)] px-2 py-2 text-[0.78rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-tracker-tile)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-tracker-tile-surface-hover)] active:translate-y-0 md:min-h-[82px] md:rounded-[18px] md:text-[0.88rem]"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[0.82rem] font-semibold md:h-9 md:w-9"
                style={{ background: action.surface, color: action.color }}
              >
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-3 text-[0.68rem] leading-snug text-[var(--color-text-soft)] md:text-[0.74rem]">
          {latestMilestone ? (
            <p>
              Last logged: {getMilestoneTypeLabel(latestMilestone.milestone_type)} · {formatMilestoneStamp(latestMilestone.logged_at)}
            </p>
          ) : (
            <p>No milestone context logged yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
