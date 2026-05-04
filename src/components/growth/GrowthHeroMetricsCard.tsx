import { cn } from "../../lib/cn";

export interface GrowthHeroMetric {
  id: "weight" | "length" | "head";
  label: string;
  percentile: string;
  value: string;
}

const TONE_STYLES: Record<GrowthHeroMetric["id"], { color: string; background: string }> = {
  weight: {
    color: "var(--color-cta)",
    background: "rgba(255, 133, 82, 0.14)",
  },
  length: {
    color: "var(--color-healthy)",
    background: "rgba(52, 197, 132, 0.15)",
  },
  head: {
    color: "var(--color-info)",
    background: "rgba(111, 143, 213, 0.15)",
  },
};

function GrowthMetricIcon({ id }: { id: GrowthHeroMetric["id"] }) {
  if (id === "weight") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M6.75 20.25h10.5a1.5 1.5 0 0 0 1.48-1.74L16.8 6.75H7.2L5.27 18.51a1.5 1.5 0 0 0 1.48 1.74Z" />
        <path d="M9 6.75a3 3 0 0 1 6 0" />
        <path d="M12 11.25v3" />
        <path d="m10.5 12 1.5-.75 1.5.75" />
      </svg>
    );
  }

  if (id === "length") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M5.5 18.5 18.5 5.5" />
        <path d="m7.5 16.5 1.6 1.6" />
        <path d="m10.25 13.75 1.25 1.25" />
        <path d="m13 11 1.6 1.6" />
        <path d="m15.75 8.25 1.25 1.25" />
        <path d="M4.25 19.75h15.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M8.25 18.25v-2.2A5.8 5.8 0 0 1 6.5 11.9 5.55 5.55 0 0 1 12.15 6.25a5.52 5.52 0 0 1 5.6 5.55 5.85 5.85 0 0 1-1.6 4v2.45" />
      <path d="M9.25 18.25h5.5" />
      <path d="M8.75 10.25c1.1-1.1 2.25-1.65 3.45-1.65 1.15 0 2.25.53 3.3 1.6" />
      <path d="M7.5 13.2c2.9 1.65 5.95 1.65 9.15 0" />
    </svg>
  );
}

export function GrowthHeroMetricsCard({
  className,
  metrics,
}: {
  className?: string;
  metrics: GrowthHeroMetric[];
}) {
  return (
    <div
      className={cn(
        "relative self-start overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[20px]",
        className,
      )}
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <div className="grid grid-cols-3">
        {metrics.map((metric, index) => {
          const tone = TONE_STYLES[metric.id];

          return (
            <div
              key={metric.id}
              className={cn(
                "min-w-0 px-3 py-3.5 md:px-4",
                index > 0 && "border-l border-[var(--color-home-card-border)] pl-3.5 md:pl-5",
              )}
            >
              <div className="flex min-w-0 items-start gap-2.5 md:items-center">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9"
                  style={{ color: tone.color, background: tone.background }}
                >
                  <GrowthMetricIcon id={metric.id} />
                </span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[0.95rem] font-semibold leading-none tracking-[-0.02em] text-[var(--color-text)] md:text-[1.05rem]">
                    {metric.percentile}
                  </p>
                  <p className="mt-1 truncate text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)] md:text-[0.62rem]">
                    {metric.label}
                  </p>
                  <p className="mt-2 truncate text-[0.72rem] font-medium text-[var(--color-text)] md:text-[0.78rem]">
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
