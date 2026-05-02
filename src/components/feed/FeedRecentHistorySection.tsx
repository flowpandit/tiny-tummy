import { Link } from "react-router-dom";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../../lib/feeding";
import type { FeedingEntry, UnitSystem } from "../../lib/types";
import { Card, CardContent } from "../ui/card";
import { HomeActionBottleIcon, HomeActionBreastfeedIcon, MealIcon } from "../ui/icons";

function formatHistoryTimeLabel(loggedAt: string) {
  const timestamp = new Date(loggedAt).getTime();
  if (Number.isNaN(timestamp)) return "Logged";

  const loggedDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const timeLabel = loggedDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (loggedDate.toDateString() === today.toDateString()) return timeLabel;
  if (loggedDate.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeLabel}`;
  return loggedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getFeedTone(log: FeedingEntry) {
  if (log.food_type === "breast_milk" || log.food_type === "pumping") {
    return { dot: "#de5c9f", bg: "rgba(255, 232, 243, 0.98)", color: "#de5c9f" };
  }

  if (log.food_type === "solids" || log.food_type === "other") {
    return { dot: "#a86235", bg: "rgba(255, 239, 228, 0.98)", color: "#a86235" };
  }

  if (log.food_type === "water") {
    return { dot: "#6f8df0", bg: "rgba(234, 239, 255, 0.98)", color: "#6f8df0" };
  }

  return { dot: "#13a970", bg: "rgba(223, 248, 236, 0.95)", color: "#13a970" };
}

function FeedHistoryIcon({ log }: { log: FeedingEntry }) {
  const tone = getFeedTone(log);

  if (log.food_type === "breast_milk" || log.food_type === "pumping") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9" style={{ background: tone.bg, color: tone.color }}>
        <HomeActionBreastfeedIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  if (log.food_type === "solids" || log.food_type === "other") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9" style={{ background: tone.bg, color: tone.color }}>
        <MealIcon className="h-4.5 w-4.5" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9" style={{ background: tone.bg, color: tone.color }}>
      <HomeActionBottleIcon className="h-4.5 w-4.5" />
    </span>
  );
}

export function FeedRecentHistorySection({
  logs,
  onEditFeed,
  unitSystem,
}: {
  logs: FeedingEntry[];
  onEditFeed: (log: FeedingEntry) => void;
  unitSystem: UnitSystem;
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
          {logs.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-5 text-center text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">
              Recent feed logs will appear here.
            </div>
          ) : logs.map((log, index) => {
            const detailLabel = getFeedingEntryDetailParts(log, unitSystem).join(" · ");
            const secondary = getFeedingEntrySecondaryText(log);
            const tone = getFeedTone(log);
            const isLast = index === logs.length - 1;

            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onEditFeed(log)}
                className="relative flex w-full items-center gap-2.5 py-2 text-left md:gap-3"
              >
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
                <FeedHistoryIcon log={log} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.86rem]">
                    {getFeedingEntryPrimaryLabel(log)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
                    {detailLabel || secondary || "Logged"}
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
