import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GrowthEntry } from "../../lib/types";

interface GrowthTrendChartProps {
  logs: GrowthEntry[];
  metric: "weight_kg" | "height_cm" | "head_circumference_cm";
  unit: string;
  lineColor: string;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GrowthTrendChart({ logs, metric, unit, lineColor }: GrowthTrendChartProps) {
  const data = [...logs]
    .filter((log) => log[metric] !== null)
    .sort((left, right) => new Date(left.measured_at).getTime() - new Date(right.measured_at).getTime())
    .map((log) => ({
      measured_at: log.measured_at,
      value: log[metric],
    }));

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">
        No measurements yet for this trend.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="measured_at"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            width={34}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
          />
          <Tooltip
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value) => [`${value} ${unit}`, "Measurement"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={3}
            dot={{ r: 3, strokeWidth: 0, fill: lineColor }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
