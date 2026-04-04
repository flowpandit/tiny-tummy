import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DailyFrequency } from "../../lib/types";
import { fillDailyFrequencyDays } from "../../lib/stats";

interface FrequencyChartProps {
  data: DailyFrequency[];
  days: number;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FrequencyChart({ data, days }: FrequencyChartProps) {
  const filled = fillDailyFrequencyDays(data, days);
  const showEveryN = days <= 7 ? 1 : days <= 14 ? 2 : 4;

  return (
    <div className="w-full h-52" data-no-page-swipe="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="freqGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-warm-start)" />
              <stop offset="100%" stopColor="var(--color-chart-warm-end)" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 8"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            interval={showEveryN - 1}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value) => [`${value} poop${value !== 1 ? "s" : ""}`, "Count"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            fill="url(#freqGradient)"
            radius={[18, 18, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
