import { Link } from "react-router-dom";
import { breastfeedIcon } from "../../assets/icons";
import { getBreastHistorySummary, getBreastHistoryTone, getRecentHistoryDayLabel } from "../../lib/breastfeed-insights";
import type { FeedingEntry } from "../../lib/types";

export function BreastfeedRecentHistorySection({ logs }: { logs: FeedingEntry[] }) {
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
          const tone = getBreastHistoryTone(log.breast_side);
          return (
            <div key={log.id} className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {index < logs.length - 1 && (
                  <span className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2" style={{ backgroundColor: "var(--color-border)" }} />
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)]" style={{ background: tone.bg }}>
                  <span
                    aria-hidden="true"
                    className="inline-block h-4.5 w-4.5"
                    style={{
                      backgroundColor: "var(--color-text)",
                      transform: tone.mirrored ? "scaleX(-1)" : undefined,
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
                </span>
              </div>
              <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                {getBreastHistorySummary(log)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
