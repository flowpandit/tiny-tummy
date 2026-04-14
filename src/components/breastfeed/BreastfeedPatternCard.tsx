import { getBreastPatternLabel, getBreastPatternTone } from "../../lib/breastfeed-insights";
import type { FeedingEntry } from "../../lib/types";

export function BreastfeedPatternCard({
  patternLogs,
  selectedPatternLog,
  onToggleLog,
}: {
  patternLogs: FeedingEntry[];
  selectedPatternLog: FeedingEntry | null;
  onToggleLog: (logId: string) => void;
}) {
  return (
    <section className="px-1">
      <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <p className="text-[0.9rem] font-semibold text-[var(--color-text)]">24-hour pattern</p>
        <div className="mt-2.5 overflow-x-auto pb-1">
          <div className="w-[520px] min-w-full">
            <div className="space-y-2">
              <div className="relative h-[92px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-2.5 py-2.5">
                {patternLogs.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border)] text-[0.86rem] text-[var(--color-text-soft)]">
                    No breastfeeding logs yet
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-24 gap-1.5">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div key={hour} className="h-[64px] rounded-[8px] bg-[var(--color-bg-elevated)]/32" />
                      ))}
                    </div>
                    <div className="absolute inset-x-2.5 top-[14px] space-y-[8px]">
                      {(["left", "right", "both"] as const).map((side) => (
                        <div key={side} className="relative h-4.5">
                          {patternLogs.filter((log) => log.breast_side === side).map((log) => {
                            const loggedAt = new Date(log.logged_at);
                            const left = ((loggedAt.getHours() + loggedAt.getMinutes() / 60) / 24) * 100;
                            const durationMinutes = Math.max(log.duration_minutes ?? 0, 1);
                            const widthPercent = Math.max((durationMinutes / (24 * 60)) * 100, 1.4);
                            const tone = getBreastPatternTone(log.breast_side);
                            return (
                              <button
                                type="button"
                                key={log.id}
                                aria-label={`${getBreastPatternLabel(log.breast_side)} feed at ${loggedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} for ${durationMinutes} minutes`}
                                className="absolute top-0 h-4.5 rounded-[6px] border shadow-[var(--shadow-soft)]"
                                onClick={() => onToggleLog(log.id)}
                                style={{
                                  left: `${left}%`,
                                  width: `${widthPercent}%`,
                                  minWidth: durationMinutes < 8 ? "16px" : "20px",
                                  maxWidth: "96px",
                                  background: tone.bg,
                                  borderColor: tone.border,
                                }}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {selectedPatternLog && (
                      <div
                        className="absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft)]"
                        style={{
                          left: `${((new Date(selectedPatternLog.logged_at).getHours() + new Date(selectedPatternLog.logged_at).getMinutes() / 60) / 24) * 100}%`,
                          width: "132px",
                          maxWidth: "132px",
                        }}
                      >
                        <p className="text-[0.72rem] font-semibold text-[var(--color-text)]">{getBreastPatternLabel(selectedPatternLog.breast_side)} feed</p>
                        <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-secondary)]">
                          {new Date(selectedPatternLog.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)]">
                          {selectedPatternLog.duration_minutes ? `${selectedPatternLog.duration_minutes} min` : "Logged"}
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
          {(["left", "right", "both"] as const).map((side) => {
            const tone = getBreastPatternTone(side);
            return (
              <span
                key={side}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.75 text-[10px] font-medium"
                style={{ borderColor: tone.border, color: tone.text, background: tone.bg }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: tone.bg }} />
                {getBreastPatternLabel(side)}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
