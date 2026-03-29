import { useMemo, useState } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
    <div className="px-4 py-5">
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Tracking</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              Sleep
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
              Keep naps and night sleep in view without turning Tiny Tummy into a sleep coaching app.
            </p>
          </div>
          <Button variant="cta" size="sm" onClick={() => setSheetOpen(true)}>
            Add
          </Button>
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-soft)]">
          {activeChild.name} · {getAgeLabelFromDob(activeChild.date_of_birth)}
          {latestLog ? ` · last sleep ${timeSince(latestLog.started_at)}` : ""}
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
              </svg>
            </div>
            <p className="mt-4 text-xl font-semibold text-[var(--color-text)]">Start with a simple sleep log</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Track nap and night sleep blocks only. No wake windows, no predictions, no coaching.
            </p>
            <Button variant="primary" className="mt-5" onClick={() => setSheetOpen(true)}>
              Add first sleep log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-[var(--color-info)]/20 bg-[var(--color-info-bg)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Today total</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{formatDuration(totalTodayMinutes)}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">All sleep logs started today.</p>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-peach)] bg-[var(--color-surface-tint)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Naps today</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{formatDuration(napMinutes)}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{todayLogs.filter((log) => log.sleep_type === "nap").length} nap logs</p>
              </CardContent>
            </Card>
            <Card className="border-[var(--color-mint)] bg-[var(--color-healthy-bg)]">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Night sleep today</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{formatDuration(nightMinutes)}</p>
                <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{todayLogs.filter((log) => log.sleep_type === "night").length} night logs</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Daily pattern</CardTitle>
              <p className="text-xs text-[var(--color-text-secondary)]">
                A simple view of how sleep blocks were spaced through the day.
              </p>
            </CardHeader>
            <CardContent>
              <SleepPatternTimeline logs={patternLogs} dayLabel={patternLabel} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Recent totals</CardTitle>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    A seven-day view of logged sleep time.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>
                  Add sleep
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SleepDurationChart logs={logs} />
            </CardContent>
          </Card>

          <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent sleep logs</CardTitle>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Start, end, duration, and optional notes for quick day context.
                </p>
              </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
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
                  </div>
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
    </div>
  );
}
