import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function PageBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 space-y-6 px-4 py-5 md:px-6 lg:px-8", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
            {eyebrow}
          </p>
        )}
        <h3 className="mt-1 text-[2rem] font-semibold tracking-[-0.03em] text-[var(--color-text)]">
          {title}
        </h3>
        {description && (
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CompactPageHeader<TValue extends string | number>({
  eyebrow,
  title,
  value,
  options,
  onChange,
  className,
}: {
  eyebrow?: string;
  title: string;
  value: TValue;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 text-2xl text-[var(--color-text)] sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="flex shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200",
              value === option.value
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InsetPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/72 p-4",
        className,
      )}
      {...props}
    />
  );
}

export function StatGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)} {...props} />;
}

export function StatTile({
  eyebrow,
  value,
  description,
  tone = "default",
  className,
}: {
  eyebrow: string;
  value: ReactNode;
  description: ReactNode;
  tone?: "default" | "info" | "healthy" | "cta";
  className?: string;
}) {
  return (
    <InsetPanel
      className={cn(
        tone === "default" && "bg-[var(--color-bg-elevated)]/76",
        tone === "info" && "border-[var(--color-info)]/18 bg-[var(--color-info-bg)]",
        tone === "healthy" && "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)]",
        tone === "cta" && "border-[var(--color-cta)]/16 bg-[var(--color-surface-tint)]",
        className,
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-soft)]">{eyebrow}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
    </InsetPanel>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-8 text-center", className)}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-elevated)]">
        {icon}
      </div>
      <p className="mt-4 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{title}</p>
      <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
