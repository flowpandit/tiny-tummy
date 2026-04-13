import { timeSince } from "../../lib/utils";
import { formatSleepDuration, getDurationMinutes, getSleepTypeLabel } from "../../lib/sleep-insights";
import { InsetPanel } from "../ui/page-layout";
import { TrackerEntryRow, TrackerEntryTable } from "../tracking/TrackerPrimitives";
import type { SleepEntry } from "../../lib/types";

export function SleepLogList({
  logs,
  onEdit,
}: {
  logs: SleepEntry[];
  onEdit: (entry: SleepEntry) => void;
}) {
  if (logs.length === 0) {
    return (
      <InsetPanel>
        <p className="text-sm text-[var(--color-text-secondary)]">No sleep entries in this week.</p>
      </InsetPanel>
    );
  }

  return (
    <TrackerEntryTable mainHeader="Sleep block">
      {logs.map((log) => (
        <TrackerEntryRow key={log.id} onClick={() => onEdit(log)}>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {new Date(log.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">
              {new Date(log.started_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.started_at)}</p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {getSleepTypeLabel(log.sleep_type)} · {formatSleepDuration(getDurationMinutes(log))}
              </p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                {getSleepTypeLabel(log.sleep_type)}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
              {new Date(log.started_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - {new Date(log.ended_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
            {log.notes && (
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{log.notes}</p>
            )}
          </div>
        </TrackerEntryRow>
      ))}
    </TrackerEntryTable>
  );
}
