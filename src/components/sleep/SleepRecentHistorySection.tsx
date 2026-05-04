import { Link } from "react-router-dom";
import { buildSleepTimelineItems } from "../../lib/sleep-view-model";
import { getTodayKey } from "../../lib/sleep-insights";
import type { SleepEntry } from "../../lib/types";

export function SleepRecentHistorySection({
  logs,
  onEdit,
}: {
  logs: SleepEntry[];
  onEdit: (entry: SleepEntry) => void;
}) {
  if (logs.length === 0) {
    return (
      <section
        className="rounded-[22px] border px-4 py-4 shadow-[var(--shadow-home-card)] md:rounded-[26px] md:px-5 md:py-5"
        style={{
          background: "var(--color-home-card-surface)",
          borderColor: "var(--color-home-card-border)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
            Today timeline
          </p>
        </div>
        <div className="mt-4 rounded-[18px] bg-[var(--color-home-empty-surface)] px-4 py-4 text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
          Sleep events will appear here as you log naps and night sleep.
        </div>
      </section>
    );
  }

  const timeline = buildSleepTimelineItems(logs, getTodayKey());
  const logById = new Map(logs.map((log) => [log.id, log]));

  return (
    <section
      className="rounded-[22px] border px-4 py-4 shadow-[var(--shadow-home-card)] md:rounded-[26px] md:px-5 md:py-5"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
          Today timeline
        </p>
        <Link
          to="/history"
          className="text-[0.8rem] font-semibold text-[var(--color-home-link)] transition-opacity hover:opacity-80 md:text-[0.92rem]"
        >
          View all
        </Link>
      </div>

      {timeline.length === 0 ? (
        <div className="mt-4 rounded-[18px] bg-[var(--color-home-empty-surface)] px-4 py-4 text-[0.88rem] leading-relaxed text-[var(--color-text-secondary)]">
          No sleep events logged today.
        </div>
      ) : (
        <div className="mt-4">
          {timeline.map((item, index) => {
            const log = logById.get(item.logId);
            const isLast = index === timeline.length - 1;
            const isWake = item.accent === "wake";
            const iconSurface = isWake
              ? "rgba(255, 246, 222, 0.95)"
              : item.accent === "night"
                ? "var(--color-home-sleep-surface)"
                : "rgba(246, 241, 255, 0.95)";
            const iconColor = isWake ? "#ffb72f" : "var(--color-home-action-sleep-icon)";
            const dotColor = isWake ? "#ffbe3d" : "var(--color-home-action-sleep-icon)";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (log) onEdit(log);
                }}
                className="flex w-full gap-3 text-left md:gap-4"
              >
                <div className="flex w-[70px] shrink-0 items-start gap-2.5 md:w-[92px]">
                  <div className="mt-1.5 flex flex-col items-center self-stretch">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
                    {!isLast && (
                      <span className="mt-1 min-h-[48px] w-px flex-1" style={{ background: "var(--gradient-home-timeline-line)" }} />
                    )}
                  </div>
                  <div className="pt-0.5 text-[0.84rem] font-medium text-[var(--color-text)] md:text-[0.95rem]">
                    {item.timeLabel}
                  </div>
                </div>

                <div className={`relative flex flex-1 items-start gap-2.5 ${!isLast ? "pb-3" : ""}`}>
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11"
                    style={{ background: iconSurface, color: iconColor }}
                  >
                    {isWake ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 3.75v1.5M12 18.75v1.5M4.5 12H3M21 12h-1.5M6.7 6.7 5.65 5.65M18.35 18.35 17.3 17.3M17.3 6.7l1.05-1.05M5.65 18.35 6.7 17.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                        <path d="M19.5 13.5A7.5 7.5 0 1 1 10.5 4.57a6 6 0 0 0 9 8.93Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <p className="text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--color-text)] md:text-[1.04rem]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[0.82rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.9rem]">
                      {item.detail}
                    </p>
                  </div>
                  <span aria-hidden="true" className="pt-0.5 text-[1.35rem] leading-none text-[var(--color-home-chevron)]">›</span>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-3 h-px bg-[var(--color-home-divider)]"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
