import { Button } from "../ui/button";
import { TrackerMetricRing } from "../tracking/TrackerPrimitives";
import { TimeSinceIndicator } from "../tracking/TimeSinceIndicator";
import { cn } from "../../lib/cn";
import { buildSleepPatternPreviewSegments, buildSleepWeekPreviewBars } from "../../lib/sleep-view-model";
import type { HealthStatus } from "../../lib/types";

function RhythmDetailCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "healthy" | "info" | "cta";
}) {
  const toneClassName = tone === "healthy"
    ? "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]"
    : tone === "info"
      ? "border-[var(--color-info)]/18 bg-[var(--color-info-bg)] text-[var(--color-info)]"
      : "border-[var(--color-cta)]/18 bg-[var(--color-surface-tint)] text-[var(--color-cta)]";

  return (
    <div
      className={cn(
        "rounded-[28px] border px-4 py-4 shadow-[var(--shadow-soft)]",
        tone === "healthy" && "border-[color-mix(in_srgb,var(--color-healthy)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-healthy-bg)_78%,var(--color-surface-strong))]",
        tone === "info" && "border-[color-mix(in_srgb,var(--color-info)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-info-bg)_78%,var(--color-surface-strong))]",
        tone === "cta" && "border-[color-mix(in_srgb,var(--color-cta)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-tint)_82%,var(--color-surface-strong))]",
      )}
    >
      <div className="flex items-center gap-3.5">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border", toneClassName)}>
          {label === "Wake baseline" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 2" />
              <circle cx="12" cy="12" r="7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-[1.2rem] w-[1.2rem]" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75 19.5 7v5.25c0 4.25-2.9 7.77-7.5 8.99-4.6-1.22-7.5-4.74-7.5-8.99V7L12 3.75Z" />
            </svg>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[1.02rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)]">{label}</p>
          <p className="mt-1 text-[1.28rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)]">{value}</p>
          <p className="mt-1 text-[0.92rem] leading-tight text-[var(--color-text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

function CompactDayPatternCard({
  logs,
  label,
}: {
  logs: Array<{ id: string; left: string; width: string; color: string }>;
  label: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-strong)] px-4 py-3">
      <p className="text-sm font-semibold text-[var(--color-text)]">Daily Pattern</p>
      <div className="mt-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/70 p-3">
        <div className="relative h-10 rounded-[10px] bg-[var(--color-bg)]/55">
          <div className="absolute inset-y-1 left-1/4 w-px bg-[var(--color-border)]/80" />
          <div className="absolute inset-y-1 left-1/2 w-px bg-[var(--color-border)]/80" />
          <div className="absolute inset-y-1 left-3/4 w-px bg-[var(--color-border)]/80" />
          {logs.length === 0 ? (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-text-soft)]">No data yet</span>
          ) : (
            logs.map((segment) => (
              <span
                key={segment.id}
                className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-[5px]"
                style={{ left: segment.left, width: segment.width, backgroundColor: segment.color }}
              />
            ))
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
          <span>Day</span>
          <span>12 PM</span>
          <span>Late</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

function CompactWeekPatternCard({
  bars,
  title,
  summary,
}: {
  bars: Array<{ date: string; height: string; opacity: number; weekdayLabel: string }>;
  title: string;
  summary: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-strong)] px-4 py-3">
      <p className="text-sm font-semibold text-[var(--color-text)]">Weekly Pattern</p>
      <div className="mt-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/70 p-3">
        <div className="flex h-10 items-end gap-1.5">
          {bars.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="w-full rounded-t-[5px] bg-[linear-gradient(180deg,var(--color-info)_0%,var(--color-primary)_100%)]"
                style={{ height: day.height, opacity: day.opacity }}
              />
              <span className="text-[8px] uppercase tracking-[0.06em] text-[var(--color-text-soft)]">{day.weekdayLabel}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-soft)]">{summary}</p>
    </div>
  );
}

export function SleepOverviewBoard({
  lastNapTimestamp,
  lastNapLabel,
  statusTone,
  predictionRing,
  todayDurationRing,
  timerSessionSummary,
  activePanel,
  onChangePanel,
  wakeBaseline,
  wakeComparison,
  wakeRisk,
  patternLogs,
  patternLabel,
  filledWeek,
  weekTitle,
  weekSummary,
  onOpenSleepSheet,
}: {
  lastNapTimestamp: string | null;
  lastNapLabel: string;
  statusTone: HealthStatus;
  predictionRing: { value: string; unit: string; gradient: string };
  todayDurationRing: { value: string; unit: string };
  timerSessionSummary: null | { label: string; clock: string; summary: string };
  activePanel: "rhythm" | "patterns";
  onChangePanel: (panel: "rhythm" | "patterns") => void;
  wakeBaseline: string;
  wakeComparison: { label: string; tone: "healthy" | "info" | "cta" };
  wakeRisk: { label: string; description: string; tone: "healthy" | "info" | "cta" };
  patternLogs: import("../../lib/types").SleepEntry[];
  patternLabel: string;
  filledWeek: Array<{ date: string; count: number; weekdayLabel: string }>;
  weekTitle: string;
  weekSummary: string;
  onOpenSleepSheet: () => void;
}) {
  const patternSegments = buildSleepPatternPreviewSegments(patternLogs);
  const weekBars = buildSleepWeekPreviewBars(filledWeek);

  return (
    <section
      className="-mt-32 relative z-10 overflow-hidden rounded-[32px] border border-[var(--color-border)] px-4 py-4 shadow-[var(--shadow-lg)] md:px-5"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-surface-strong) 94%, transparent) 0%, color-mix(in srgb, var(--color-bg-elevated) 92%, transparent) 68%, color-mix(in srgb, var(--color-bg) 88%, transparent) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-cta) 14%, transparent) 0%, transparent 62%)",
        }}
      />

      <div className="relative space-y-4">
        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <TimeSinceIndicator timestamp={lastNapTimestamp} status={statusTone} />
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{lastNapLabel}</p>
          </div>
          <TrackerMetricRing
            value={predictionRing.value}
            unit={predictionRing.unit}
            label="Next predicted"
            gradient={predictionRing.gradient}
          />
          <TrackerMetricRing
            value={todayDurationRing.value}
            unit={todayDurationRing.unit}
            label="Total sleep"
            gradient={todayDurationRing.value !== "0" ? "var(--gradient-status-healthy)" : "var(--gradient-status-unknown)"}
          />
        </div>

        {timerSessionSummary && (
          <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/55 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
                  {timerSessionSummary.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
                  {timerSessionSummary.clock}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {timerSessionSummary.summary}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={onOpenSleepSheet}>
                Open timer
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-7 border-b border-[var(--color-border)]/80 px-1">
          {[
            { key: "rhythm", label: "Current Rhythm" },
            { key: "patterns", label: "Patterns" },
          ].map((item) => {
            const active = activePanel === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangePanel(item.key as "rhythm" | "patterns")}
                className={cn(
                  "border-b-2 px-0 pb-2 pt-1 text-sm font-semibold transition-colors",
                  active
                    ? "border-[var(--color-cta)] text-[var(--color-text)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {activePanel === "rhythm" ? (
          <div className="rounded-[28px] border border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-elevated)_88%,var(--color-surface-strong))] px-3 py-3 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <RhythmDetailCard
                label="Wake baseline"
                value={wakeBaseline}
                description={wakeComparison.label}
                tone={wakeComparison.tone}
              />
              <RhythmDetailCard
                label="Due risk"
                value={wakeRisk.label}
                description={wakeRisk.description}
                tone={wakeRisk.tone}
              />
            </div>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-[var(--color-text-soft)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--color-text-secondary)]"
            >
              Read more: What this means & how to interpret
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <CompactDayPatternCard logs={patternSegments} label={patternLogs.length === 0 ? "No data yet" : patternLabel} />
            <CompactWeekPatternCard bars={weekBars} title={weekTitle} summary={weekSummary} />
          </div>
        )}
      </div>
    </section>
  );
}
