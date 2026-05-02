import { Link } from "react-router-dom";
import { diaperDirtyIcon, diaperMixedIcon, diaperWetIcon } from "../../assets/icons";
import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getStoolShortLabel } from "../../lib/diaper-insights";
import { Card, CardContent } from "../ui/card";
import type { DiaperEntry, DiaperLogDraft } from "../../lib/types";

const quickActions: Array<{
  label: string;
  icon: string;
  iconClassName: string;
  draft: Partial<DiaperLogDraft>;
}> = [
  {
    label: "Wet",
    icon: diaperWetIcon,
    iconClassName: "h-7 w-7",
    draft: { diaper_type: "wet", urine_color: "normal" },
  },
  {
    label: "Dirty",
    icon: diaperDirtyIcon,
    iconClassName: "h-7 w-7",
    draft: { diaper_type: "dirty" },
  },
  {
    label: "Mixed",
    icon: diaperMixedIcon,
    iconClassName: "h-7 w-7",
    draft: { diaper_type: "mixed", urine_color: "normal" },
  },
];

export function DiaperQuickLogCard({
  lastDiaper,
  onPresetSelect,
}: {
  lastDiaper: DiaperEntry | null;
  onPresetSelect: (draft: Partial<DiaperLogDraft>) => void;
}) {
  return (
    <Card
      className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--color-home-card-surface)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CardContent className="p-4 md:p-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.74rem]">
          Quick log
        </p>
        <p className="mt-1 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
          Start with the most likely diaper event.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5 md:gap-3.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onPresetSelect(action.draft)}
              className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-tile-surface)] px-2 py-2 text-[0.78rem] font-semibold text-[var(--color-text)] shadow-[var(--shadow-tracker-tile)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-tracker-tile-surface-hover)] active:translate-y-0 md:min-h-[82px] md:rounded-[18px] md:text-[0.88rem]"
            >
              <img src={action.icon} alt="" aria-hidden="true" className={`${action.iconClassName} object-contain`} />
              {action.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-[0.68rem] leading-snug text-[var(--color-text-soft)] md:text-[0.74rem]">
          {lastDiaper ? (
            <p className="min-w-0">
              Last logged: {getDiaperTypeLabel(lastDiaper.diaper_type)}
              {lastDiaper.urine_color ? ` · ${getUrineColorLabel(lastDiaper.urine_color)}` : ""}
              {getStoolShortLabel(lastDiaper.stool_type) ? ` · ${getStoolShortLabel(lastDiaper.stool_type)}` : ""}
            </p>
          ) : (
            <p className="min-w-0">No diaper logged yet today.</p>
          )}
          <Link to="/guidance" className="shrink-0 font-semibold text-[#7259f2]">
            View tips
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
