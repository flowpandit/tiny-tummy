import { STOOL_COLORS } from "../../lib/constants";
import {
  fillDailyFrequencyDays,
  getDominantStoolColor,
  getDominantStoolType,
  getRecentNoPoopDates,
} from "../../lib/stats";
import type { ColorCount, ConsistencyPoint, DailyFrequency, PoopEntry } from "../../lib/types";

interface WeeklyPatternCardProps {
  frequency: DailyFrequency[];
  consistency: ConsistencyPoint[];
  colorDist: ColorCount[];
  poopLogs: PoopEntry[];
  days?: number;
}

function formatPoopSummary(totalPoops: number, days: number): string {
  if (totalPoops === 0) return `No poops logged in the last ${days} days`;
  if (totalPoops === 1) return `1 poop in the last ${days} days`;
  return `${totalPoops} poops in the last ${days} days`;
}

function formatColorLabel(color: string | null): string | null {
  if (!color) return null;
  const info = STOOL_COLORS.find((item) => item.value === color);
  if (!info) return color;
  return info.label.split("/")[0]?.trim() ?? info.label;
}

export function WeeklyPatternCard({
  frequency,
  consistency,
  colorDist,
  poopLogs,
  days = 7,
}: WeeklyPatternCardProps) {
  const filled = fillDailyFrequencyDays(frequency, days);
  const noPoopDates = getRecentNoPoopDates(poopLogs, days);
  const dominantType = getDominantStoolType(consistency);
  const dominantTypeLabel = dominantType ? `Mostly Type ${dominantType}` : null;
  const dominantColorLabel = formatColorLabel(getDominantStoolColor(colorDist));
  const totalPoops = filled.reduce((sum, day) => sum + day.count, 0);
  const maxCount = Math.max(...filled.map((day) => day.count), 0);
  const noPoopDayCount = filled.filter((day) => noPoopDates.has(day.date)).length;

  const summaryBits = [
    dominantTypeLabel,
    dominantColorLabel ? `Mostly ${dominantColorLabel.toLowerCase()}` : null,
  ].filter(Boolean) as string[];

  const secondarySummary =
    summaryBits.length > 0
      ? summaryBits.join(" • ")
      : "Keep logging stool type and color to reveal more patterns.";

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-[90px] items-end gap-[10px]">
        {filled.map((day) => {
          const height =
            day.count === 0
              ? 10
              : Math.min(72, 18 + (day.count / Math.max(maxCount, 1)) * 54);

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-t-[999px] bg-gradient-to-b from-[var(--color-chart-warm-start)] to-[var(--color-chart-warm-end)]"
                style={{
                  height: `${height}px`,
                  opacity: day.count === 0 ? 0.4 : 1,
                }}
                title={`${day.weekdayLabel}: ${day.count} poop${day.count !== 1 ? "s" : ""}`}
              />
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: noPoopDates.has(day.date) ? "var(--color-text-soft)" : "transparent",
                }}
                title={noPoopDates.has(day.date) ? `${day.weekdayLabel}: no-poop day marked` : undefined}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-[19px] font-semibold text-[var(--color-text)]">Weekly pattern</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          {formatPoopSummary(totalPoops, days)}
        </p>
        <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">{secondarySummary}</p>
        {noPoopDayCount > 0 && (
          <p className="mt-2 text-[11px] text-[var(--color-text-soft)]">
            Grey dots mark {noPoopDayCount} no-poop day{noPoopDayCount !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
    </div>
  );
}
