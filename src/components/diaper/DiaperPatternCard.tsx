import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getDiaperPatternTone, getStoolShortLabel, getValidDiaperTimestamp } from "../../lib/diaper-insights";
import type { DiaperEntry } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

function getPatternPosition(loggedAt: string): number | null {
  const timestamp = getValidDiaperTimestamp(loggedAt);
  if (timestamp === null) {
    return null;
  }

  const date = new Date(timestamp);
  return ((date.getHours() + date.getMinutes() / 60) / 24) * 100;
}

function formatPatternTime(loggedAt: string): string {
  const timestamp = getValidDiaperTimestamp(loggedAt);
  if (timestamp === null) {
    return "Logged";
  }

  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function DiaperPatternCard({
  patternLogs,
  selectedPatternLog,
  onToggleLog,
}: {
  patternLogs: DiaperEntry[];
  selectedPatternLog: DiaperEntry | null;
  onToggleLog: (logId: string) => void;
}) {
  const selectedPatternPosition = selectedPatternLog ? getPatternPosition(selectedPatternLog.logged_at) : null;

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
            24-hour pattern
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {(["wet", "dirty", "mixed"] as const).map((type) => {
              const tone = getDiaperPatternTone(type);
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium text-[var(--color-text-secondary)] md:text-[0.7rem]"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: tone.text }} />
                  {type[0].toUpperCase() + type.slice(1)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-0.5">
          <div className="min-w-[510px] md:min-w-0">
            <div className="relative h-[72px] rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-3 md:h-[82px] md:rounded-[18px] md:px-5">
              {patternLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[0.78rem] text-[var(--color-text-soft)]">
                  No diaper logs yet today.
                </div>
              ) : (
                <>
                  <div className="absolute inset-x-4 bottom-3 top-3 grid grid-cols-12 gap-2 md:inset-x-5">
                    {Array.from({ length: 12 }, (_, index) => (
                      <div key={index} className="rounded-[10px] bg-white/24" />
                    ))}
                  </div>
                  <div className="absolute inset-x-4 top-[18px] h-[38px] md:inset-x-5 md:top-[22px]">
                    {patternLogs.map((log) => {
                      const left = getPatternPosition(log.logged_at);
                      if (left === null) return null;
                      const tone = getDiaperPatternTone(log.diaper_type);
                      const height = log.diaper_type === "mixed" ? 26 : 32;

                      return (
                        <button
                          type="button"
                          key={log.id}
                          aria-label={`${getDiaperTypeLabel(log.diaper_type)} at ${formatPatternTime(log.logged_at)}`}
                          className="absolute top-1/2 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_7px_14px_rgba(172,139,113,0.12)] transition-transform hover:scale-110 active:scale-95"
                          onClick={() => onToggleLog(log.id)}
                          style={{
                            background: tone.text,
                            height: `${height}px`,
                            left: `${left}%`,
                          }}
                        />
                      );
                    })}
                  </div>
                  {selectedPatternLog && selectedPatternPosition !== null && (
                    <div
                      className="absolute top-2 z-10 -translate-x-1/2 rounded-[12px] border border-[var(--color-home-card-border)] bg-[var(--color-surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft)]"
                      style={{
                        left: `${selectedPatternPosition}%`,
                        width: "112px",
                        maxWidth: "112px",
                      }}
                    >
                      <p className="text-[0.72rem] font-semibold text-[var(--color-text)]">
                        {getDiaperTypeLabel(selectedPatternLog.diaper_type)}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-secondary)]">
                        {formatPatternTime(selectedPatternLog.logged_at)}
                      </p>
                      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)]">
                        {selectedPatternLog.diaper_type === "wet"
                          ? getUrineColorLabel(selectedPatternLog.urine_color) ?? "Logged"
                          : selectedPatternLog.diaper_type === "mixed"
                            ? [getUrineColorLabel(selectedPatternLog.urine_color), getStoolShortLabel(selectedPatternLog.stool_type)].filter(Boolean).join(" • ")
                            : getStoolShortLabel(selectedPatternLog.stool_type) ?? "Logged"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 grid grid-cols-5 px-0.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[var(--color-text)] md:text-[0.72rem]">
              <span>12 AM</span>
              <span className="text-center">6 AM</span>
              <span className="text-center">12 PM</span>
              <span className="text-center">6 PM</span>
              <span className="text-right">12 AM</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
