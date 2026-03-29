import { cn } from "../../lib/cn";
import { STOOL_SIZES } from "../../lib/constants";
import { useTheme } from "../../contexts/ThemeContext";
import type { StoolSize } from "../../lib/types";

interface SizePickerProps {
  value: StoolSize | null;
  onChange: (size: StoolSize) => void;
  nightMode?: boolean;
}

export function SizePicker({ value, onChange, nightMode = false }: SizePickerProps) {
  const { resolved } = useTheme();
  const isNight = nightMode || resolved === "night";
  return (
    <div>
      <label className={cn("block text-sm font-medium mb-2", isNight ? "text-slate-100" : "text-[var(--color-text)]")}>
        Size
      </label>
      <div className="flex gap-2">
        {STOOL_SIZES.map((size) => (
          <button
            key={size.value}
            type="button"
            onClick={() => onChange(size.value)}
            className={cn(
              "flex-1 h-11 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
              value === size.value
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : isNight
                  ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
