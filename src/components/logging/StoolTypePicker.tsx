import { cn } from "../../lib/cn";
import { BITSS_TYPES } from "../../lib/constants";

interface StoolTypePickerProps {
  value: number | null;
  onChange: (type: number) => void;
  nightMode?: boolean;
}

export function StoolTypePicker({ value, onChange, nightMode = false }: StoolTypePickerProps) {
  return (
    <div>
      <label className={cn("block text-sm font-medium mb-2", nightMode ? "text-slate-100" : "text-[var(--color-text)]")}>
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
                : nightMode
                  ? "border-slate-700 bg-slate-900/90 hover:border-slate-500"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]",
            )}
            aria-label={`Type ${item.type}: ${item.label}`}
          >
            {/* Type number circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                value === item.type
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : nightMode
                    ? "bg-slate-800 text-slate-200"
                    : "bg-[var(--color-bg)] text-[var(--color-text-secondary)]",
              )}
            >
              {item.type}
            </div>
            <span className={cn("text-[10px] text-center leading-tight", nightMode ? "text-slate-300" : "text-[var(--color-text-secondary)]")}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
