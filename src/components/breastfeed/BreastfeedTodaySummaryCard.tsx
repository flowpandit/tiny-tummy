import type { ReactNode } from "react";
import { breastfeedIcon } from "../../assets/icons";
import { formatBreastfeedingSummary } from "../../lib/breastfeeding";
import type { BreastSide } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

function BreastIcon({ mirrored = false, color = "#de5c9f" }: { mirrored?: boolean; color?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-5 w-5"
      style={{
        backgroundColor: color,
        transform: mirrored ? "scaleX(-1)" : undefined,
        WebkitMaskImage: `url(${breastfeedIcon})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${breastfeedIcon})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
      }}
    />
  );
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
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center text-center">
      <div className="flex min-w-0 items-center justify-center gap-1.5">
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

function formatSideValue(side: BreastSide | null) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "Either";
}

export function BreastfeedTodaySummaryCard({
  last24hLeftDuration,
  last24hRightDuration,
  last24hTotalDuration,
  suggestedStartSide,
}: {
  last24hLeftDuration: number;
  last24hRightDuration: number;
  last24hTotalDuration: number;
  suggestedStartSide: BreastSide | null;
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
            icon={<ClockIcon />}
            value={formatBreastfeedingSummary(last24hTotalDuration)}
            label="Total"
          />
          <SummaryStat
            icon={<BreastIcon color="#de5c9f" />}
            value={formatBreastfeedingSummary(last24hLeftDuration)}
            label="Left"
          />
          <SummaryStat
            icon={<BreastIcon mirrored color="#6f8df0" />}
            value={formatBreastfeedingSummary(last24hRightDuration)}
            label="Right"
          />
          <SummaryStat
            icon={<span className="text-[1.05rem] font-semibold leading-none text-[#7f6ff0]">N</span>}
            value={formatSideValue(suggestedStartSide)}
            label="Next"
          />
        </div>
      </CardContent>
    </Card>
  );
}
