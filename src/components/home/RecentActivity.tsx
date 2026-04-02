import { useUnits } from "../../contexts/UnitsContext";
import type { DiaperEntry, FeedingEntry, PoopEntry } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../../lib/constants";
import { getFeedingEntryDisplayLabel } from "../../lib/feeding";
import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";

type ActivityItem =
  | { kind: "poop"; entry: PoopEntry }
  | { kind: "diaper"; entry: DiaperEntry }
  | { kind: "meal"; entry: FeedingEntry };

interface RecentActivityProps {
  poopLogs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  onEditPoop: (entry: PoopEntry) => void;
  onEditDiaper: (entry: DiaperEntry) => void;
  onEditMeal: (entry: FeedingEntry) => void;
}

export function RecentActivity({ poopLogs, diaperLogs, feedingLogs, onEditPoop, onEditDiaper, onEditMeal }: RecentActivityProps) {
  const { unitSystem } = useUnits();
  const items: ActivityItem[] = [
    ...poopLogs.map((e) => ({ kind: "poop" as const, entry: e })),
    ...diaperLogs.map((e) => ({ kind: "diaper" as const, entry: e })),
    ...feedingLogs.map((e) => ({ kind: "meal" as const, entry: e })),
  ]
    .sort((a, b) => new Date(b.entry.logged_at).getTime() - new Date(a.entry.logged_at).getTime())
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div className="px-4">
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex flex-col gap-2">
        {items.map((item) => {
          if (item.kind === "poop") {
            const log = item.entry;
            const typeLabel = log.stool_type
              ? BITSS_TYPES.find((b) => b.type === log.stool_type)?.label
              : null;
            const colorHex = log.color
              ? STOOL_COLORS.find((c) => c.value === log.color)?.hex
              : undefined;

            const rowLabel = log.is_no_poop
              ? "No poop day marked"
              : [typeLabel, colorHex ? STOOL_COLORS.find((c) => c.hex === colorHex)?.label?.toLowerCase() : null, log.size]
                  .filter(Boolean)
                  .join(", ");

            return (
              <div
                key={`poop-${log.id}`}
                onClick={() => onEditPoop(log)}
                className="flex items-center gap-4 rounded-[22px] px-2 py-1.5 cursor-pointer hover:bg-white/40 transition-colors"
              >
                <div
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor: log.is_no_poop
                      ? "#95b98a"
                      : colorHex ?? "#c08937",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] text-[var(--color-text)]">
                    {rowLabel}
                  </p>
                </div>
                <span className="ml-3 flex-shrink-0 text-[18px] text-[var(--color-text-secondary)]">
                  {formatDate(log.logged_at)}
                </span>
              </div>
            );
          }

          if (item.kind === "diaper") {
            const diaper = item.entry;
            const colorHex = diaper.color
              ? STOOL_COLORS.find((c) => c.value === diaper.color)?.hex
              : undefined;
            const rowLabel = [
              getDiaperTypeLabel(diaper.diaper_type),
              getUrineColorLabel(diaper.urine_color),
              diaper.stool_type ? `Type ${diaper.stool_type}` : null,
            ].filter(Boolean).join(", ");

            return (
              <div
                key={`diaper-${diaper.id}`}
                onClick={() => onEditDiaper(diaper)}
                className="flex items-center gap-4 rounded-[22px] px-2 py-1.5 cursor-pointer hover:bg-white/40 transition-colors"
              >
                <div
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: colorHex ?? "#d1b24a" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] text-[var(--color-text)]">
                    {rowLabel}
                  </p>
                </div>
                <span className="ml-3 flex-shrink-0 text-[18px] text-[var(--color-text-secondary)]">
                  {formatDate(diaper.logged_at)}
                </span>
              </div>
            );
          }

          const meal = item.entry;

          return (
            <div
              key={`meal-${meal.id}`}
              onClick={() => onEditMeal(meal)}
              className="flex items-center gap-4 rounded-[22px] px-2 py-1.5 cursor-pointer hover:bg-white/40 transition-colors"
            >
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: "var(--color-primary)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[18px] text-[var(--color-text)]">
                  {getFeedingEntryDisplayLabel(meal, unitSystem)}
                </p>
              </div>
              <span className="ml-3 flex-shrink-0 text-[18px] text-[var(--color-text-secondary)]">
                {formatDate(meal.logged_at)}
              </span>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
