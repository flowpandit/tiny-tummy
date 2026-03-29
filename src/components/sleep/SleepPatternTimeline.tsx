import type { SleepEntry } from "../../lib/types";

interface SleepPatternTimelineProps {
  logs: SleepEntry[];
  dayLabel: string;
}

function getMinutesFromIso(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getHours() * 60 + date.getMinutes();
}

function formatTimeLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function SleepPatternTimeline({ logs, dayLabel }: SleepPatternTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
        No sleep blocks for this day yet.
      </div>
    );
  }

  const segments = [...logs]
    .sort((left, right) => new Date(left.started_at).getTime() - new Date(right.started_at).getTime())
    .map((log) => {
      const startMinutes = Math.max(0, getMinutesFromIso(log.started_at));
      const endMinutes = Math.min(1440, getMinutesFromIso(log.ended_at) || 1440);
      const durationMinutes = Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000));
      return {
        ...log,
        startMinutes,
        endMinutes: Math.max(startMinutes + 10, endMinutes),
        durationMinutes,
      };
    });

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--color-text)]">{dayLabel}</p>
        <p className="text-xs text-[var(--color-text-soft)]">12a to 12a</p>
      </div>

      <div className="relative mt-4 h-12 rounded-full bg-[var(--color-surface)]">
        <div className="absolute inset-y-2 left-1/4 w-px bg-[var(--color-border)]" />
        <div className="absolute inset-y-2 left-1/2 w-px bg-[var(--color-border)]" />
        <div className="absolute inset-y-2 left-3/4 w-px bg-[var(--color-border)]" />

        {segments.map((segment) => {
          const left = `${(segment.startMinutes / 1440) * 100}%`;
          const width = `${Math.max(((segment.endMinutes - segment.startMinutes) / 1440) * 100, 4)}%`;
          const className = segment.sleep_type === "night"
            ? "bg-[var(--color-info)]/85"
            : "bg-[var(--color-cta)]/85";

          return (
            <div
              key={segment.id}
              className={`absolute top-1/2 h-7 -translate-y-1/2 rounded-full border border-white/50 shadow-[var(--shadow-soft)] ${className}`}
              style={{ left, width }}
              title={`${formatTimeLabel(segment.started_at)} to ${formatTimeLabel(segment.ended_at)}`}
            />
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-4 text-[11px] text-[var(--color-text-soft)]">
        <span>12a</span>
        <span className="text-center">6a</span>
        <span className="text-center">12p</span>
        <span className="text-right">6p</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {segment.sleep_type === "night" ? "Night sleep" : "Nap"}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {formatTimeLabel(segment.started_at)} to {formatTimeLabel(segment.ended_at)}
              </p>
            </div>
            <p className="text-xs font-medium text-[var(--color-text-soft)]">
              {formatDurationMinutes(segment.durationMinutes)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
