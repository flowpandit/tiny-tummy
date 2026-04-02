import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: string;
  action?: ReactNode;
  className?: string;
}

export function PageIntro({ eyebrow, title, description, meta, action, className }: PageIntroProps) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/88 p-5 shadow-[var(--shadow-soft)]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">{eyebrow}</p>
          <h2 className="mt-2 font-[var(--font-display)] text-[2.35rem] font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--color-text)]">
            {title}
          </h2>
          {description && (
            <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-[var(--color-text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {meta && (
        <p className="mt-4 text-xs text-[var(--color-text-soft)]">
          {meta}
        </p>
      )}
    </div>
  );
}
