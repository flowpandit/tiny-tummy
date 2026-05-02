import type { ReactNode } from "react";
import { BITSS_TYPES } from "../../lib/constants";
import type { BaselineComparison, DueRisk } from "../../lib/poop-insights";
import type { PoopEntry } from "../../lib/types";
import { Card, CardContent } from "../ui/card";
import { PoopPresetIcon } from "./PoopPresetIcon";

function ShieldIcon({ tone }: { tone: DueRisk["tone"] }) {
  const color = tone === "cta" ? "#c2534c" : tone === "info" ? "#c27a24" : "#1fa56a";

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color }} aria-hidden="true">
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

function ClockIcon({ tone }: { tone: BaselineComparison["tone"] }) {
  const color = tone === "cta" ? "#c2534c" : tone === "info" ? "#d18a2a" : "#13a970";

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" style={{ color }} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.8v4.6l3.2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getGapLabel(tone: BaselineComparison["tone"]) {
  if (tone === "cta") return "Check";
  if (tone === "info") return "Watch";
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
        <span className="max-w-full truncate text-[1.02rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[1.15rem]">
          {value}
        </span>
      </div>
      <p className="mt-1 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
        {label}
      </p>
    </div>
  );
}

export function PoopTodaySummaryCard({
  baselineComparison,
  dueRisk,
  lastRealPoop,
  todayPoopCount,
}: {
  baselineComparison: BaselineComparison;
  dueRisk: DueRisk;
  lastRealPoop: PoopEntry | null;
  todayPoopCount: number;
}) {
  const lastType = lastRealPoop?.stool_type ?? null;
  const lastTypeLabel = lastType
    ? BITSS_TYPES.find((item) => item.type === lastType)?.label ?? "Logged"
    : "No log";

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
            icon={<PoopPresetIcon draft={{ stool_type: lastType ?? 4, color: lastRealPoop?.color ?? "brown", size: lastRealPoop?.size ?? "medium" }} className="h-5 w-5" />}
            value={todayPoopCount}
            label="Poops"
          />
          <SummaryStat
            icon={<span className="text-[1.05rem] font-semibold leading-none text-[#a86235]">T</span>}
            value={lastTypeLabel}
            label="Last type"
          />
          <SummaryStat
            icon={<ClockIcon tone={baselineComparison.tone} />}
            value={getGapLabel(baselineComparison.tone)}
            label="Gap"
          />
          <SummaryStat
            icon={<ShieldIcon tone={dueRisk.tone} />}
            value={dueRisk.label}
            label="Risk"
          />
        </div>
      </CardContent>
    </Card>
  );
}
