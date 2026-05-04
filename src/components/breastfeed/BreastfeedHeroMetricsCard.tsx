import type { ReactNode } from "react";
import { breastfeedIcon } from "../../assets/icons";
import { cn } from "../../lib/cn";
import { formatActiveBreastfeedingInsightDetail, type BreastTimerSide } from "../../lib/breastfeeding";
import type { DurationRingDisplay } from "../../lib/breastfeed-insights";
import {
  FEED_PREDICTION_FALLBACK,
  formatPredictionRange,
  getPredictionHeadline,
  type FeedPrediction,
} from "../../lib/feed-insights";
import { HomeActionBottleIcon } from "../ui/icons";

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

function HeroMetric({
  icon,
  iconSurface,
  value,
  unit,
  label,
}: {
  icon: ReactNode;
  iconSurface: string;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2.5 px-2.5 text-left first:pl-0 last:pr-0 md:gap-3.5 md:px-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-12 md:w-12" style={{ background: iconSurface }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[1.15rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[1.45rem]">
            {value}
          </span>
          <span className="text-[0.68rem] font-medium leading-none text-[var(--color-text-secondary)] md:text-[0.75rem]">
            {unit}
          </span>
        </div>
        <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)] md:text-[0.66rem]">
          {label}
        </p>
      </div>
    </div>
  );
}

function FeedStatusRow({
  activeSide,
  childName,
  prediction,
  totalDuration,
}: {
  activeSide: BreastTimerSide | null;
  childName: string;
  prediction: FeedPrediction | null;
  totalDuration: number;
}) {
  const isActive = activeSide !== null;

  return (
    <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-[var(--color-home-divider)] px-1.5 pt-3 md:mt-4 md:px-3 md:pt-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-tracker-art-surface)] text-[var(--color-healthy)] md:h-12 md:w-12">
        {isActive ? (
          <BreastIcon color="var(--color-home-action-feed-icon)" />
        ) : (
          <HomeActionBottleIcon className="h-5 w-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)] md:text-[0.74rem]">
          {isActive ? "Feeding now" : "Next feed"}
        </p>
        <p className="mt-0.5 truncate text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.16rem]">
          {isActive ? `${childName} is feeding` : prediction ? getPredictionHeadline(prediction) : FEED_PREDICTION_FALLBACK}
        </p>
        {isActive ? (
          <p className="mt-0.5 truncate text-[0.76rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.84rem]">
            {formatActiveBreastfeedingInsightDetail(totalDuration, activeSide)}
          </p>
        ) : prediction && (
          <p className="mt-0.5 truncate text-[0.76rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.84rem]">
            {formatPredictionRange(prediction)}
          </p>
        )}
      </div>
    </div>
  );
}

export function BreastfeedHeroMetricsCard({
  activeSide,
  className,
  childName,
  left24h,
  nextFeed,
  right24h,
  totalDuration,
  total24h,
}: {
  activeSide: BreastTimerSide | null;
  className?: string;
  childName: string;
  left24h: DurationRingDisplay;
  nextFeed: FeedPrediction | null;
  right24h: DurationRingDisplay;
  totalDuration: number;
  total24h: DurationRingDisplay;
}) {
  return (
    <div
      className={cn(
        "relative z-10 mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border px-3 py-3 shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px] md:px-5 md:py-4",
        className,
      )}
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--color-home-divider)]">
        <HeroMetric
          icon={<BreastIcon color="#de5c9f" />}
          iconSurface="rgba(255, 232, 243, 0.98)"
          value={left24h.value}
          unit={left24h.unit}
          label="Left 24h"
        />
        <HeroMetric
          icon={<ClockIcon />}
          iconSurface="rgba(255, 239, 228, 0.98)"
          value={total24h.value}
          unit={total24h.unit}
          label="Total 24h"
        />
        <HeroMetric
          icon={<BreastIcon mirrored color="#6f8df0" />}
          iconSurface="rgba(234, 239, 255, 0.98)"
          value={right24h.value}
          unit={right24h.unit}
          label="Right 24h"
        />
      </div>
      <FeedStatusRow
        activeSide={activeSide}
        childName={childName}
        prediction={nextFeed}
        totalDuration={totalDuration}
      />
    </div>
  );
}
