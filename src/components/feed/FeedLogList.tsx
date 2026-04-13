import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../../lib/feeding";
import { timeSince } from "../../lib/utils";
import { InsetPanel } from "../ui/page-layout";
import { TrackerEntryRow, TrackerEntryTable } from "../tracking/TrackerPrimitives";
import type { FeedingEntry, UnitSystem } from "../../lib/types";

export function FeedLogList({
  logs,
  onEdit,
  unitSystem,
}: {
  logs: FeedingEntry[];
  onEdit: (entry: FeedingEntry) => void;
  unitSystem: UnitSystem;
}) {
  if (logs.length === 0) {
    return (
      <InsetPanel>
        <p className="text-sm text-[var(--color-text-secondary)]">No feed entries in this week.</p>
      </InsetPanel>
    );
  }

  return (
    <TrackerEntryTable mainHeader="Feed">
      {logs.map((log) => {
        const dateLabel = new Date(log.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const timeLabel = new Date(log.logged_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const detailLabel = getFeedingEntryDetailParts(log, unitSystem).join(" · ");
        const secondary = getFeedingEntrySecondaryText(log);

        return (
          <TrackerEntryRow key={log.id} onClick={() => onEdit(log)}>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">{dateLabel}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-soft)]">{timeLabel}</p>
              <p className="mt-1 text-[11px] text-[var(--color-text-soft)]">{timeSince(log.logged_at)}</p>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {getFeedingEntryPrimaryLabel(log)}
              </p>
              {detailLabel && (
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">{detailLabel}</p>
              )}
              {secondary && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{secondary}</p>
              )}
            </div>
          </TrackerEntryRow>
        );
      })}
    </TrackerEntryTable>
  );
}
