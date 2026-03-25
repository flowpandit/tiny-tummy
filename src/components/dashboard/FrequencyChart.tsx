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

interface FrequencyChartProps {
  data: DailyFrequency[];
  days: number;
}

function fillMissingDays(data: DailyFrequency[], days: number): DailyFrequency[] {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const filled: DailyFrequency[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    filled.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
  }
  return filled;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FrequencyChart({ data, days }: FrequencyChartProps) {
  const filled = fillMissingDays(data, days);
  const showEveryN = days <= 7 ? 1 : days <= 14 ? 2 : 4;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filled} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
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
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
