import type { ReactNode } from "react";
import type { FeedRisk } from "../../lib/feed-insights";
import { Card, CardContent } from "../ui/card";
import { HomeActionBottleIcon, MealIcon } from "../ui/icons";

interface TodayIntakeDisplay {
  value: string;
  unit: string;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#f36d24]" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.8v4.6l3.2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full flex-col items-center justify-center text-center">
      <div className="flex w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 max-w-full truncate text-[0.98rem] font-semibold leading-none tracking-[-0.035em] text-[var(--color-text)] md:text-[1.08rem]">
          {value}
        </span>
      </div>
      <p className="mt-1 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
        {label}
      </p>
    </div>
  );
}

function getTimingLabel(dueRisk: FeedRisk) {
  if (dueRisk.label === "High") return "Watch";
  if (dueRisk.label === "Medium") return "Soon";
  return "Low";
}

function getShortFeedLabel(label: string) {
  if (label === "No mix yet") return "None";
  if (label === "Breast milk") return "Breast";
  if (label === "Breastfeed") return "Breast";
  if (label === "Bottle feed") return "Bottle";
  if (label === "Formula feed") return "Formula";
  return label;
}

function formatIntakeValue(display: TodayIntakeDisplay) {
  if (display.unit.endsWith(" today")) {
    return `${display.value} ${display.unit.replace(" today", "")}`;
  }

  return display.value;
}

export function FeedTodaySummaryCard({
  dueRisk,
  todayFeedCount,
  todayIntake,
  todayTopFeedLabel,
}: {
  dueRisk: FeedRisk;
  todayFeedCount: number;
  todayIntake: TodayIntakeDisplay;
  todayTopFeedLabel: string;
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
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
          Today&apos;s summary
        </p>
        <div className="mt-4 grid grid-cols-4 gap-1 md:mt-6 md:gap-2">
          <SummaryStat
            icon={<HomeActionBottleIcon className="h-5 w-5 text-[#13a970]" />}
            value={todayFeedCount}
            label="Feeds"
          />
          <SummaryStat
            icon={<HomeActionBottleIcon className="h-5 w-5 text-[#6f8df0]" />}
            value={formatIntakeValue(todayIntake)}
            label="Intake"
          />
          <SummaryStat
            icon={<MealIcon className="h-5 w-5 text-[#a86235]" />}
            value={getShortFeedLabel(todayTopFeedLabel)}
            label="Top type"
          />
          <SummaryStat
            icon={<ClockIcon />}
            value={getTimingLabel(dueRisk)}
            label="Timing"
          />
        </div>
      </CardContent>
    </Card>
  );
}
