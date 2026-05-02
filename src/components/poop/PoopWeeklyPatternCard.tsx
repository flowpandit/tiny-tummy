import { Card, CardContent } from "../ui/card";

function WeeklyPatternDots({
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
                  : "linear-gradient(180deg, rgba(186, 117, 63, 0.92) 0%, rgba(126, 78, 43, 0.92) 100%)",
                opacity: day.count === 0 ? 0.72 : 1,
              }}
              title={`${day.weekdayLabel}: ${day.count} ${day.count === 1 ? "poop" : "poops"}`}
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

export function PoopWeeklyPatternCard({
  filledWeek,
  todayPoopCount,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
  todayPoopCount: number;
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
            7-day pattern
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/62 px-2.5 py-1 text-[0.62rem] font-semibold text-[var(--color-text-secondary)] md:text-[0.7rem]">
              {todayPoopCount} today
            </span>
            <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium text-[var(--color-text-secondary)] md:text-[0.7rem]">
              <span className="h-2 w-2 rounded-full bg-[#a86235]" />
              Poop
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-3 md:rounded-[18px] md:px-5">
          <div className="h-[96px] md:h-[112px]">
            {hasLogs ? (
              <WeeklyPatternDots filledWeek={filledWeek} />
            ) : (
              <div className="flex h-full items-center justify-center text-[0.78rem] text-[var(--color-text-soft)]">
                No poop logs in the last 7 days.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
