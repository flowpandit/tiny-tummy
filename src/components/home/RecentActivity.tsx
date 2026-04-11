import { useUnits } from "../../contexts/UnitsContext";
import { useNavigate } from "react-router-dom";
import {
  HomeActionBottleIcon,
  HomeActionSymptomIcon,
} from "../ui/icons";
import type { DiaperEntry, FeedingEntry, PoopEntry } from "../../lib/types";
import { timeSince } from "../../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../../lib/constants";
import { getFeedingEntryDisplayLabel } from "../../lib/feeding";
import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import diaperWetIcon from "../../assets/svg-assets/icons/diaper-wet.svg";
import diaperDirtyIcon from "../../assets/svg-assets/icons/diaper-dirty.svg";
import diaperMixedIcon from "../../assets/svg-assets/icons/diaper-mixed.svg";
import breastfeedIcon from "../../assets/svg-assets/icons/breastfeed-icon.svg";
import poop1Icon from "../../assets/svg-assets/icons/poop-1.svg";
import poop2Icon from "../../assets/svg-assets/icons/poop-2.svg";
import poop3Icon from "../../assets/svg-assets/icons/poop-3.svg";
import poop4Icon from "../../assets/svg-assets/icons/poop-4.svg";
import poop5Icon from "../../assets/svg-assets/icons/poop-5.svg";
import poop6Icon from "../../assets/svg-assets/icons/poop-6.svg";
import poop7Icon from "../../assets/svg-assets/icons/poop-7.svg";

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

const POOP_ICONS: Record<number, string> = {
  1: poop1Icon,
  2: poop2Icon,
  3: poop3Icon,
  4: poop4Icon,
  5: poop5Icon,
  6: poop6Icon,
  7: poop7Icon,
};

export function RecentActivity({ poopLogs, diaperLogs, feedingLogs, onEditPoop, onEditDiaper, onEditMeal }: RecentActivityProps) {
  const { unitSystem } = useUnits();
  const navigate = useNavigate();
  const items: ActivityItem[] = [
    ...poopLogs.map((e) => ({ kind: "poop" as const, entry: e })),
    ...diaperLogs.map((e) => ({ kind: "diaper" as const, entry: e })),
    ...feedingLogs.map((e) => ({ kind: "meal" as const, entry: e })),
  ]
    .sort((a, b) => new Date(b.entry.logged_at).getTime() - new Date(a.entry.logged_at).getTime())
    .slice(0, 3);

  if (items.length === 0) return null;

  const getDiaperIcon = (diaperType: DiaperEntry["diaper_type"]) => {
    if (diaperType === "wet") return diaperWetIcon;
    if (diaperType === "mixed") return diaperMixedIcon;
    return diaperDirtyIcon;
  };

  const getDiaperTintStyle = (diaperType: DiaperEntry["diaper_type"]) => {
    if (diaperType === "wet") {
      return { backgroundColor: "color-mix(in srgb, var(--color-info) 28%, transparent)" };
    }
    if (diaperType === "mixed") {
      return {
        backgroundImage: "linear-gradient(135deg, color-mix(in srgb, var(--color-info) 30%, transparent) 0%, color-mix(in srgb, #c08937 30%, transparent) 100%)",
      };
    }
    return { backgroundColor: "color-mix(in srgb, #c08937 28%, transparent)" };
  };

  const getPoopColorHex = (color: PoopEntry["color"]) =>
    STOOL_COLORS.find((item) => item.value === color)?.hex ?? "#b58754";

  return (
    <div className="px-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Recent activity</p>
          <p className="mt-1 text-[1.1rem] font-semibold tracking-[-0.02em] text-[var(--color-text)]">Most recent logs</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="text-[0.8rem] font-semibold text-[var(--color-cta)] transition-opacity hover:opacity-80"
        >
          See all
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
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
              <button
                key={`poop-${log.id}`}
                onClick={() => onEditPoop(log)}
                className="flex min-w-0 items-center gap-2 rounded-[14px] px-0 py-1 text-left transition-colors hover:bg-[var(--color-home-hover-surface)]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: log.is_no_poop ? "#f4f1ea" : `${getPoopColorHex(log.color)}20`,
                  }}
                >
                  {log.is_no_poop ? (
                    <HomeActionSymptomIcon className="h-4 w-4 text-[var(--color-chip-text-on-light)]" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-block h-5 w-5"
                      style={{
                        backgroundColor: getPoopColorHex(log.color),
                        WebkitMaskImage: `url(${POOP_ICONS[log.stool_type ?? 4] ?? poop4Icon})`,
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        WebkitMaskSize: "contain",
                        maskImage: `url(${POOP_ICONS[log.stool_type ?? 4] ?? poop4Icon})`,
                        maskRepeat: "no-repeat",
                        maskPosition: "center",
                        maskSize: "contain",
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)]">{rowLabel}</p>
                  <p className="mt-0.5 truncate text-[0.66rem] leading-tight text-[var(--color-text-secondary)]">{timeSince(log.logged_at)}</p>
                </div>
              </button>
            );
          }

          if (item.kind === "diaper") {
            const diaper = item.entry;
            const rowLabel = [
              getDiaperTypeLabel(diaper.diaper_type),
              getUrineColorLabel(diaper.urine_color),
              diaper.stool_type ? `Type ${diaper.stool_type}` : null,
            ].filter(Boolean).join(", ");

            return (
              <button
                key={`diaper-${diaper.id}`}
                onClick={() => onEditDiaper(diaper)}
                className="flex min-w-0 items-center gap-2 rounded-[14px] px-0 py-1 text-left transition-colors hover:bg-[var(--color-home-hover-surface)]"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-chip-text-on-light)]"
                  style={getDiaperTintStyle(diaper.diaper_type)}
                >
                  <span
                    className="contents"
                  >
                    <img src={getDiaperIcon(diaper.diaper_type)} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)]">{rowLabel}</p>
                  <p className="mt-0.5 truncate text-[0.66rem] leading-tight text-[var(--color-text-secondary)]">{timeSince(diaper.logged_at)}</p>
                </div>
              </button>
            );
          }

          const meal = item.entry;

          return (
            <button
              key={`meal-${meal.id}`}
              onClick={() => onEditMeal(meal)}
              className="flex min-w-0 items-center gap-2 rounded-[14px] px-0 py-1 text-left transition-colors hover:bg-[var(--color-home-hover-surface)]"
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-chip-text-on-light)]"
                style={meal.food_type === "breast_milk"
                  ? { background: "linear-gradient(135deg, color-mix(in srgb, #de5c9f 24%, transparent) 0%, color-mix(in srgb, #84a7ff 24%, transparent) 100%)" }
                  : { backgroundColor: "#f4f1ea" }}
              >
                {meal.food_type === "breast_milk" ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-5 w-5"
                    style={{
                      backgroundColor: "var(--color-text)",
                      WebkitMaskImage: `url(${breastfeedIcon})`,
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskImage: `url(${breastfeedIcon})`,
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      maskSize: "contain",
                    }}
                  />
                ) : (
                  <span
                    className="contents"
                  >
                    <HomeActionBottleIcon className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] font-semibold leading-tight text-[var(--color-text)]">{getFeedingEntryDisplayLabel(meal, unitSystem)}</p>
                <p className="mt-0.5 truncate text-[0.66rem] leading-tight text-[var(--color-text-secondary)]">{timeSince(meal.logged_at)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
