import { useMemo, useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { PageIntro } from "../components/ui/page-intro";
import { EmptyState, InsetPanel, PageBody, SectionHeading, StatGrid, StatTile } from "../components/ui/page-layout";
import { SleepLogSheet } from "../components/sleep/SleepLogSheet";
import { SleepDurationChart } from "../components/sleep/SleepDurationChart";
import { SleepPatternTimeline } from "../components/sleep/SleepPatternTimeline";
import { getAgeLabelFromDob, formatDate, timeSince } from "../lib/utils";
import type { SleepEntry } from "../lib/types";

function getDurationMinutes(entry: SleepEntry): number {
  return Math.max(0, Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000));
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getSleepTypeLabel(value: SleepEntry["sleep_type"]): string {
  return value === "night" ? "Night" : "Nap";
}

function toDayKey(dateStr: string): string {
  return dateStr.split("T")[0];
}

export function Sleep() {
  const { activeChild } = useChildContext();
  const { logs, refresh } = useSleepLogs(activeChild?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const todayKey = getTodayKey();

  const todayLogs = useMemo(
    () => logs.filter((log) => log.started_at.startsWith(todayKey)),
    [logs, todayKey],
  );
  const totalTodayMinutes = todayLogs.reduce((sum, log) => sum + getDurationMinutes(log), 0);
  const napMinutes = todayLogs
    .filter((log) => log.sleep_type === "nap")
    .reduce((sum, log) => sum + getDurationMinutes(log), 0);
  const nightMinutes = todayLogs
    .filter((log) => log.sleep_type === "night")
    .reduce((sum, log) => sum + getDurationMinutes(log), 0);
  const latestLog = logs[0] ?? null;
  const patternDayKey = todayLogs.length > 0 ? todayKey : (latestLog ? toDayKey(latestLog.started_at) : todayKey);
  const patternLogs = logs.filter((log) => toDayKey(log.started_at) === patternDayKey);
  const patternLabel = patternDayKey === todayKey
    ? "Today"
    : `Latest logged day · ${new Date(`${patternDayKey}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  if (!activeChild) return null;

  return (
    <PageBody>
      <PageIntro
        eyebrow="Tracking"
        title="Sleep"
        description="Keep naps and night sleep in view without turning Tiny Tummy into a sleep coaching app."
        meta={`${activeChild.name} · ${getAgeLabelFromDob(activeChild.date_of_birth)}${latestLog ? ` · last sleep ${timeSince(latestLog.started_at)}` : ""}`}
        action={<Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>Add</Button>}
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
            </svg>
          )}
          title="Start with a simple sleep log"
          description="Track nap and night sleep blocks only. No wake windows, no predictions, no coaching."
          action={(
            <Button variant="primary" onClick={() => setSheetOpen(true)}>
              Add first sleep log
            </Button>
          )}
        />
      ) : (
        <>
          <StatGrid>
            <StatTile
              eyebrow="Today total"
              value={formatDuration(totalTodayMinutes)}
              description="All sleep logs started today."
              tone="info"
            />
            <StatTile
              eyebrow="Naps today"
              value={formatDuration(napMinutes)}
              description={`${todayLogs.filter((log) => log.sleep_type === "nap").length} nap logs`}
              tone="cta"
            />
            <StatTile
              eyebrow="Night sleep today"
              value={formatDuration(nightMinutes)}
              description={`${todayLogs.filter((log) => log.sleep_type === "night").length} night logs`}
              tone="healthy"
            />
          </StatGrid>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Daily pattern"
                description="A simple view of how sleep blocks were spaced through the day."
              />
            </CardHeader>
            <CardContent>
              <SleepPatternTimeline logs={patternLogs} dayLabel={patternLabel} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Recent totals"
                description="A seven-day view of logged sleep time."
                action={(
                  <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                    Add sleep
                  </Button>
                )}
              />
            </CardHeader>
            <CardContent>
              <SleepDurationChart logs={logs} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                title="Recent sleep logs"
                description="Start, end, duration, and optional notes for quick day context."
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {logs.map((log) => (
                  <InsetPanel key={log.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {formatDate(log.started_at)} to {formatDate(log.ended_at)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                          {timeSince(log.started_at)} · {formatDuration(getDurationMinutes(log))}
                        </p>
                      </div>
                      <Badge variant={log.sleep_type === "night" ? "info" : "default"}>
                        {getSleepTypeLabel(log.sleep_type)}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {log.notes}
                      </p>
                    )}
                  </InsetPanel>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <SleepLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childId={activeChild.id}
        onLogged={refresh}
      />
    </PageBody>
  );
}
