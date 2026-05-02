import { Link } from "react-router-dom";
import { BITSS_TYPES, STOOL_COLORS, STOOL_SIZES } from "../../lib/constants";
import { getPoopColorHex, getRecentHistoryDayLabel } from "../../lib/poop-insights";
import { Card, CardContent } from "../ui/card";
import { PoopPresetIcon } from "./PoopPresetIcon";
import type { PoopEntry } from "../../lib/types";

function formatHistoryTimeLabel(loggedAt: string) {
  const timestamp = new Date(loggedAt).getTime();
  if (Number.isNaN(timestamp)) return "Logged";

  const dayLabel = getRecentHistoryDayLabel(loggedAt);
  const timeLabel = new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (dayLabel === "Today") return timeLabel;
  if (dayLabel === "Yesterday") return `Yesterday, ${timeLabel}`;
  return dayLabel;
}

function getPoopTitle(log: PoopEntry) {
  const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
  if (!typeInfo) return "Poop logged";
  return `Type ${typeInfo.type}: ${typeInfo.label}`;
}

function getPoopDetail(log: PoopEntry) {
  const colorLabel = log.color ? STOOL_COLORS.find((item) => item.value === log.color)?.label : null;
  const sizeLabel = log.size ? STOOL_SIZES.find((item) => item.value === log.size)?.label : null;
  return [colorLabel, sizeLabel].filter(Boolean).join(" · ") || "Logged";
}

export function PoopRecentHistorySection({
  recentHistory,
  onEditPoop,
}: {
  recentHistory: PoopEntry[];
  onEditPoop: (log: PoopEntry) => void;
}) {
  return (
    <Card
      className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
            Recent history
          </p>
          <Link
            to="/history"
            className="text-[0.68rem] font-semibold text-[#7259f2] transition-opacity hover:opacity-75 md:text-[0.74rem]"
          >
            See all
          </Link>
        </div>

        <div className="mt-3">
          {recentHistory.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-5 text-center text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">
              Recent poop logs will appear here.
            </div>
          ) : recentHistory.map((log, index) => {
            const tint = log.color ? `${getPoopColorHex(log.color)}20` : "var(--color-bg-elevated)";
            const dotColor = log.color ? getPoopColorHex(log.color) : "#a86235";
            const isLast = index === recentHistory.length - 1;

            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onEditPoop(log)}
                className="relative flex w-full items-center gap-2.5 py-2 text-left md:gap-3"
              >
                <div className="flex w-[74px] shrink-0 items-start gap-2 md:w-[92px]">
                  <div className="relative mt-1 flex w-2.5 justify-center self-stretch">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
                    {!isLast && (
                      <span className="absolute top-4 h-[42px] w-px bg-[var(--color-home-divider)]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="min-w-0 pt-0.5 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.76rem]">
                    {formatHistoryTimeLabel(log.logged_at)}
                  </p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9" style={{ backgroundColor: tint }}>
                  <PoopPresetIcon
                    draft={{ stool_type: log.stool_type, color: log.color, size: log.size }}
                    className="h-5 w-5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.86rem]">
                    {getPoopTitle(log)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
                    {getPoopDetail(log)}
                  </p>
                </div>
                <span aria-hidden="true" className="text-[1.1rem] leading-none text-[var(--color-home-chevron)]">›</span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-[84px] bottom-0 h-px bg-[var(--color-home-divider)] md:inset-x-[108px]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
