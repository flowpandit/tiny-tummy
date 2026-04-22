import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendBarDatum, TrendSeriesDefinition } from "../../lib/trends";

export function TrendBarChart({
  data,
  series,
  valueSuffix = "",
}: {
  data: TrendBarDatum[];
  series: TrendSeriesDefinition[];
  valueSuffix?: string;
}) {
  return (
    <div className="h-56 w-full" data-no-page-swipe="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals
          />
          <Tooltip
            formatter={(value, name) => [`${value}${valueSuffix}`, String(name)]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              radius={[16, 16, 0, 0]}
              maxBarSize={series.length > 1 ? 18 : 26}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
