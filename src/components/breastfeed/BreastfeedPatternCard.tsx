import {
  type BreastfeedPatternKind,
  getBreastfeedContextHistorySummary,
  getBreastfeedContextHistoryTitle,
  getBreastfeedPatternKind,
  getBreastfeedPatternLabel,
  getBreastfeedPatternTone,
} from "../../lib/breastfeed-insights";
import type { FeedingEntry, UnitSystem } from "../../lib/types";
import { Card, CardContent } from "../ui/card";

const PATTERN_KINDS: BreastfeedPatternKind[] = ["left", "right", "both", "bottle", "other"];

function getPatternPosition(loggedAt: string): number | null {
  const timestamp = new Date(loggedAt);
  const time = timestamp.getTime();
  if (!Number.isFinite(time)) return null;
  return ((timestamp.getHours() + timestamp.getMinutes() / 60) / 24) * 100;
}

function getPatternWidth(log: FeedingEntry): number {
  const durationMinutes = Math.max(log.duration_minutes ?? 0, 0);
  if (durationMinutes <= 0) return 1.4;
  return Math.max((durationMinutes / (24 * 60)) * 100, 1.4);
}

export function BreastfeedPatternCard({
  patternLogs,
  selectedPatternLog,
  unitSystem,
  onToggleLog,
}: {
  patternLogs: FeedingEntry[];
  selectedPatternLog: FeedingEntry | null;
  unitSystem: UnitSystem;
  onToggleLog: (logId: string) => void;
}) {
  const selectedPatternPosition = selectedPatternLog ? getPatternPosition(selectedPatternLog.logged_at) : null;
  const selectedPatternKind = selectedPatternLog ? getBreastfeedPatternKind(selectedPatternLog) : null;

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
            {PATTERN_KINDS.map((kind) => {
              const tone = getBreastfeedPatternTone(kind);
              return (
                <span
                  key={kind}
                  className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium text-[var(--color-text-secondary)] md:text-[0.7rem]"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: tone.text }} />
                  {getBreastfeedPatternLabel(kind)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-0.5">
          <div className="w-[520px] min-w-full">
            <div className="space-y-2">
              <div className="relative h-[120px] rounded-[16px] bg-[var(--color-home-empty-surface)] px-2.5 py-2.5 md:rounded-[18px]">
                {patternLogs.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[0.78rem] text-[var(--color-text-soft)]">
                    No feeds logged in the last 24 hours.
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-x-2.5 top-2.5 grid grid-cols-24 gap-1.5">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div key={hour} className="h-[92px] rounded-[8px] bg-[var(--color-tracker-chart-guide)]" />
                      ))}
                    </div>
                    <div className="absolute inset-x-2.5 top-[14px] space-y-[6px]">
                      {PATTERN_KINDS.map((kind) => (
                        <div key={kind} className="relative h-3.5">
                          {patternLogs.filter((log) => getBreastfeedPatternKind(log) === kind).map((log) => {
                            const left = getPatternPosition(log.logged_at);
                            if (left === null) return null;
                            const loggedAt = new Date(log.logged_at);
                            const durationMinutes = Math.max(log.duration_minutes ?? 0, 0);
                            const widthPercent = getPatternWidth(log);
                            const tone = getBreastfeedPatternTone(kind);
                            const detail = getBreastfeedContextHistorySummary(log, unitSystem);
                            return (
                              <button
                                type="button"
                                key={log.id}
                                aria-label={`${getBreastfeedContextHistoryTitle(log)} at ${loggedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${detail ? `, ${detail}` : ""}`}
                                className="absolute top-0 h-3.5 rounded-[6px] border shadow-[var(--shadow-soft)]"
                                onClick={() => onToggleLog(log.id)}
                                style={{
                                  left: `${left}%`,
                                  width: `${widthPercent}%`,
                                  minWidth: durationMinutes > 0 && durationMinutes >= 8 ? "20px" : "16px",
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
                    {selectedPatternLog && selectedPatternPosition !== null && selectedPatternKind && (
                      <div
                        className="absolute top-2 z-10 -translate-x-1/2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-left shadow-[var(--shadow-soft)]"
                        style={{
                          left: `${selectedPatternPosition}%`,
                          width: "132px",
                          maxWidth: "132px",
                        }}
                      >
                        <p className="text-[0.72rem] font-semibold text-[var(--color-text)]">
                          {selectedPatternKind === "left" || selectedPatternKind === "right" || selectedPatternKind === "both"
                            ? `${getBreastfeedPatternLabel(selectedPatternKind)} feed`
                            : getBreastfeedContextHistoryTitle(selectedPatternLog)}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-secondary)]">
                          {new Date(selectedPatternLog.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)]">
                          {getBreastfeedContextHistorySummary(selectedPatternLog, unitSystem)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-5 px-0.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[var(--color-text)] md:text-[0.72rem]">
                <span>12 AM</span>
                <span className="text-center">6 AM</span>
                <span className="text-center">12 PM</span>
                <span className="text-center">6 PM</span>
                <span className="text-right">12 AM</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
