import { Card, CardContent } from "../ui/card";
import { TrackerWeekSwitcher } from "../tracking/TrackerPrimitives";

function WeeklyFeedBars({
  filledWeek,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
}) {
  const maxCount = Math.max(...filledWeek.map((day) => day.count), 0);

  return (
    <div className="grid h-full grid-cols-7 items-end gap-2">
      {filledWeek.map((day) => {
        const height = day.count === 0
          ? 12
          : Math.min(58, 20 + (day.count / Math.max(maxCount, 1)) * 38);

        return (
          <div key={day.date} className="flex min-w-0 flex-col items-center justify-end gap-1.5">
            <span
              className={`text-[0.68rem] font-semibold leading-none text-[var(--color-text)] md:text-[0.74rem] ${day.count === 0 ? "opacity-0" : ""}`}
              aria-hidden={day.count === 0}
            >
              {day.count}
            </span>
            <span
              className="w-3 rounded-full shadow-[0_7px_14px_rgba(172,139,113,0.12)] transition-transform hover:scale-105"
              style={{
                height: `${height}px`,
                background: day.count === 0
                  ? "rgba(148, 158, 176, 0.22)"
                  : "linear-gradient(180deg, rgba(74, 190, 151, 0.94) 0%, rgba(168, 98, 53, 0.88) 100%)",
                opacity: day.count === 0 ? 0.72 : 1,
              }}
              title={`${day.weekdayLabel}: ${day.count} feed${day.count === 1 ? "" : "s"}`}
            />
            <span className="text-[0.66rem] font-medium leading-none text-[var(--color-text-secondary)] md:text-[0.72rem]">
              {day.weekdayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function FeedWeeklyPatternCard({
  filledWeek,
  maxWeekOffset,
  summary,
  title,
  weekOffset,
  onNewer,
  onOlder,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
  maxWeekOffset: number;
  summary: string;
  title: string;
  weekOffset: number;
  onNewer: () => void;
  onOlder: () => void;
}) {
  const hasLogs = filledWeek.some((day) => day.count > 0);

  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
              7-day pattern
            </p>
            <p className="mt-1 max-w-[42ch] text-[0.72rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.8rem]">
              {summary}
            </p>
          </div>
          <div className="shrink-0">
            <TrackerWeekSwitcher
              weekOffset={weekOffset}
              maxWeekOffset={maxWeekOffset}
              onOlder={onOlder}
              onNewer={onNewer}
            />
          </div>
        </div>

        <div className="mt-4 rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-3 md:rounded-[18px] md:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[var(--color-tracker-pill-surface)] px-2.5 py-1 text-[0.62rem] font-semibold text-[var(--color-text-secondary)] md:text-[0.7rem]">
              {title}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium text-[var(--color-text-secondary)] md:text-[0.7rem]">
              <span className="h-2 w-2 rounded-full bg-[#4abe97]" />
              Feed
            </span>
          </div>
          <div className="h-[96px] md:h-[112px]">
            {hasLogs ? (
              <WeeklyFeedBars filledWeek={filledWeek} />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.78rem] text-[var(--color-text-soft)]">
                No feed logs in this week.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
