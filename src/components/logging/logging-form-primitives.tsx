import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function getLoggingLabelClassName(isNight: boolean) {
  return cn("block text-sm font-medium mb-1.5", isNight ? "text-slate-100" : "text-[var(--color-text)]");
}

export function getLoggingInputClassName(isNight: boolean) {
  return cn(
    "w-full h-11 rounded-[var(--radius-md)] border px-3 text-sm outline-none transition-colors",
    isNight
      ? "border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
  );
}

export function getLoggingTextareaClassName(isNight: boolean) {
  return cn(
    "w-full resize-none rounded-[var(--radius-md)] border px-3 py-2 text-sm outline-none transition-colors",
    isNight
      ? "border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-soft)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20",
  );
}

export function getLoggingChipClassName(selected: boolean, isNight: boolean) {
  return cn(
    "h-10 rounded-[var(--radius-md)] border px-4 text-sm font-medium transition-colors duration-200 cursor-pointer",
    selected
      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
      : isNight
        ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500"
        : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-muted)]",
  );
}

export function LoggingFormHeader({
  title,
  isNight,
}: {
  title: string;
  isNight: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className={cn("font-[var(--font-display)] text-lg font-semibold", isNight ? "text-slate-100" : "text-[var(--color-text)]")}>
        {title}
      </h2>
    </div>
  );
}

export function LoggingFieldGroup({
  label,
  isNight,
  className,
  children,
}: {
  label: ReactNode;
  isNight: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className={getLoggingLabelClassName(isNight)}>{label}</label>
      {children}
    </div>
  );
}

export function LoggingPresetNotice({
  isNight,
  title = "Quick preset",
  description,
}: {
  isNight: boolean;
  title?: string;
  description: string;
}) {
  return (
    <div className={cn("mb-4 rounded-[var(--radius-md)] border px-3 py-3", isNight ? "border-slate-700 bg-slate-900/90" : "border-[var(--color-primary)]/15 bg-[var(--color-primary)]/10")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        {title}
      </p>
      <p className={cn("mt-1 text-sm leading-relaxed", isNight ? "text-slate-300" : "text-[var(--color-text-secondary)]")}>
        {description}
      </p>
    </div>
  );
}
