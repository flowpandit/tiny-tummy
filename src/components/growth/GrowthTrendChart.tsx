import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAgeInMonths } from "../../lib/growth-percentile-math";
import { getGrowthPercentileCurve, getGrowthPercentile, type GrowthMetric } from "../../lib/growth-percentiles";
import { formatOrdinal } from "../../lib/growth-reference";
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

const PERCENTILE_GUIDES = [3, 15, 50, 85, 97] as const;

type GrowthTooltipValue = number | string | readonly (number | string)[];

interface GrowthTooltipPayloadItem {
  color?: string;
  name?: string | number;
  value?: GrowthTooltipValue;
  payload?: {
    childPercentile?: string | null;
  };
}

interface GrowthTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: GrowthTooltipPayloadItem[];
  unit: string;
  formatAgeLabel: (ageMonths: number) => string;
  formatMeasurement: (value: number) => string;
}

function getNumericTooltipValue(value: GrowthTooltipValue | undefined): number | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getTooltipLabel(name: string | number | undefined): string {
  if (name === "child") return "Measurement";

  const percentile = Number(String(name).replace("p", ""));
  return Number.isFinite(percentile) ? `${formatOrdinal(percentile)} percentile` : String(name ?? "");
}

function getTooltipSortValue(name: string | number | undefined): number {
  if (name === "child") return -1;

  const percentile = Number(String(name).replace("p", ""));
  return Number.isFinite(percentile) ? percentile : 999;
}

function GrowthTrendTooltip({
  active,
  label,
  payload,
  unit,
  formatAgeLabel,
  formatMeasurement,
}: GrowthTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((item) => getNumericTooltipValue(item.value) !== null)
    .sort((left, right) => getTooltipSortValue(left.name) - getTooltipSortValue(right.name));

  if (rows.length === 0) return null;

  return (
    <div className="max-w-[min(18rem,calc(100vw-3rem))] rounded-[var(--radius-md)] border border-[var(--color-home-card-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.72rem] shadow-[var(--shadow-home-card)]">
      <p className="font-semibold text-[var(--color-text)]">
        Age {formatAgeLabel(Number(label))}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {rows.map((item) => {
          const numericValue = getNumericTooltipValue(item.value);
          if (numericValue === null) return null;

          const isMeasurement = item.name === "child";
          const detail = isMeasurement && item.payload?.childPercentile
            ? item.payload.childPercentile
            : null;

          return (
            <div key={String(item.name)} className="flex items-start gap-2">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color ?? "var(--color-text-soft)" }}
              />
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-[var(--color-text)]">
                  {getTooltipLabel(item.name)}
                </p>
                <p className="leading-snug text-[var(--color-text-secondary)]">
                  {formatMeasurement(numericValue)} {unit}{detail ? ` · ${detail}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
    .map((log) => {
      const percentileMeta = getGrowthPercentile({
        countryCode,
        sex,
        dateOfBirth,
        measuredAt: log.measured_at,
        metric,
        value: log[metric],
      });

      return {
        measured_at: log.measured_at,
        ageMonths: getAgeInMonths(dateOfBirth, log.measured_at),
        value: growthMetricToDisplay(metric, log[metric]!, unitSystem),
        percentile: percentileMeta?.percentileLabel ?? null,
        reference: percentileMeta?.reference ?? null,
      };
    });

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
    percentiles: [...PERCENTILE_GUIDES],
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

  for (const percentile of PERCENTILE_GUIDES) {
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
      return ageMonths < 0.5 ? "0" : `${Math.round(ageMonths)}m`;
    }

    const years = ageMonths / 12;
    return `${years.toFixed(years >= 10 ? 0 : 1)}y`;
  }

  function formatMeasurementTick(value: number): string {
    const rounded = Number(value);
    const precision = metric === "weight_kg" || unitSystem === "imperial" ? 1 : 0;
    return rounded.toFixed(precision).replace(/\.0$/, "");
  }

  function buildAgeTicks(start: number, end: number): number[] {
    const firstTick = Math.max(0, Math.floor(start));
    const lastTick = Math.ceil(end);
    const range = Math.max(1, lastTick - firstTick);
    const step = range <= 6 ? 1 : range <= 18 ? 3 : range <= 36 ? 6 : 12;
    const ticks: number[] = [];

    for (let value = firstTick; value <= lastTick; value += step) {
      ticks.push(value);
    }

    if (ticks[ticks.length - 1] !== lastTick) ticks.push(lastTick);
    return ticks;
  }

  const ageTicks = buildAgeTicks(Math.max(0, minAge - xPadding), maxAge + xPadding);
  const reference = curveSet?.reference ?? childData.find((point) => point.reference)?.reference;
  const percentileLineColor = "var(--color-text-soft)";
  const curveLabelAges = new Map(
    PERCENTILE_GUIDES.map((percentile) => {
      const points = curveMap.get(percentile) ?? [];
      return [percentile, keyForAge(points[points.length - 1]?.ageMonths ?? -1)];
    }),
  );

  function getPercentileLabelAccessor(percentile: (typeof PERCENTILE_GUIDES)[number]) {
    return (entry: { payload?: unknown }) => {
      const payload = entry.payload as { ageMonths?: unknown } | undefined;
      const ageMonths = Number(payload?.ageMonths);
      if (!Number.isFinite(ageMonths) || keyForAge(ageMonths) !== curveLabelAges.get(percentile)) {
        return "";
      }

      return formatOrdinal(percentile);
    };
  }

  return (
    <div className="w-full">
      <div className="relative h-[240px] w-full sm:h-[248px] md:h-[260px]" data-no-page-swipe="true">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 42, bottom: 14, left: -4 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="ageMonths"
            type="number"
            domain={[Math.max(0, minAge - xPadding), maxAge + xPadding]}
            ticks={ageTicks}
            tickFormatter={formatAgeLabel}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={formatMeasurementTick}
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={[Math.max(0, minValue - yPadding), maxValue + yPadding]}
            tickCount={4}
          />
          <Tooltip
            content={(
              <GrowthTrendTooltip
                unit={unit}
                formatAgeLabel={formatAgeLabel}
                formatMeasurement={formatMeasurementTick}
              />
            )}
            cursor={{ stroke: "var(--color-text-soft)", strokeDasharray: "3 4", strokeWidth: 1 }}
            position={{ y: 8 }}
            wrapperStyle={{ outline: "none", zIndex: 20 }}
          />
          <Line dataKey="p3" stroke={percentileLineColor} strokeOpacity={0.42} strokeWidth={1.4} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false}>
            <LabelList valueAccessor={getPercentileLabelAccessor(3)} position="right" offset={4} fill="var(--color-muted)" fontSize={9} fontWeight={650} />
          </Line>
          <Line dataKey="p15" stroke={percentileLineColor} strokeOpacity={0.36} strokeWidth={1.4} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false}>
            <LabelList valueAccessor={getPercentileLabelAccessor(15)} position="right" offset={4} fill="var(--color-muted)" fontSize={9} fontWeight={650} />
          </Line>
          <Line dataKey="p50" stroke={percentileLineColor} strokeOpacity={0.66} strokeWidth={1.8} dot={false} connectNulls isAnimationActive={false}>
            <LabelList valueAccessor={getPercentileLabelAccessor(50)} position="right" offset={4} fill="var(--color-muted)" fontSize={9} fontWeight={650} />
          </Line>
          <Line dataKey="p85" stroke={percentileLineColor} strokeOpacity={0.42} strokeWidth={1.4} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false}>
            <LabelList valueAccessor={getPercentileLabelAccessor(85)} position="right" offset={4} fill="var(--color-muted)" fontSize={9} fontWeight={650} />
          </Line>
          <Line dataKey="p97" stroke={percentileLineColor} strokeOpacity={0.48} strokeWidth={1.4} strokeDasharray="4 5" dot={false} connectNulls isAnimationActive={false}>
            <LabelList valueAccessor={getPercentileLabelAccessor(97)} position="right" offset={4} fill="var(--color-muted)" fontSize={9} fontWeight={650} />
          </Line>
          <Line
            type="monotone"
            dataKey="child"
            stroke={lineColor}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, stroke: "var(--color-home-card-surface)", fill: lineColor }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-home-card-surface)", fill: lineColor }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
        </ResponsiveContainer>
      </div>
      {reference && (
        <p className="sr-only">
          Showing 3rd, 15th, 50th, 85th, and 97th percentile curves on the {reference} reference.
        </p>
      )}
    </div>
  );
}
