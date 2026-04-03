import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAgeInMonths } from "../../lib/growth-percentile-math";
import { getGrowthPercentileCurve, getGrowthPercentile, type GrowthMetric } from "../../lib/growth-percentiles";
import { growthMetricToDisplay } from "../../lib/units";
import type { ChildSex, GrowthEntry } from "../../lib/types";

interface GrowthTrendChartProps {
  logs: GrowthEntry[];
  metric: GrowthMetric;
  unit: string;
  lineColor: string;
  dateOfBirth: string;
  sex: ChildSex | null;
  countryCode: string | null;
}

export function GrowthTrendChart({
  logs,
  metric,
  unit,
  lineColor,
  dateOfBirth,
  sex,
  countryCode,
}: GrowthTrendChartProps) {
  const unitSystem = unit === "lb" || unit === "in" ? "imperial" : "metric";
  const childData = [...logs]
    .filter((log) => log[metric] !== null)
    .sort((left, right) => new Date(left.measured_at).getTime() - new Date(right.measured_at).getTime())
    .map((log) => ({
      measured_at: log.measured_at,
      ageMonths: getAgeInMonths(dateOfBirth, log.measured_at),
      value: growthMetricToDisplay(metric, log[metric]!, unitSystem),
      percentile: getGrowthPercentile({
        countryCode,
        sex,
        dateOfBirth,
        measuredAt: log.measured_at,
        metric,
        value: log[metric],
      })?.percentileLabel ?? null,
    }));

  if (childData.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">
        No measurements yet for this trend.
      </p>
    );
  }

  const ageMin = childData[0]?.ageMonths ?? 0;
  const ageMax = childData[childData.length - 1]?.ageMonths ?? ageMin;
  const curveSet = getGrowthPercentileCurve({
    countryCode,
    sex,
    metric,
    ageMonthsStart: Math.max(0, ageMin - 1),
    ageMonthsEnd: ageMax < 3 ? Math.max(3, ageMax + 1) : ageMax + 1,
    percentiles: [3, 15, 50, 85, 97],
    samples: 28,
  });

  const curveMap = new Map<number, { ageMonths: number; value: number }[]>();
  if (curveSet) {
    for (const [percentile, points] of Object.entries(curveSet.curves)) {
      curveMap.set(
        Number(percentile),
        points.map((point) => ({
          ageMonths: point.ageMonths,
          value: growthMetricToDisplay(metric, point.value, unitSystem),
        })),
      );
    }
  }

  const chartRows = new Map<number, {
    ageMonths: number;
    measured_at?: string;
    child?: number;
    childPercentile?: string | null;
    p3?: number;
    p15?: number;
    p50?: number;
    p85?: number;
    p97?: number;
  }>();

  const keyForAge = (ageMonths: number) => Number(ageMonths.toFixed(3));

  for (const point of childData) {
    const key = keyForAge(point.ageMonths);
    chartRows.set(key, {
      ageMonths: point.ageMonths,
      measured_at: point.measured_at,
      child: point.value,
      childPercentile: point.percentile,
    });
  }

  const percentileKeys = [3, 15, 50, 85, 97] as const;
  for (const percentile of percentileKeys) {
    const points = curveMap.get(percentile) ?? [];
    for (const point of points) {
      const key = keyForAge(point.ageMonths);
      const existing = chartRows.get(key) ?? { ageMonths: point.ageMonths };
      chartRows.set(key, {
        ...existing,
        [`p${percentile}`]: point.value,
      });
    }
  }

  const data = [...chartRows.values()].sort((left, right) => left.ageMonths - right.ageMonths);
  const allValues = data.flatMap((row) => [row.child, row.p3, row.p15, row.p50, row.p85, row.p97].filter((value): value is number => value !== undefined));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const minAge = data[0]?.ageMonths ?? 0;
  const maxAge = data[data.length - 1]?.ageMonths ?? minAge;
  const xPadding = maxAge === minAge ? 1 : Math.max(0.25, (maxAge - minAge) * 0.08);
  const yPadding = Math.max(0.4, (maxValue - minValue) * 0.15);

  function formatAgeLabel(ageMonths: number): string {
    if (ageMonths < 24) {
      return `${ageMonths < 1 ? ageMonths.toFixed(1) : Math.round(ageMonths)}m`;
    }

    const years = ageMonths / 12;
    return `${years.toFixed(years >= 10 ? 0 : 1)}y`;
  }

  const percentileLineColor = "var(--color-text-soft)";

  return (
    <div className="w-full">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={[Math.max(0, minAge - xPadding), maxAge + xPadding]}
            tickFormatter={formatAgeLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
            tickCount={5}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            width={34}
            tickFormatter={(value) => Number(value).toFixed(metric === "weight_kg" ? 1 : 0)}
            domain={[Math.max(0, minValue - yPadding), maxValue + yPadding]}
          />
          <Tooltip
            labelFormatter={(label) => `Age ${formatAgeLabel(Number(label))}`}
            formatter={(value, name, item) => {
              if (name === "child") {
                return [`${value} ${unit}${item.payload.childPercentile ? ` · ${item.payload.childPercentile}` : ""}`, "Measurement"];
              }

              const percentileLabel = String(name).replace("p", "") + "th";
              return [`${value} ${unit}`, `${percentileLabel} percentile`];
            }}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          />
          <Line dataKey="p3" stroke={percentileLineColor} strokeOpacity={0.28} strokeWidth={1.2} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false} />
          <Line dataKey="p15" stroke={percentileLineColor} strokeOpacity={0.2} strokeWidth={1.2} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false} />
          <Line dataKey="p50" stroke={percentileLineColor} strokeOpacity={0.42} strokeWidth={1.8} dot={false} connectNulls isAnimationActive={false} />
          <Line dataKey="p85" stroke={percentileLineColor} strokeOpacity={0.2} strokeWidth={1.2} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false} />
          <Line dataKey="p97" stroke={percentileLineColor} strokeOpacity={0.28} strokeWidth={1.2} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="child"
            stroke={lineColor}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, stroke: "white", fill: lineColor }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "white", fill: lineColor }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {curveSet && [3, 15, 50, 85, 97].map((percentile) => (
          <span
            key={percentile}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
          >
            {percentile}th
          </span>
        ))}
        {curveSet && (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            {curveSet.reference} reference
          </span>
        )}
        {childData.length < 2 && (
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            Add one more point to connect the child trend
          </span>
        )}
      </div>
    </div>
  );
}
