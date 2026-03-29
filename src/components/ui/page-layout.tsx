import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

export function PageBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-5 space-y-6", className)} {...props} />;
}

export function PageBackLink({
  to,
  label,
  className,
}: {
  to: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]",
        className,
      )}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
      </svg>
      {label}
    </Link>
  );
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
        <h3 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
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
