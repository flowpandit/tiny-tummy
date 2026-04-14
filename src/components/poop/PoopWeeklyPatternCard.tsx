function WeeklyPatternDots({
  filledWeek,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {filledWeek.map((day) => {
        const slots = [2, 1, 0];
        return (
          <div key={day.date} className="flex min-w-[22px] flex-col items-center gap-0.5">
            <div className="flex h-[46px] flex-col justify-end gap-1">
              {slots.map((slot) => {
                const active = day.count > slot;
                const isBar = day.count >= 3 && slot === 0;
                return (
                  <span
                    key={`${day.date}-${slot}`}
                    className={isBar ? "h-8 w-2.5 rounded-full" : "h-2.5 w-2.5 rounded-full"}
                    style={{
                      background: !active
                        ? "rgba(148, 158, 176, 0.22)"
                        : slot === 2
                          ? "rgba(236, 112, 89, 0.92)"
                          : slot === 1
                            ? "rgba(104, 205, 110, 0.9)"
                            : "rgba(245, 171, 82, 0.95)",
                    }}
                  />
                );
              })}
            </div>
            <span className="mt-1 text-[0.66rem] leading-none text-[var(--color-text-secondary)]">{day.weekdayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PoopWeeklyPatternCard({
  filledWeek,
}: {
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
}) {
  return (
    <div className="px-1">
      <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="flex min-h-[74px] items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-medium uppercase leading-[1.15] tracking-[0.1em] text-[var(--color-text-soft)]">
              Weekly
              <br />
              Pattern
            </p>
            <p className="mt-1 text-[0.72rem] leading-none text-[var(--color-text-secondary)]">Last 7 days</p>
          </div>
          <div className="flex-shrink-0">
            <WeeklyPatternDots filledWeek={filledWeek} />
          </div>
        </div>
      </div>
    </div>
  );
}
