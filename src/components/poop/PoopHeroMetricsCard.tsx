import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { timeSinceDetailed } from "../../lib/utils";
import type { AgeBaseline, PoopPrediction } from "../../lib/poop-insights";
import { PoopIcon } from "../ui/icons";

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#f36d24]" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.8v4.6l3.2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-[#7259f2]" aria-hidden="true">
      <path d="M7.5 4.5v2.3M16.5 4.5v2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="6.2" width="14" height="13.3" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.6 10h12.8M8.7 13.1h1.8M13.5 13.1h1.8M8.7 16h1.8M13.5 16h1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function getLastPoopMetric(timestamp: string | null) {
  if (!timestamp) return { value: "--", unit: "no data" };

  const time = timeSinceDetailed(timestamp);
  return {
    value: String(time.value),
    unit: `${time.unit} ago`,
  };
}

function formatGapMetricHours(hours: number) {
  if (hours < 36) {
    return {
      value: String(Math.max(1, Math.round(hours))),
      unit: "hrs",
    };
  }

  return {
    value: String(Math.round((hours / 24) * 10) / 10),
    unit: "days",
  };
}

function getTypicalGapMetric(prediction: PoopPrediction | null, baseline: AgeBaseline) {
  if (prediction) {
    return formatGapMetricHours(prediction.intervalHours);
  }

  return {
    value: `${baseline.lowerHours}-${baseline.upperHours}`,
    unit: "hrs",
  };
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

export function PoopHeroMetricsCard({
  baseline,
  className,
  lastPoopTimestamp,
  prediction,
  todayPoopCount,
}: {
  baseline: AgeBaseline;
  className?: string;
  lastPoopTimestamp: string | null;
  prediction: PoopPrediction | null;
  todayPoopCount: number;
}) {
  const [lastPoopMetric, setLastPoopMetric] = useState(() => getLastPoopMetric(lastPoopTimestamp));
  const typicalGapMetric = getTypicalGapMetric(prediction, baseline);

  useEffect(() => {
    setLastPoopMetric(getLastPoopMetric(lastPoopTimestamp));
    if (!lastPoopTimestamp) return;

    const interval = window.setInterval(() => {
      setLastPoopMetric(getLastPoopMetric(lastPoopTimestamp));
    }, 60000);

    return () => window.clearInterval(interval);
  }, [lastPoopTimestamp]);

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
          icon={<PoopIcon className="h-5 w-5" color="#a86235" />}
          iconSurface="rgba(255, 238, 226, 0.98)"
          value={lastPoopMetric.value}
          unit={lastPoopMetric.unit}
          label="Last poop"
        />
        <HeroMetric
          icon={<ClockIcon />}
          iconSurface="rgba(255, 239, 228, 0.98)"
          value={typicalGapMetric.value}
          unit={typicalGapMetric.unit}
          label="Typical gap"
        />
        <HeroMetric
          icon={<CalendarIcon />}
          iconSurface="rgba(241, 235, 255, 0.98)"
          value={String(todayPoopCount)}
          unit="today"
          label="Today"
        />
      </div>
    </div>
  );
}
