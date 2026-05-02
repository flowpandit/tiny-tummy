import { useNavigate } from "react-router-dom";
import { HomeActionBottleIcon, HomeActionDiaperIcon, HomeActionSleepIcon, PoopIcon } from "../ui/icons";
import type { HomeGlanceStat, HomeTimelineItem } from "../../lib/home-insights";

interface RecentActivityProps {
  timeline: HomeTimelineItem[];
  glanceStats: HomeGlanceStat[];
}

function TimelineIcon({ accent }: { accent: HomeTimelineItem["accent"] }) {
  if (accent === "poop") {
    return <PoopIcon className="h-3.5 w-3.5 md:h-4 md:w-4" color="var(--color-home-poop-icon)" />;
  }

  if (accent === "feed") {
    return <HomeActionBottleIcon className="h-3.5 w-3.5 text-[var(--color-home-action-feed-icon)] md:h-4 md:w-4" />;
  }

  return <HomeActionDiaperIcon className="h-3.5 w-3.5 text-[var(--color-info)] md:h-4 md:w-4" />;
}

function GlanceIcon({ accent }: { accent: HomeGlanceStat["accent"] }) {
  if (accent === "poop") {
    return <PoopIcon className="h-4 w-4 md:h-5 md:w-5" color="var(--color-home-poop-icon)" />;
  }

  if (accent === "feed") {
    return <HomeActionBottleIcon className="h-4 w-4 text-[var(--color-home-action-feed-icon)] md:h-5 md:w-5" />;
  }

  if (accent === "sleep") {
    return <HomeActionSleepIcon className="h-4 w-4 text-[var(--color-home-sleep-icon)] md:h-5 md:w-5" />;
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[var(--color-info)] md:h-5 md:w-5" aria-hidden="true">
      <path d="M12 3.5c-1.79 2.34-5.5 6.63-5.5 10.09A5.5 5.5 0 0 0 12 19.09a5.5 5.5 0 0 0 5.5-5.5C17.5 10.13 13.79 5.84 12 3.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function timelineAccentStyles(accent: HomeTimelineItem["accent"]) {
  if (accent === "poop") {
    return {
      dot: "#c98c59",
      iconSurface: "var(--color-home-poop-surface)",
    };
  }

  if (accent === "feed") {
    return {
      dot: "#51bf99",
      iconSurface: "var(--color-home-hydration-surface)",
    };
  }

  return {
    dot: "#63a7f7",
    iconSurface: "var(--color-info-bg)",
  };
}

function glanceAccentStyles(accent: HomeGlanceStat["accent"]) {
  if (accent === "poop") {
    return "var(--gradient-home-glance-poop)";
  }

  if (accent === "feed") {
    return "var(--gradient-home-glance-feed)";
  }

  if (accent === "sleep") {
    return "var(--gradient-home-glance-sleep)";
  }

  return "var(--gradient-home-glance-diaper)";
}

export function RecentActivity({ timeline, glanceStats }: RecentActivityProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-0 md:px-10">
      <div
        className="rounded-[22px] border px-4 py-3.5 backdrop-blur-sm md:rounded-[30px] md:px-8 md:py-7"
        style={{
          background: "var(--color-home-card-surface)",
          borderColor: "var(--color-home-card-border)",
          boxShadow: "var(--shadow-home-card)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.82rem]">
            Today timeline
          </p>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--color-home-link)] transition-opacity hover:opacity-80 md:text-[0.92rem]"
          >
            View all
            <span aria-hidden="true" className="text-[1.1rem] leading-none">›</span>
          </button>
        </div>

        {timeline.length > 0 ? (
          <div className="mt-3 md:mt-6">
            {timeline.map((item, index) => {
              const accentStyles = timelineAccentStyles(item.accent);
              const isLast = index === timeline.length - 1;

              return (
                <div key={item.id} className="flex gap-2.5 md:gap-5">
                  <div className="flex w-[76px] shrink-0 items-start gap-2.5 md:w-[112px] md:gap-3">
                    <div className="mt-1.5 flex flex-col items-center self-stretch md:mt-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: accentStyles.dot }}
                      />
                      {!isLast && (
                        <span className="mt-1 min-h-[42px] w-px flex-1 md:min-h-[54px]" style={{ background: "var(--gradient-home-timeline-line)" }} />
                      )}
                    </div>
                    <div className="pt-0.5 text-[0.76rem] font-medium text-[var(--color-text)] md:text-[1rem]">
                      {item.timeLabel}
                    </div>
                  </div>

                  <div className={`flex flex-1 items-start gap-2.5 md:gap-3 ${!isLast ? "border-b border-[var(--color-home-divider)] pb-2.5 md:pb-5" : ""}`}>
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-12 md:w-12"
                      style={{ background: accentStyles.iconSurface }}
                    >
                      <TimelineIcon accent={item.accent} />
                    </div>
                    <div className="min-w-0 flex-1 pb-2 md:pb-4">
                      <p className="text-[0.82rem] font-semibold tracking-[-0.02em] text-[var(--color-text)] md:text-[1.08rem]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:mt-1 md:text-[0.9rem]">
                        {item.detail}
                      </p>
                    </div>
                    <span aria-hidden="true" className="pt-0.5 text-[1.35rem] leading-none text-[var(--color-home-chevron)] md:pt-1 md:text-[1.75rem]">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-[18px] bg-[var(--color-home-empty-surface)] px-4 py-4 text-[0.78rem] leading-relaxed text-[var(--color-text-secondary)] md:mt-5 md:rounded-[24px] md:px-5 md:py-6 md:text-[0.98rem]">
            Your day will appear here as you log events.
          </div>
        )}
      </div>

      <div className="mt-4 md:mt-8">
        <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:px-0 md:text-[0.82rem]">
          Today at a glance
        </p>
        <div className="mt-2.5 grid grid-cols-4 gap-2 md:mt-4 md:gap-6">
          {glanceStats.map((stat) => (
            <div
              key={stat.id}
              className="min-h-[82px] rounded-[14px] border border-[var(--color-home-card-border)] px-2.5 py-3 shadow-[0_12px_24px_rgba(172,139,113,0.08)] md:min-h-[128px] md:rounded-[22px] md:px-6 md:py-5"
              style={{ background: glanceAccentStyles(stat.accent) }}
            >
              <div className="flex items-center gap-1.5 md:gap-4">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center md:h-10 md:w-10">
                  <GlanceIcon accent={stat.accent} />
                </div>
                <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[2rem]">
                  {stat.value}
                </p>
              </div>
              <p className="mt-1.5 text-[0.62rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-text)] md:text-[0.95rem]">
                {stat.label}
              </p>
              <p className={`mt-0.5 text-[0.62rem] md:text-[0.86rem] ${stat.id === "wet-diapers" ? "text-[var(--color-home-good)]" : "text-[var(--color-text-secondary)]"}`}>
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
