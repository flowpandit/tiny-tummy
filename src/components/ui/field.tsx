import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const fieldInputClassName =
  "w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 placeholder:text-[var(--color-text-soft)]";

export const fieldTextareaClassName =
  "w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 placeholder:text-[var(--color-text-soft)]";

const FieldLabel = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium text-[var(--color-text)]", className)}
      {...props}
    />
  ),
);

FieldLabel.displayName = "FieldLabel";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(fieldInputClassName, className)}
      {...props}
    />
  ),
);

Input.displayName = "Input";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldTextareaClassName, className)}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export { FieldLabel, Input, Textarea };
