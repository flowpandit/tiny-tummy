import type { GrowthPercentileResult } from "../../lib/growth-percentiles";
import {
  formatCompactGrowthSummary,
  formatGrowthAgeLabel,
  type GrowthMetricKey,
} from "../../lib/growth-view";
import type { GrowthEntry, UnitSystem } from "../../lib/types";
import { formatDate, timeSince } from "../../lib/utils";
import { formatGrowthValue } from "../../lib/units";
import { HomeToolGrowthIcon } from "../ui/icons";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatMetricCell({
  getPercentileMeta,
  log,
  metric,
  unitSystem,
}: {
  getPercentileMeta: (log: GrowthEntry, metric: GrowthMetricKey) => GrowthPercentileResult | null;
  log: GrowthEntry;
  metric: GrowthMetricKey;
  unitSystem: UnitSystem;
}): string {
  const rawValue = log[metric];
  if (rawValue === null) return "—";

  const percentile = getPercentileMeta(log, metric)?.percentileLabel;
  const displayValue = formatGrowthValue(metric, rawValue, unitSystem);

  return percentile ? `${displayValue} (${percentile})` : displayValue;
}

function EmptyHistory({ onAddMeasurement }: { onAddMeasurement: () => void }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] px-4 py-5 text-center">
      <p className="text-sm font-semibold text-[var(--color-text)]">No growth check-ins yet</p>
      <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-[var(--color-text-secondary)]">
        Add weight, length, head size, or whichever measures you have today.
      </p>
      <Button variant="secondary" size="sm" className="mt-3 h-8 px-3 text-xs" onClick={onAddMeasurement}>
        Add measurement
      </Button>
    </div>
  );
}

export function GrowthMeasurementHistoryCard({
  dateOfBirth,
  getPercentileMeta,
  logs,
  unitSystem,
  onAddMeasurement,
  onEditLog,
}: {
  dateOfBirth: string;
  getPercentileMeta: (log: GrowthEntry, metric: GrowthMetricKey) => GrowthPercentileResult | null;
  logs: GrowthEntry[];
  unitSystem: UnitSystem;
  onAddMeasurement: () => void;
  onEditLog: (log: GrowthEntry) => void;
}) {
  return (
    <Card
      className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[20px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4">
        <div>
          <p className="text-[1rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1.12rem]">
            Measurement history
          </p>
          <p className="mt-1 hidden text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:block md:text-[0.82rem]">
            All saved growth check-ins. You can edit anytime.
          </p>
        </div>

        <div className="mt-4">
          {logs.length === 0 ? (
            <EmptyHistory onAddMeasurement={onAddMeasurement} />
          ) : (
            <>
              <div className="space-y-0 md:hidden">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => onEditLog(log)}
                    className="grid w-full grid-cols-[auto_92px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-home-card-border)] py-3 text-left last:border-b-0"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-tracker-panel-strong)] text-[var(--color-cta)]">
                      <HomeToolGrowthIcon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-[var(--color-text)]">
                        {formatDate(log.measured_at)}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.68rem] text-[var(--color-text-soft)]">
                        {timeSince(log.measured_at)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                        {formatCompactGrowthSummary(log, unitSystem)}
                      </span>
                    </span>
                    <span className="text-lg text-[var(--color-text-soft)]" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[16px] border border-[var(--color-home-card-border)] md:block">
                <table className="w-full table-fixed border-collapse text-left text-[0.78rem]">
                  <thead>
                    <tr className="bg-[var(--color-tracker-panel-surface)] text-[0.68rem] font-semibold text-[var(--color-text-secondary)]">
                      <th className="w-[19%] px-3 py-2.5">Date & time</th>
                      <th className="w-[12%] px-3 py-2.5">Age</th>
                      <th className="w-[17%] px-3 py-2.5">Weight</th>
                      <th className="w-[17%] px-3 py-2.5">Length</th>
                      <th className="w-[17%] px-3 py-2.5">Head</th>
                      <th className="px-3 py-2.5">Notes</th>
                      <th className="w-[72px] px-3 py-2.5 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-t border-[var(--color-home-card-border)]">
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-[var(--color-text)]">{formatDate(log.measured_at)}, {formatTime(log.measured_at)}</p>
                          <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-soft)]">{timeSince(log.measured_at)}</p>
                        </td>
                        <td className="px-3 py-3 align-top text-[var(--color-text)]">{formatGrowthAgeLabel(dateOfBirth, log.measured_at)}</td>
                        <td className="px-3 py-3 align-top text-[var(--color-text)]">{formatMetricCell({ getPercentileMeta, log, metric: "weight_kg", unitSystem })}</td>
                        <td className="px-3 py-3 align-top text-[var(--color-text)]">{formatMetricCell({ getPercentileMeta, log, metric: "height_cm", unitSystem })}</td>
                        <td className="px-3 py-3 align-top text-[var(--color-text)]">{formatMetricCell({ getPercentileMeta, log, metric: "head_circumference_cm", unitSystem })}</td>
                        <td className="px-3 py-3 align-top text-[var(--color-text-secondary)]">{log.notes || "—"}</td>
                        <td className="px-3 py-3 align-top text-right">
                          <Button variant="secondary" size="sm" className="h-7 px-3 text-[0.68rem]" onClick={() => onEditLog(log)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
