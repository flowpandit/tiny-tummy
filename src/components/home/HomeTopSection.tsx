import type { ReactNode } from "react";
import { HomeActionSleepIcon, PoopIcon } from "../ui/icons";
import { type HomeInsightCard, type HomeStatusMessage } from "../../lib/home-insights";

interface HomeTopSectionProps {
  alertSlot?: ReactNode;
  status: HomeStatusMessage;
  insights: HomeInsightCard[];
  onInsightSelect: (insight: HomeInsightCard) => void;
  onInsightAction?: (insight: HomeInsightCard) => void;
}

function InsightIcon({ accent }: { accent: HomeInsightCard["accent"] }) {
  if (accent === "poop") {
    return <PoopIcon className="h-4 w-4 md:h-5 md:w-5" color="var(--color-home-poop-icon)" />;
  }

  if (accent === "hydration") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[var(--color-home-hydration-icon)] md:h-5 md:w-5" aria-hidden="true">
        <path d="M12 3.5c-1.79 2.34-5.5 6.63-5.5 10.09A5.5 5.5 0 0 0 12 19.09a5.5 5.5 0 0 0 5.5-5.5C17.5 10.13 13.79 5.84 12 3.5Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return <HomeActionSleepIcon className="h-4 w-4 text-[var(--color-home-sleep-icon)] md:h-5 md:w-5" />;
}

function HeroBackdropArt() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-[-16px] h-[112px] w-[128px] overflow-hidden rounded-br-[20px] md:right-0 md:h-[184px] md:w-[232px] md:rounded-br-[28px]" aria-hidden="true">
      <div className="absolute bottom-0 right-0 h-[42px] w-[128px] rounded-tl-[70px] bg-[#ffd8cc]/72 md:h-[70px] md:w-[232px] md:rounded-tl-[120px]" />
      <div
        className="absolute bottom-1 right-8 h-9 w-20 rounded-full md:bottom-3 md:right-[58px] md:h-14 md:w-32"
        style={{
          background: "var(--color-home-hero-cloud-surface)",
          boxShadow: "var(--shadow-home-hero-cloud)",
        }}
      />
      <div className="absolute bottom-11 right-[74px] h-11 w-11 rounded-full bg-[#ffe1a6]/78 md:bottom-[76px] md:right-[132px] md:h-16 md:w-16" />
    </div>
  );
}

function insightAccentStyles(accent: HomeInsightCard["accent"]) {
  if (accent === "poop") {
    return {
      iconSurface: "var(--color-home-poop-surface)",
      labelClassName: "text-[var(--color-home-poop-label)]",
      valueClassName: "text-[var(--color-home-poop-value)]",
    };
  }

  if (accent === "hydration") {
    return {
      iconSurface: "var(--color-home-hydration-surface)",
      labelClassName: "text-[var(--color-home-hydration-label)]",
      valueClassName: "text-[var(--color-home-hydration-value)]",
    };
  }

  return {
    iconSurface: "var(--color-home-sleep-surface)",
    labelClassName: "text-[var(--color-home-sleep-label)]",
    valueClassName: "text-[var(--color-home-sleep-value)]",
  };
}

function InsightSummaryItem({ insight, showChevron = true }: { insight: HomeInsightCard; showChevron?: boolean }) {
  const accentStyles = insightAccentStyles(insight.accent);

  return (
    <div className="group flex min-w-0 items-center gap-3 md:gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full md:h-[64px] md:w-[64px]"
        style={{ background: accentStyles.iconSurface }}
      >
        <InsightIcon accent={insight.accent} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[1rem] font-semibold leading-snug tracking-[-0.01em] md:text-[0.95rem] ${accentStyles.labelClassName}`}>
          {insight.value}
        </p>
        <p className={`mt-0.5 text-[0.85rem] font-medium leading-snug md:text-[0.92rem] ${accentStyles.valueClassName}`}>
          {insight.detail}
        </p>
        {insight.accent === "poop" && (
          <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.9rem]">
            Keep an eye on it
          </p>
        )}
      </div>
      {showChevron && <span className="text-[1.4rem] leading-none text-[var(--color-home-chevron)] md:hidden">›</span>}
    </div>
  );
}

export function HomeTopSection({
  alertSlot,
  status,
  insights,
  onInsightSelect,
  onInsightAction,
}: HomeTopSectionProps) {
  const insightsGridClassName = insights.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <section className="relative px-4 pt-1 md:px-10 md:pt-0">
      <div className="relative min-h-[124px] overflow-hidden rounded-[20px] px-4 pb-3 pt-3.5 shadow-[0_12px_28px_rgba(180,138,101,0.08)] [background:var(--gradient-home-hero-card)] md:min-h-[178px] md:rounded-[28px] md:px-8 md:pb-6 md:pt-6 md:shadow-[0_16px_34px_rgba(180,138,101,0.08)]">
        <div
          className="pointer-events-none absolute -bottom-7 left-[50%] h-16 w-28 rounded-[52%_48%_0_0] md:left-[54%] md:h-24 md:w-36"
          style={{ background: "var(--gradient-home-hero-hill)" }}
        />
        <div
          className="pointer-events-none absolute bottom-[-16px] right-[10%] h-9 w-[86px] rounded-full md:right-[20%] md:h-[54px] md:w-[112px]"
          style={{
            background: "var(--color-home-hero-cloud-surface)",
            boxShadow: "var(--shadow-home-hero-cloud)",
          }}
          aria-hidden="true"
        />
        <HeroBackdropArt />

        <div className="relative flex items-start justify-between gap-4 sm:gap-7">
          <div className="min-w-0 flex-1 pt-0.5 md:max-w-[calc(100%_-_260px)] md:pt-1">
            <p className="text-[0.82rem] font-medium tracking-[-0.01em] text-[var(--color-home-hero-greeting)] md:text-[1.18rem]">
              {status.greeting}
            </p>
            <h1 className="mt-1 max-w-[14ch] text-[1.82rem] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--color-text)] md:max-w-[15ch] md:text-[2.75rem]">
              {status.title}
            </h1>
            <p className="mt-1.5 max-w-[24ch] text-[0.82rem] leading-snug text-[var(--color-text-secondary)] md:max-w-[28ch] md:text-[1.08rem] md:leading-relaxed">
              {status.detail}
            </p>
          </div>
        </div>
      </div>

      {alertSlot && (
        <div className="mt-2">
          {alertSlot}
        </div>
      )}

      <div className="relative">
        <div
          className="mt-2 rounded-[22px] border px-4 py-3.5 backdrop-blur-sm md:rounded-[30px] md:px-9 md:py-7"
          style={{
            background: "var(--color-home-card-surface)",
            borderColor: "var(--color-home-card-border)",
            boxShadow: "var(--shadow-home-card)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)] md:text-[0.85rem]">
              Today&apos;s insights
            </p>
          </div>

          <div className={`mt-3 grid gap-0 md:mt-5 ${insightsGridClassName} md:gap-8`}>
            {insights.map((insight) => {
              const hasAction = Boolean(insight.actionLabel && onInsightAction);

              return (
                <div key={insight.id} className="border-b border-[var(--color-home-divider)] py-2 first:pt-0 last:border-b-0 last:pb-0 md:border-b-0 md:border-r md:py-0 md:pr-6 md:last:border-r-0 md:last:pr-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      className="block min-w-0 flex-1 rounded-[16px] text-left transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:rounded-[22px]"
                      onClick={() => onInsightSelect(insight)}
                    >
                      <InsightSummaryItem insight={insight} showChevron={!hasAction} />
                    </button>
                    {hasAction && (
                      <button
                        type="button"
                        aria-label={insight.actionAriaLabel ?? insight.actionLabel}
                        disabled={insight.actionDisabled}
                        onClick={() => onInsightAction?.(insight)}
                        className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-home-sleep-icon)_22%,transparent)] bg-[color-mix(in_srgb,var(--color-home-sleep-surface)_68%,var(--color-home-card-surface))] px-3 py-2 text-[0.76rem] font-semibold text-[var(--color-home-sleep-value)] shadow-[0_8px_18px_rgba(131,102,220,0.12)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-55 md:px-3.5 md:text-[0.82rem]"
                      >
                        {insight.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
