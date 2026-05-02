import { Link } from "react-router-dom";
import { breastfeedIcon } from "../../assets/icons";
import { getBreastHistorySummary, getBreastHistoryTone, getRecentHistoryDayLabel } from "../../lib/breastfeed-insights";
import type { FeedingEntry } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

function formatHistoryTimeLabel(loggedAt: string) {
  const timestamp = new Date(loggedAt).getTime();
  if (Number.isNaN(timestamp)) return "Logged";

  const dayLabel = getRecentHistoryDayLabel(loggedAt);
  const timeLabel = new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (dayLabel === "Today") return timeLabel;
  if (dayLabel === "Yesterday") return `Yesterday, ${timeLabel}`;
  return dayLabel;
}

export function BreastfeedRecentHistorySection({ logs }: { logs: FeedingEntry[] }) {
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
          {logs.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-5 text-center text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">
              Recent breastfeeding sessions will appear here.
            </div>
          ) : logs.map((log, index) => {
            const tone = getBreastHistoryTone(log.breast_side);
            const isLast = index === logs.length - 1;
            return (
              <div key={log.id} className="relative flex items-center gap-2.5 py-2 md:gap-3">
                <div className="flex w-[74px] shrink-0 items-start gap-2 md:w-[92px]">
                  <div className="relative mt-1 flex w-2.5 justify-center self-stretch">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
                    {!isLast && (
                      <span className="absolute top-4 h-[42px] w-px bg-[var(--color-home-divider)]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="min-w-0 pt-0.5 text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] md:text-[0.76rem]">
                    {formatHistoryTimeLabel(log.logged_at)}
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text)] md:h-9 md:w-9" style={{ background: tone.bg }}>
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.86rem]">
                    Breastfeeding
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
                    {getBreastHistorySummary(log)}
                  </p>
                </div>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-[84px] bottom-0 h-px bg-[var(--color-home-divider)] md:inset-x-[108px]"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
