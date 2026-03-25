import { cn } from "../../lib/cn";
import { STOOL_SIZES } from "../../lib/constants";
import type { StoolSize } from "../../lib/types";

interface SizePickerProps {
  value: StoolSize | null;
  onChange: (size: StoolSize) => void;
}

export function SizePicker({ value, onChange }: SizePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
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
