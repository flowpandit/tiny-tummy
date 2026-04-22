import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { InsetPanel } from "../ui/page-layout";

export function TrackerMetricRing({
  value,
  unit,
  label,
  gradient,
  detail,
  size = "default",
  className,
}: {
  value: string;
  unit: string;
  label: string;
  gradient: string;
  detail?: string;
  size?: "default" | "sm";
  className?: string;
}) {
  const isSmall = size === "sm";

  return (
    <div className={cn("flex flex-col items-center text-center", isSmall ? "gap-1.5" : "gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full shadow-[var(--shadow-soft)]",
          isSmall ? "h-[72px] w-[72px]" : "h-[96px] w-[96px]",
        )}
        style={{ background: gradient }}
      >
        <div
          className={cn(
            "absolute rounded-full bg-[var(--color-surface-strong)] shadow-[var(--shadow-inner)]",
            isSmall ? "inset-[8px]" : "inset-[10px]",
          )}
        />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold text-[var(--color-text)]",
              isSmall ? "text-[1.05rem]" : "text-[1.45rem]",
            )}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {value}
          </span>
          <span className={cn("text-[var(--color-text-secondary)]", isSmall ? "text-[10px]" : "text-[11px]")}>{unit}</span>
        </div>
      </div>
      {detail && (
        <p className={cn("leading-tight text-[var(--color-text-secondary)]", isSmall ? "max-w-[10ch] text-[10px]" : "max-w-[9ch] text-[11px]")}>
          {detail}
        </p>
      )}
      <p className={cn("font-medium uppercase tracking-[0.12em] text-[var(--color-text-soft)]", isSmall ? "text-[10px]" : "text-[11px]")}>{label}</p>
    </div>
  );
}

export function TrackerMetricPanel({
  eyebrow,
  value,
  description,
  tone = "default",
}: {
  eyebrow: string;
  value: string;
  description: string;
  tone?: "default" | "info" | "healthy" | "cta";
}) {
  const toneClassName = tone === "info"
    ? "border-[var(--color-info)]/18 bg-[var(--color-info-bg)]"
    : tone === "healthy"
      ? "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)]"
      : tone === "cta"
        ? "border-[var(--color-cta)]/16 bg-[var(--color-surface-tint)]"
        : "";

  return (
    <InsetPanel className={`p-3 ${toneClassName}`.trim()}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{eyebrow}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
    </InsetPanel>
  );
}

export function TrackerWeekRangePill({
  label,
  animateKey,
  className,
}: {
  label: string;
  animateKey?: string | number;
  className?: string;
}) {
  return (
    <motion.span
      key={animateKey ?? label}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] font-medium leading-none text-[var(--color-text-secondary)]",
        className,
      )}
    >
      {label}
    </motion.span>
  );
}

export function TrackerWeekSwitcher({
  weekOffset,
  maxWeekOffset,
  onOlder,
  onNewer,
}: {
  weekOffset: number;
  maxWeekOffset: number;
  onOlder: () => void;
  onNewer: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOlder}
        disabled={weekOffset >= maxWeekOffset}
        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Older
      </button>
      <button
        type="button"
        onClick={onNewer}
        disabled={weekOffset === 0}
        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Newer
      </button>
    </div>
  );
}

export function TrackerWeekBarChart({
  data,
  title,
  summary,
  markerDates,
  markerLegend,
  valueLabel,
  gradient = "linear-gradient(180deg, var(--color-chart-warm-start) 0%, var(--color-chart-warm-end) 100%)",
}: {
  data: Array<{ date: string; value: number; weekdayLabel: string }>;
  title: string;
  summary: string;
  markerDates?: Set<string>;
  markerLegend?: string;
  valueLabel?: (value: number) => string;
  gradient?: string;
}) {
  const maxValue = Math.max(...data.map((day) => day.value), 0);

  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex h-[96px] items-end gap-[10px]">
        {data.map((day) => {
          const height = day.value === 0 ? 10 : Math.min(76, 18 + (day.value / Math.max(maxValue, 1)) * 58);
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-t-[999px]"
                style={{ height: `${height}px`, opacity: day.value === 0 ? 0.35 : 1, background: gradient }}
                title={`${day.weekdayLabel}: ${valueLabel ? valueLabel(day.value) : day.value}`}
              />
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: markerDates?.has(day.date) ? "var(--color-text-soft)" : "transparent" }}
              />
              <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                {day.weekdayLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-[19px] font-semibold text-[var(--color-text)]">{title}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{summary}</p>
        {markerDates && markerDates.size > 0 && markerLegend && (
          <p className="mt-2 text-[12px] text-[var(--color-text-soft)]">
            {markerLegend}
          </p>
        )}
      </div>
    </div>
  );
}

export function TrackerEntryTable({
  leftHeader = "When",
  mainHeader = "Details",
  columnsClassName = "grid-cols-[92px_minmax(0,1fr)]",
  children,
}: {
  leftHeader?: string;
  mainHeader?: string;
  columnsClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className={cn("grid gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-strong)]/55 px-4 py-2", columnsClassName)}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{leftHeader}</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{mainHeader}</p>
      </div>
      {children}
    </div>
  );
}

export function TrackerEntryRow({
  children,
  onClick,
  columnsClassName = "grid-cols-[92px_minmax(0,1fr)]",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  columnsClassName?: string;
  className?: string;
}) {
  const sharedClassName = cn(
    "grid w-full gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left first:border-t-0",
    columnsClassName,
    onClick ? "transition-colors hover:bg-[var(--color-bg-elevated)]" : "",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName}>
        {children}
      </button>
    );
  }

  return <div className={sharedClassName}>{children}</div>;
}
