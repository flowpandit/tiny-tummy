import { cn } from "../../lib/cn";
import { BITSS_TYPES } from "../../lib/constants";
import { useTheme } from "../../contexts/ThemeContext";
import { getLoggingLabelClassName } from "./logging-form-classnames";
import poop1Icon from "../../assets/svg-assets/icons/poop-1.svg";
import poop2Icon from "../../assets/svg-assets/icons/poop-2.svg";
import poop3Icon from "../../assets/svg-assets/icons/poop-3.svg";
import poop4Icon from "../../assets/svg-assets/icons/poop-4.svg";
import poop5Icon from "../../assets/svg-assets/icons/poop-5.svg";
import poop6Icon from "../../assets/svg-assets/icons/poop-6.svg";
import poop7Icon from "../../assets/svg-assets/icons/poop-7.svg";

const STOOL_TYPE_ICONS: Record<number, string> = {
  1: poop1Icon,
  2: poop2Icon,
  3: poop3Icon,
  4: poop4Icon,
  5: poop5Icon,
  6: poop6Icon,
  7: poop7Icon,
};

interface StoolTypePickerProps {
  value: number | null;
  onChange: (type: number) => void;
  nightMode?: boolean;
}

export function StoolTypePicker({ value, onChange, nightMode = false }: StoolTypePickerProps) {
  const { resolved } = useTheme();
  const isNight = nightMode || resolved === "night";
  return (
    <div>
      <label className={cn(getLoggingLabelClassName(isNight), "mb-2")}>
        Consistency <span className="font-normal text-[var(--color-muted)]">(Bristol scale)</span>
      </label>
      <div className="grid grid-cols-4 gap-2">
        {BITSS_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onChange(item.type)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer min-h-[var(--touch-target)]",
              "p-2.5",
              value === item.type
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[var(--shadow-soft)]"
                : isNight
                  ? "border-slate-700 bg-slate-900/90 hover:border-slate-500"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]",
            )}
            aria-label={`Type ${item.type}: ${item.label}`}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border",
                value === item.type
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/12"
                  : isNight
                    ? "border-slate-700 bg-slate-800/80"
                    : "border-[var(--color-border)] bg-[var(--color-bg)]",
              )}
            >
              <img
                src={STOOL_TYPE_ICONS[item.type]}
                alt=""
                aria-hidden="true"
                className="h-7 w-7 object-contain"
              />
            </div>
            <span className={cn("text-[10px] text-center leading-tight", isNight ? "text-slate-300" : "text-[var(--color-text-secondary)]")}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
