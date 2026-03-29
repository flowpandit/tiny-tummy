import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "healthy" | "caution" | "alert" | "info" | "default";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-[999px] text-[11px] font-semibold tracking-[0.02em]",
        variant === "healthy" && "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]",
        variant === "caution" && "bg-[var(--color-caution-bg)] text-[var(--color-caution)]",
        variant === "alert" && "bg-[var(--color-alert-bg)] text-[var(--color-alert)]",
        variant === "info" && "bg-[var(--color-info-bg)] text-[var(--color-info)]",
        variant === "default" && "bg-[var(--color-surface-tint)] text-[var(--color-text-secondary)]",
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
export { Badge };
