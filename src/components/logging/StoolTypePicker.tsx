import { cn } from "../../lib/cn";
import { BITSS_TYPES } from "../../lib/constants";

interface StoolTypePickerProps {
  value: number | null;
  onChange: (type: number) => void;
}

export function StoolTypePicker({ value, onChange }: StoolTypePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
        Stool type
      </label>
      <div className="grid grid-cols-4 gap-2">
        {BITSS_TYPES.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onChange(item.type)}
            className={cn(
              "flex flex-col items-center gap-1 p-2.5 rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer min-h-[var(--touch-target)]",
              value === item.type
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[var(--shadow-soft)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]",
            )}
            aria-label={`Type ${item.type}: ${item.label}`}
          >
            {/* Type number circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                value === item.type
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg)] text-[var(--color-text-secondary)]",
              )}
            >
              {item.type}
            </div>
            <span className="text-[10px] text-center leading-tight text-[var(--color-text-secondary)]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
