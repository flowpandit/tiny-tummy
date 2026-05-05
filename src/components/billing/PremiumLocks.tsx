import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePremiumFeature } from "../../contexts/TrialContext";
import { cn } from "../../lib/cn";
import type { PremiumFeatureId } from "../../lib/feature-access";
import { getPremiumFeatureCopy } from "../../lib/premium-feature-copy";
import { Button } from "../ui/button";

type PremiumLockTone = "default" | "compact";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function PremiumBadge({
  featureId,
  className,
}: {
  featureId?: PremiumFeatureId;
  className?: string;
}) {
  const label = featureId ? getPremiumFeatureCopy(featureId).label : "Premium";

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]",
      className,
    )}>
      <LockIcon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function PremiumInlineLock({
  featureId,
  title,
  description,
  tone = "default",
  className,
  actionLabel = "Unlock",
}: {
  featureId: PremiumFeatureId;
  title?: string;
  description?: string;
  tone?: PremiumLockTone;
  className?: string;
  actionLabel?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const copy = getPremiumFeatureCopy(featureId);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div
      className={cn(
        "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_14px_34px_rgba(172,139,113,0.08)]",
        tone === "compact" ? "px-4 py-3" : "px-5 py-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-tint)] text-[var(--color-primary)]",
          tone === "compact" ? "h-9 w-9" : "h-11 w-11",
        )}>
          <LockIcon className={tone === "compact" ? "h-4.5 w-4.5" : "h-5 w-5"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge featureId={featureId} />
          </div>
          <p className={cn(
            "mt-2 font-semibold leading-tight text-[var(--color-text)]",
            tone === "compact" ? "text-[0.95rem]" : "text-lg",
          )}>
            {title ?? copy.title}
          </p>
          <p className={cn(
            "mt-1 leading-relaxed text-[var(--color-text-secondary)]",
            tone === "compact" ? "text-xs" : "text-sm",
          )}>
            {description ?? copy.description}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className={cn("mt-4 border border-[var(--color-border)]", tone === "compact" && "h-10 text-sm")}
        onClick={() => navigate("/unlock", { state: { featureId, returnTo } })}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export function PremiumFeatureGate({
  featureId,
  children,
  fallback,
}: {
  featureId: PremiumFeatureId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const canUseFeature = usePremiumFeature(featureId);
  if (canUseFeature) return <>{children}</>;
  return <>{fallback ?? <PremiumInlineLock featureId={featureId} />}</>;
}
