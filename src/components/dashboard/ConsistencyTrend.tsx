import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { ConsistencyPoint } from "../../lib/types";
import { BITSS_TYPES } from "../../lib/constants";

interface ConsistencyTrendProps {
  data: ConsistencyPoint[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function typeLabel(type: number): string {
  return BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
}

export function ConsistencyTrend({ data }: ConsistencyTrendProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="logged_at"
            tickFormatter={formatTime}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[1, 7]}
            ticks={[1, 2, 3, 4, 5, 6, 7]}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(label) => formatTime(String(label))}
            formatter={(value) => [typeLabel(Number(value)), "Type"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          {/* Normal range band (types 3-5) */}
          <ReferenceLine y={3} stroke="var(--color-healthy)" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={5} stroke="var(--color-healthy)" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Line
            type="monotone"
            dataKey="stool_type"
            stroke="var(--color-cta)"
            strokeWidth={2}
            dot={{ fill: "var(--color-cta)", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--color-cta)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
