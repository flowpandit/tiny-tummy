import type { PoopEntry, DietEntry, TimelineEvent } from "../../lib/types";
import { STOOL_COLORS } from "../../lib/constants";
import { getDietEntryDisplayLabel } from "../../lib/feeding";

interface DietCorrelationProps {
  poopLogs: PoopEntry[];
  dietLogs: DietEntry[];
  days: number;
}

function buildTimeline(
  poopLogs: PoopEntry[],
  dietLogs: DietEntry[],
  days: number,
): Map<string, TimelineEvent[]> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const events: TimelineEvent[] = [];

  for (const log of poopLogs) {
    if (log.is_no_poop) continue;
    if (new Date(log.logged_at) < cutoff) continue;
    const colorInfo = log.color ? STOOL_COLORS.find((c) => c.value === log.color) : null;
    events.push({
      id: log.id,
      type: "poop",
      logged_at: log.logged_at,
      label: log.stool_type ? `Type ${log.stool_type}` : "Poop",
      color: colorInfo?.hex,
    });
  }

  for (const log of dietLogs) {
    if (new Date(log.logged_at) < cutoff) continue;
    events.push({
      id: log.id,
      type: "meal",
      logged_at: log.logged_at,
      label: getDietEntryDisplayLabel(log),
    });
  }

  events.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

  // Group by date
  const grouped = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const dateKey = event.logged_at.split("T")[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(event);
  }

  return grouped;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DietCorrelation({ poopLogs, dietLogs, days }: DietCorrelationProps) {
  const timeline = buildTimeline(poopLogs, dietLogs, days);

  if (timeline.size === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)] text-center py-8">
        Log feeds and poops to see correlations
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {[...timeline.entries()].map(([date, events]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
            {formatDateHeader(date)}
          </p>
          <div className="relative pl-5 border-l-2 border-[var(--color-border)] flex flex-col gap-2">
            {events.map((event) => (
              <div key={event.id} className="relative">
                {/* Timeline dot */}
                <div
                  className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-[var(--color-surface)]"
                  style={{
                    backgroundColor:
                      event.type === "poop"
                        ? event.color ?? "var(--color-cta)"
                        : "var(--color-primary)",
                  }}
                />
                {/* Event content */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-muted)] w-14 flex-shrink-0">
                    {formatTime(event.logged_at)}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-[var(--radius-sm)]"
                    style={{
                      backgroundColor:
                        event.type === "poop"
                          ? "var(--color-cta-bg, rgba(249, 115, 22, 0.1))"
                          : "var(--color-info-bg)",
                      color:
                        event.type === "poop"
                          ? "var(--color-cta)"
                          : "var(--color-primary)",
                    }}
                  >
                    {event.type === "poop" ? "💩" : "🍽"} {event.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
