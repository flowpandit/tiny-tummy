import { Link } from "react-router-dom";
import { getSleepRecentHistoryDayLabel, getSleepRecentHistorySummary } from "../../lib/sleep-view-model";
import type { SleepEntry } from "../../lib/types";

export function SleepRecentHistorySection({
  logs,
  onEdit,
}: {
  logs: SleepEntry[];
  onEdit: (entry: SleepEntry) => void;
}) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <section className="px-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[1rem] font-semibold text-[var(--color-text)]">Recent history</p>
        <Link
          to="/history"
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-strong)]"
        >
          See all
        </Link>
      </div>

      <div className="mt-2.5 space-y-2">
        {logs.map((log, index) => {
          const isNight = log.sleep_type === "night";
          const tint = isNight
            ? "color-mix(in srgb, var(--color-info) 26%, transparent)"
            : "color-mix(in srgb, var(--color-cta) 26%, transparent)";

          return (
            <button
              key={log.id}
              type="button"
              onClick={() => onEdit(log)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {index < logs.length - 1 && (
                  <span
                    className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                    style={{ backgroundColor: "var(--color-border)" }}
                  />
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: tint }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={isNight ? "var(--color-info)" : "var(--color-cta)"} strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
                  </svg>
                </span>
              </div>
              <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text)]">{getSleepRecentHistoryDayLabel(log.started_at)}:</span>{" "}
                {getSleepRecentHistorySummary(log)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
