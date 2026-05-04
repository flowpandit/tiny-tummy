import { Link } from "react-router-dom";
import {
  getBreastfeedContextHistorySummary,
  getBreastfeedContextHistoryTitle,
  getBreastHistoryTone,
  getRecentHistoryDayLabel,
} from "../../lib/breastfeed-insights";
import type { FeedingEntry, UnitSystem } from "../../lib/types";
import { Card, CardContent } from "../ui/card";
import { HomeActionBottleIcon, HomeActionBreastfeedIcon, MealIcon } from "../ui/icons";

function formatHistoryTimeLabel(loggedAt: string) {
  const timestamp = new Date(loggedAt).getTime();
  if (Number.isNaN(timestamp)) return "Logged";

  const dayLabel = getRecentHistoryDayLabel(loggedAt);
  const timeLabel = new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (dayLabel === "Today") return timeLabel;
  if (dayLabel === "Yesterday") return `Yesterday, ${timeLabel}`;
  return dayLabel;
}

function getFeedContextTone(log: FeedingEntry) {
  if (log.food_type === "breast_milk" && log.breast_side) {
    const breastTone = getBreastHistoryTone(log.breast_side);
    return {
      ...breastTone,
      color: breastTone.dot,
    };
  }

  if (log.food_type === "solids" || log.food_type === "other") {
    return {
      mirrored: false,
      bg: "rgba(255, 239, 228, 0.98)",
      dot: "#a86235",
      color: "#a86235",
    };
  }

  if (log.food_type === "water") {
    return {
      mirrored: false,
      bg: "rgba(234, 239, 255, 0.98)",
      dot: "#6f8df0",
      color: "#6f8df0",
    };
  }

  return {
    mirrored: false,
    bg: "rgba(223, 248, 236, 0.95)",
    dot: "#13a970",
    color: "#13a970",
  };
}

function FeedContextIcon({ log, color }: { log: FeedingEntry; color: string }) {
  if (log.food_type === "breast_milk" && log.breast_side) {
    return <HomeActionBreastfeedIcon className="h-4.5 w-4.5" />;
  }

  if (log.food_type === "solids" || log.food_type === "other") {
    return <MealIcon className="h-4.5 w-4.5" color={color} />;
  }

  return <HomeActionBottleIcon className="h-4.5 w-4.5" />;
}

export function BreastfeedRecentHistorySection({ logs, unitSystem }: { logs: FeedingEntry[]; unitSystem: UnitSystem }) {
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
            Recent feeds
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
              Recent feeds will appear here.
            </div>
          ) : logs.map((log, index) => {
            const tone = getFeedContextTone(log);
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
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9"
                  style={{
                    background: tone.bg,
                    color: tone.color,
                    transform: tone.mirrored ? "scaleX(-1)" : undefined,
                  }}
                >
                  <FeedContextIcon log={log} color={tone.color} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.86rem]">
                    {getBreastfeedContextHistoryTitle(log)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
                    {getBreastfeedContextHistorySummary(log, unitSystem)}
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
