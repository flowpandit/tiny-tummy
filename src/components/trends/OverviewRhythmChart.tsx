import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { OverviewRow } from "../../lib/trends";
import { cn } from "../../lib/cn";

function getEventClassName(kind: "feed" | "sleep" | "diaper" | "poop") {
  if (kind === "sleep") return "bg-[var(--color-info)]/20 border border-[var(--color-info)]/35";
  if (kind === "feed") return "bg-[var(--color-cta)]";
  if (kind === "poop") return "bg-[var(--color-primary)]";
  return "bg-[var(--color-text-soft)]";
}

function getLegendDotClassName(kind: "feed" | "sleep" | "diaper" | "poop") {
  if (kind === "sleep") return "border border-[var(--color-info)]/45 bg-[var(--color-info)]/18";
  if (kind === "feed") return "bg-[var(--color-cta)]";
  if (kind === "poop") return "bg-[var(--color-primary)]";
  return "bg-[var(--color-text-soft)]";
}

export function OverviewRhythmChart({ rows }: { rows: OverviewRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily rhythm</CardTitle>
        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Feeds, sleep blocks, diapers, and stool timing layered into one weekly view.
        </p>
      </CardHeader>
      <CardContent className="space-y-4" data-no-page-swipe="true">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/60 p-3">
          <div className="ml-14 grid grid-cols-6 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
            <span>12a</span>
            <span>4a</span>
            <span>8a</span>
            <span>12p</span>
            <span>4p</span>
            <span className="text-right">8p</span>
          </div>
          <div className="mt-2 space-y-2">
            {rows.map((row) => (
              <div key={row.dayKey} className="flex items-center gap-3">
                <div className="w-11 shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
                  {row.label}
                </div>
                <div className="relative h-10 flex-1 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="border-r border-[var(--color-border)] last:border-r-0" />
                    ))}
                  </div>
                  {row.events.map((event) => {
                    const left = `${(event.startHour / 24) * 100}%`;
                    const width = event.endHour
                      ? `${Math.max(((event.endHour - event.startHour) / 24) * 100, 2.8)}%`
                      : undefined;

                    return (
                      <span
                        key={event.id}
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2",
                          event.endHour ? "h-4 rounded-full" : "h-2.5 w-2.5 rounded-full",
                          getEventClassName(event.kind),
                        )}
                        style={{
                          left,
                          width,
                          marginLeft: event.endHour ? 0 : "-4px",
                        }}
                        title={event.kind}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
          {[
            { kind: "feed" as const, label: "Feed" },
            { kind: "sleep" as const, label: "Sleep" },
            { kind: "diaper" as const, label: "Diaper" },
            { kind: "poop" as const, label: "Poop" },
          ].map((item) => (
            <span key={item.kind} className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", getLegendDotClassName(item.kind))} />
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
