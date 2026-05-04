import type { ReactNode } from "react";
import { diaperDirtyIcon, diaperMixedIcon, diaperWetIcon } from "../../assets/icons";
import type { HydrationStatus } from "../../lib/diaper-insights";
import { Card, CardContent } from "../ui/card";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#1fa56a]" aria-hidden="true">
      <path
        d="M12 3.8 18.4 6v5.2c0 4.1-2.6 7.7-6.4 9-3.8-1.3-6.4-4.9-6.4-9V6L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m8.9 12.1 2 2 4.2-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getHydrationSummaryLabel(tone: HydrationStatus["tone"]) {
  if (tone === "cta") return "Watch";
  if (tone === "info") return "Track";
  return "Good";
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
    <div className="flex min-w-0 flex-col items-center justify-center text-center">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className="text-[1.1rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[1.25rem]">
          {value}
        </span>
      </div>
      <p className="mt-1 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
        {label}
      </p>
    </div>
  );
}

export function DiaperTodaySummaryCard({
  dirtyCount,
  hydrationStatus,
  mixedCount,
  wetCount,
}: {
  dirtyCount: number;
  hydrationStatus: HydrationStatus;
  mixedCount: number;
  wetCount: number;
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
        <div className="mt-4 grid grid-cols-4 gap-1.5 md:mt-6 md:gap-3">
          <SummaryStat
            icon={<img src={diaperWetIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />}
            value={wetCount}
            label="Wet"
          />
          <SummaryStat
            icon={<img src={diaperDirtyIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />}
            value={dirtyCount}
            label="Dirty"
          />
          <SummaryStat
            icon={<img src={diaperMixedIcon} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />}
            value={mixedCount}
            label="Mixed"
          />
          <SummaryStat
            icon={<ShieldIcon />}
            value={getHydrationSummaryLabel(hydrationStatus.tone)}
            label="Hydration"
          />
        </div>
      </CardContent>
    </Card>
  );
}
