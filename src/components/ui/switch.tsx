import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function Switch({ checked, onCheckedChange, disabled = false, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors duration-200 cursor-pointer shrink-0",
        checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
