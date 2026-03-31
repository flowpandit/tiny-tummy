import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

export interface DiscoveryLinkItem {
  to: string;
  title: string;
  description: string;
  tone?: "default" | "info" | "healthy" | "cta";
}

export function DiscoveryLinks({
  eyebrow,
  title,
  description,
  items,
  compact = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  items: DiscoveryLinkItem[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
            {eyebrow}
          </p>
        )}
        <p className={cn(
          "font-semibold tracking-[-0.03em] text-[var(--color-text)]",
          compact ? "mt-1.5 text-[18px]" : "mt-2 text-[22px]",
        )}>
          {title}
        </p>
        {description && (
          <p className={cn(
            "max-w-[44ch] leading-relaxed text-[var(--color-text-secondary)]",
            compact ? "mt-1.5 text-[13px]" : "mt-2 text-[14px]",
          )}>
            {description}
          </p>
        )}
      </div>

      <div className={cn("mt-4 grid grid-cols-2 gap-3", compact && "gap-2.5")}>
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "group rounded-[16px] border px-4 py-3 transition-colors",
              item.tone === "info" && "border-[var(--color-info)]/18 bg-[var(--color-info-bg)] hover:bg-[var(--color-info-bg)]/75",
              item.tone === "healthy" && "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)] hover:bg-[var(--color-healthy-bg)]/78",
              item.tone === "cta" && "border-[var(--color-cta)]/16 bg-[var(--color-surface-tint)] hover:bg-[var(--color-surface-tint)]/78",
              (!item.tone || item.tone === "default") && "border-[var(--color-border)] bg-[var(--color-surface-strong)] hover:bg-white/70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn(
                  "font-semibold text-[var(--color-text)]",
                  compact ? "text-[14px]" : "text-[15px]",
                )}>
                  {item.title}
                </p>
                <p className={cn(
                  "leading-relaxed text-[var(--color-text-secondary)]",
                  compact ? "mt-1 text-[12px]" : "mt-1.5 text-[12px]",
                )}>
                  {item.description}
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-soft)] transition-transform group-hover:translate-x-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
