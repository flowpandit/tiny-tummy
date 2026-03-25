import type { PoopEntry, DietEntry } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../../lib/constants";
import { FOOD_TYPES } from "../../lib/diet-constants";
import { Badge } from "../ui/badge";
import { PoopIcon, MealIcon, NoPoopIcon } from "../ui/icons";

type ActivityItem =
  | { kind: "poop"; entry: PoopEntry }
  | { kind: "meal"; entry: DietEntry };

interface RecentActivityProps {
  poopLogs: PoopEntry[];
  dietLogs: DietEntry[];
  onEditPoop: (entry: PoopEntry) => void;
  onEditMeal: (entry: DietEntry) => void;
}

export function RecentActivity({ poopLogs, dietLogs, onEditPoop, onEditMeal }: RecentActivityProps) {
  const items: ActivityItem[] = [
    ...poopLogs.map((e) => ({ kind: "poop" as const, entry: e })),
    ...dietLogs.map((e) => ({ kind: "meal" as const, entry: e })),
  ]
    .sort((a, b) => new Date(b.entry.logged_at).getTime() - new Date(a.entry.logged_at).getTime())
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div className="px-4">
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Recent</h3>
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

            return (
              <div
                key={`poop-${log.id}`}
                onClick={() => onEditPoop(log)}
                className="flex items-center gap-3 bg-[var(--color-surface)] rounded-[var(--radius-sm)] px-3 py-2.5 border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
              >
                {log.is_no_poop
                  ? <NoPoopIcon className="w-5 h-5 flex-shrink-0" />
                  : <PoopIcon className="w-5 h-5 flex-shrink-0" color={colorHex ?? "#8B6914"} />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text)] truncate">
                    {log.is_no_poop ? "No poop" : typeLabel ?? "Poop logged"}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">{formatDate(log.logged_at)}</p>
                </div>
                {log.size && <Badge variant="default">{log.size}</Badge>}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            );
          }

          const meal = item.entry;
          const foodLabel = FOOD_TYPES.find((f) => f.value === meal.food_type)?.label ?? meal.food_type;

          return (
            <div
              key={`meal-${meal.id}`}
              onClick={() => onEditMeal(meal)}
              className="flex items-center gap-3 bg-[var(--color-surface)] rounded-[var(--radius-sm)] px-3 py-2.5 border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
            >
              <MealIcon className="w-5 h-5 flex-shrink-0" color="var(--color-primary)" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text)] truncate">
                  {meal.food_name ? `${foodLabel}: ${meal.food_name}` : foodLabel}
                </p>
                <p className="text-xs text-[var(--color-muted)]">{formatDate(meal.logged_at)}</p>
              </div>
              <Badge variant="info">meal</Badge>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
