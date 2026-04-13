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
