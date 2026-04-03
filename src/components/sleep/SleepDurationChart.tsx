import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatLocalDateKey } from "../../lib/utils";
import type { SleepEntry } from "../../lib/types";

interface SleepDurationChartProps {
  logs: SleepEntry[];
}

function toDayKey(dateStr: string): string {
  return formatLocalDateKey(new Date(dateStr));
}

function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getDurationHours(entry: SleepEntry): number {
  return (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 3600000;
}

function buildLastSevenDays(logs: SleepEntry[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = formatLocalDateKey(date);
    const totalHours = logs
      .filter((log) => toDayKey(log.started_at) === key)
      .reduce((sum, log) => sum + getDurationHours(log), 0);

    return {
      date: key,
      hours: Math.round(totalHours * 10) / 10,
    };
  });

  return days;
}

export function SleepDurationChart({ logs }: SleepDurationChartProps) {
  const data = buildLastSevenDays(logs);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-info)" />
              <stop offset="100%" stopColor="var(--color-primary)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            unit="h"
          />
          <Tooltip
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value) => [`${value} hours`, "Sleep"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="hours" fill="url(#sleepGradient)" radius={[16, 16, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
