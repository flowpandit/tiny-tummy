import { cn } from "../../lib/cn";
import type { DiaperType } from "../../lib/types";
import { LoggingFieldGroup } from "./logging-form-primitives";

const OPTIONS: Array<{ value: DiaperType; label: string; description: string }> = [
  { value: "wet", label: "Wet", description: "Urine only" },
  { value: "dirty", label: "Dirty", description: "Stool only" },
  { value: "mixed", label: "Mixed", description: "Wet and stool" },
];

export function DiaperTypePicker({
  value,
  onChange,
  nightMode = false,
}: {
  value: DiaperType | null;
  onChange: (value: DiaperType) => void;
  nightMode?: boolean;
}) {
  return (
    <LoggingFieldGroup label="What happened" isNight={nightMode}>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : nightMode
                    ? "border-slate-700 bg-slate-900/70 text-slate-200"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
              )}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className={cn("mt-1 text-[11px]", active ? "text-[var(--color-primary)]/80" : "text-[var(--color-text-secondary)]")}>
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </LoggingFieldGroup>
  );
}
