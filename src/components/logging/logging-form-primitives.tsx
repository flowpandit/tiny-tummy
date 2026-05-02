import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { getLoggingLabelClassName } from "./logging-form-classnames";

export function LoggingFormHeader({
  title,
  isNight,
}: {
  title: string;
  isNight: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className={cn("text-lg font-semibold", isNight ? "text-slate-100" : "text-[var(--color-text)]")}>
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
