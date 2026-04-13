import { Link } from "react-router-dom";
import { BITSS_TYPES } from "../../lib/constants";
import { getPoopColorHex, getRecentHistoryDayLabel } from "../../lib/poop-insights";
import { PoopPresetIcon } from "./PoopPresetIcon";
import type { PoopEntry } from "../../lib/types";

export function PoopRecentHistorySection({
  recentHistory,
}: {
  recentHistory: PoopEntry[];
}) {
  if (recentHistory.length === 0) {
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
        {recentHistory.map((log, index) => {
          const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
          const title = typeInfo?.label ?? "Logged";
          const tint = log.color ? `${getPoopColorHex(log.color)}20` : "var(--color-bg-elevated)";

          return (
            <div key={log.id} className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {index < recentHistory.length - 1 && (
                  <span
                    className="absolute left-1/2 top-8 h-6 w-px -translate-x-1/2"
                    style={{ backgroundColor: "var(--color-border)" }}
                  />
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: tint }}>
                  <PoopPresetIcon
                    draft={{ stool_type: log.stool_type, color: log.color, size: log.size }}
                    className="h-5 w-5"
                  />
                </span>
              </div>
              <p className="text-[0.95rem] leading-none text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--color-text)]">{getRecentHistoryDayLabel(log.logged_at)}:</span>{" "}
                Type {log.stool_type ?? "?"}, {title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
