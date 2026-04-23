import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getDiaperPatternTone, getStoolShortLabel, getValidDiaperTimestamp } from "../../lib/diaper-insights";
import type { DiaperEntry } from "../../lib/types";

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
    <section className="px-1">
      <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.92rem] font-semibold text-[var(--color-text)]">24-hour pattern</p>
          </div>
        </div>

        <div className="mt-2.5 overflow-x-auto pb-1">
          <div className="w-[520px] min-w-full">
            <div className="space-y-2">
              <div className="relative h-[92px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-2.5 py-2.5">
                {patternLogs.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border)] text-[0.86rem] text-[var(--color-text-soft)]">
                    No data yet
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-24 gap-1.5">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div key={hour} className="h-[64px] rounded-[8px] bg-[var(--color-bg-elevated)]/32" />
                      ))}
                    </div>
                    <div className="absolute inset-x-2.5 top-[14px] space-y-[8px]">
                      {(["wet", "dirty", "mixed"] as const).map((type) => (
                        <div key={type} className="relative h-4.5">
                          {patternLogs
                            .filter((log) => log.diaper_type === type)
                            .map((log) => {
                              const left = getPatternPosition(log.logged_at);
                              if (left === null) {
                                return null;
                              }
                              const tone = getDiaperPatternTone(type);
                              return (
                                <button
                                  type="button"
                                  key={log.id}
                                  aria-label={`${getDiaperTypeLabel(log.diaper_type)} at ${formatPatternTime(log.logged_at)}`}
                                  className="absolute top-0 h-4.5 -translate-x-1/2 rounded-[6px] border shadow-[var(--shadow-soft)]"
                                  onClick={() => onToggleLog(log.id)}
                                  style={{
                                    left: `${left}%`,
                                    width: log.diaper_type === "mixed" ? "28px" : "22px",
                                    background: tone.bg,
                                    borderColor: tone.border,
                                  }}
                                />
                              );
                            })}
                        </div>
                      ))}
                    </div>
                    {selectedPatternLog && selectedPatternPosition !== null && (
                      <div
                        className="absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft)]"
                        style={{
                          left: `${selectedPatternPosition}%`,
                          width: "100px",
                          maxWidth: "100px",
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

              <div className="grid grid-cols-5 px-0.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                <span>12A</span>
                <span className="text-center">6A</span>
                <span className="text-center">12P</span>
                <span className="text-center">6P</span>
                <span className="text-right">11:59P</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {(["wet", "dirty", "mixed"] as const).map((type) => {
            const tone = getDiaperPatternTone(type);
            return (
              <span
                key={type}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.75 text-[10px] font-medium"
                style={{ borderColor: tone.border, color: tone.text, background: tone.bg }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: tone.bg }} />
                {getDiaperTypeLabel(type)}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
