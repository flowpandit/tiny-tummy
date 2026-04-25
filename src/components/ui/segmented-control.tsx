import { cn } from "../../lib/cn";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  options: Array<SegmentedControlOption<T>>;
  className?: string;
  gridClassName?: string;
  size?: "sm" | "md";
  variant?: "default" | "settings";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  gridClassName,
  size = "md",
  variant = "default",
}: SegmentedControlProps<T>) {
  if (variant === "settings") {
    return (
      <div
        className={cn(
          "grid gap-0 rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shadow-[var(--shadow-inner)]",
          gridClassName,
          className,
        )}
      >
        {options.map((option, index) => {
          const active = value === option.value;

          return (
            <div key={option.value} className="relative min-w-0">
              {index > 0 && !active && value !== options[index - 1]?.value && (
                <span className="pointer-events-none absolute left-0 top-1/2 z-[2] h-4 -translate-y-1/2 border-l border-[var(--color-border)]" />
              )}
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  "relative z-[1] w-full min-w-0 cursor-pointer rounded-[7px] border text-center font-medium transition-all duration-200",
                  size === "sm" ? "h-[30px] px-2 text-[0.74rem]" : "h-11 px-4 text-sm",
                  active
                    ? "border-[var(--color-cta)] bg-[var(--color-cta)] text-[var(--color-chip-text-on-light)] shadow-[var(--shadow-soft)]"
                    : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                )}
              >
                {option.label}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2", gridClassName, className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[var(--radius-md)] border font-medium transition-colors duration-200 cursor-pointer",
            size === "sm" ? "h-10 px-3 text-sm" : "h-11 px-4 text-sm",
            value === option.value
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
