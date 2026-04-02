import { cn } from "../../lib/cn";
import type { UrineColor } from "../../lib/types";
import { LoggingFieldGroup } from "./logging-form-primitives";

const OPTIONS: Array<{ value: UrineColor; label: string; hint: string; swatch: string }> = [
  { value: "pale", label: "Pale", hint: "Well hydrated", swatch: "#f4e8b9" },
  { value: "normal", label: "Normal", hint: "Typical yellow", swatch: "#e2bf4f" },
  { value: "dark", label: "Dark", hint: "Watch hydration", swatch: "#bb7a18" },
];

export function UrineColorPicker({
  value,
  onChange,
  nightMode = false,
}: {
  value: UrineColor | null;
  onChange: (value: UrineColor) => void;
  nightMode?: boolean;
}) {
  return (
    <LoggingFieldGroup label="Urine color" isNight={nightMode}>
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
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                  : nightMode
                    ? "border-slate-700 bg-slate-900/70 text-slate-200"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.swatch }} />
                <p className="text-sm font-semibold">{option.label}</p>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{option.hint}</p>
            </button>
          );
        })}
      </div>
    </LoggingFieldGroup>
  );
}
