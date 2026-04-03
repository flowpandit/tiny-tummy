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
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  gridClassName,
  size = "md",
}: SegmentedControlProps<T>) {
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
