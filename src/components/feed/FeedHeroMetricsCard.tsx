import { useEffect, useState, type ReactNode } from "react";
import { timeSinceDetailed } from "../../lib/utils";
import { cn } from "../../lib/cn";
import { HomeActionBottleIcon, MealIcon } from "../ui/icons";

interface FeedHeroDisplay {
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

function getLastFeedMetric(timestamp: string | null) {
  if (!timestamp) return { value: "--", unit: "no data" };

  const time = timeSinceDetailed(timestamp);
  return {
    value: String(time.value),
    unit: `${time.unit} ago`,
  };
}

function getCompactTodayUnit(unit: string) {
  if (unit === "feed today" || unit === "feeds today") return "today";
  if (unit.endsWith(" today")) return unit.replace(" today", "");
  return unit;
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

export function FeedHeroMetricsCard({
  className,
  lastFeedTimestamp,
  nextFeed,
  todayIntake,
}: {
  className?: string;
  lastFeedTimestamp: string | null;
  nextFeed: FeedHeroDisplay;
  todayIntake: FeedHeroDisplay & { label: string };
}) {
  const [lastFeedMetric, setLastFeedMetric] = useState(() => getLastFeedMetric(lastFeedTimestamp));

  useEffect(() => {
    setLastFeedMetric(getLastFeedMetric(lastFeedTimestamp));
    if (!lastFeedTimestamp) return;

    const interval = window.setInterval(() => {
      setLastFeedMetric(getLastFeedMetric(lastFeedTimestamp));
    }, 60000);

    return () => window.clearInterval(interval);
  }, [lastFeedTimestamp]);

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
          icon={<HomeActionBottleIcon className="h-5 w-5 text-[#13a970]" />}
          iconSurface="rgba(223, 248, 236, 0.95)"
          value={lastFeedMetric.value}
          unit={lastFeedMetric.unit}
          label="Last feed"
        />
        <HeroMetric
          icon={<ClockIcon />}
          iconSurface="rgba(255, 239, 228, 0.98)"
          value={nextFeed.value}
          unit={nextFeed.unit}
          label="Next likely"
        />
        <HeroMetric
          icon={<MealIcon className="h-5 w-5 text-[#7259f2]" />}
          iconSurface="rgba(241, 235, 255, 0.98)"
          value={todayIntake.value}
          unit={getCompactTodayUnit(todayIntake.unit)}
          label={todayIntake.label}
        />
      </div>
    </div>
  );
}
