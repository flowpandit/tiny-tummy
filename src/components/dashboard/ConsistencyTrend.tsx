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
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="consistencyGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffb48e" />
              <stop offset="55%" stopColor="#f2c462" />
              <stop offset="100%" stopColor="#94d6bb" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 8"
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
          <ReferenceLine y={3} stroke="var(--color-healthy)" strokeDasharray="5 6" strokeOpacity={0.55} />
          <ReferenceLine y={5} stroke="var(--color-healthy)" strokeDasharray="5 6" strokeOpacity={0.55} />
          <Line
            type="monotone"
            dataKey="stool_type"
            stroke="url(#consistencyGradient)"
            strokeWidth={3}
            dot={{ fill: "#ff8d69", r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: "#ff8d69" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
