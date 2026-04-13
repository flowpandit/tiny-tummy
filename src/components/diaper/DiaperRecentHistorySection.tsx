import { Link } from "react-router-dom";
import { getDiaperSummary, getRecentHistoryDayLabel, getRecentHistoryDiaperIcon } from "../../lib/diaper-insights";
import type { DiaperEntry } from "../../lib/types";

export function DiaperRecentHistorySection({
  icons,
  recentLogs,
  onEditLog,
}: {
  icons: Record<DiaperEntry["diaper_type"], string>;
  recentLogs: DiaperEntry[];
  onEditLog: (log: DiaperEntry) => void;
}) {
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
        {recentLogs.map((log, index) => {
          const tint = log.diaper_type === "wet"
            ? "color-mix(in srgb, var(--color-info) 28%, transparent)"
            : log.diaper_type === "mixed"
              ? "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 30%, transparent) 0%, color-mix(in srgb, #c08937 30%, transparent) 100%)"
              : "color-mix(in srgb, #c08937 28%, transparent)";

          return (
            <button
              key={log.id}
              type="button"
              onClick={() => onEditLog(log)}
              className="flex w-full items-center gap-2.5 text-left"
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {index < recentLogs.length - 1 && (
                  <span
                    className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                    style={{ backgroundColor: "var(--color-border)" }}
                  />
                )}
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={log.diaper_type === "mixed" ? { backgroundImage: tint } : { backgroundColor: tint }}
                >
                  <img
                    src={getRecentHistoryDiaperIcon(log.diaper_type, icons)}
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 object-contain"
                  />
                </span>
              </div>
              <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                {getDiaperSummary(log)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
