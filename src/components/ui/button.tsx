import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "cta" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variants
          variant === "primary" &&
            "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] shadow-[var(--shadow-soft)]",
          variant === "secondary" &&
            "border border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text)] hover:bg-[var(--color-surface)] active:scale-[0.98] shadow-[var(--shadow-soft)]",
          variant === "ghost" &&
            "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] active:scale-[0.98]",
          variant === "cta" &&
            "bg-[var(--color-cta)] text-white hover:bg-[var(--color-cta-hover)] active:scale-[0.98] shadow-[var(--shadow-medium)]",
          variant === "danger" &&
            "bg-[var(--color-alert)] text-white hover:opacity-90 active:scale-[0.98]",
          // Sizes
          size === "sm" && "h-10 px-4 text-sm rounded-[999px]",
          size === "md" && "h-12 px-5 text-base rounded-[999px]",
          size === "lg" && "h-14 px-6 text-lg rounded-[999px]",
          size === "icon" && "h-10 w-10 rounded-[var(--radius-full)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
export { Button };
