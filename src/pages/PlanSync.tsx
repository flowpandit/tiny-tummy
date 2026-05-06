import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Logo } from "../components/ui/Logo";
import { useToast } from "../components/ui/toast";
import { useTrialAccess, useTrialActions } from "../contexts/TrialContext";
import { cn } from "../lib/cn";
import { getPremiumFeatureCopy } from "../lib/premium-feature-copy";
import { getUnlockNavigationState } from "../lib/unlock-navigation";
import type { BillingPurchaseResult } from "../lib/billing/types";

type PlanKey = "free" | "lifetime" | "sync";

interface PlanCardDefinition {
  key: PlanKey;
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  bullets: readonly string[];
}

interface ComparisonRow {
  choice: string;
  localAccess: string;
  syncAccess: string;
  cancellation: string;
}

export interface PlanSyncPageContentProps {
  isLifetimeUnlocked?: boolean;
  isProcessing?: boolean;
  featureLabel?: string | null;
  featureDescription?: string | null;
  onUnlockLifetime?: () => void;
  onRestore?: () => void;
  onClose?: () => void;
}

const planCards: readonly PlanCardDefinition[] = [
  {
    key: "free",
    title: "Free",
    subtitle: "Private local tracking, no account",
    price: "$0",
    bullets: [
      "Poop, diaper, feed & sleep logs",
      "Symptoms and basic episodes",
      "Recent history",
      "Basic caregiver handoff text",
      "One child profile",
      "No account required",
      "Data stays on this device",
    ],
  },
  {
    key: "lifetime",
    title: "Lifetime Private",
    subtitle: "Full local app, one-time purchase",
    price: "$14.99 once",
    badge: "Recommended",
    bullets: [
      "Everything in Free",
      "Unlimited history",
      "Pediatrician-ready PDF reports",
      "Caregiver handoff PDF",
      "Growth and milestones",
      "Backup/export",
      "Multi-child support",
      "No account, no cloud, no subscription",
    ],
  },
  {
    key: "sync",
    title: "Family Sync",
    subtitle: "Future optional shared care",
    price: "Coming later",
    badge: "Coming later",
    bullets: [
      "Everything in Lifetime while subscribed",
      "Invite partner or caregiver",
      "Sync logs across devices",
      'Shared "what happened today"',
      "Multi-device backup for logs",
      "Photos stay local by default",
      "Account required for sync",
    ],
  },
];

const comparisonRows: readonly ComparisonRow[] = [
  {
    choice: "Free",
    localAccess: "Useful local tracking",
    syncAccess: "Coming later",
    cancellation: "No purchase needed",
  },
  {
    choice: "Lifetime Private",
    localAccess: "Full local app forever",
    syncAccess: "No Family Sync",
    cancellation: "One-time purchase",
  },
  {
    choice: "Family Sync",
    localAccess: "Future add-on",
    syncAccess: "Not available yet",
    cancellation: "Will be separate from Lifetime Private.",
  },
];

const trustNotes = [
  "Free and Lifetime Private work without an account.",
  "Lifetime Private is a one-time purchase.",
  "Family Sync is optional and coming later.",
  "Photos are not synced by default.",
  "Your local data stays on this device unless you choose to export it.",
] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m4.5 10.4 3.2 3.2 7.8-8.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({
  card,
  isLifetimeUnlocked,
  isProcessing,
  onUnlockLifetime,
}: {
  card: PlanCardDefinition;
  isLifetimeUnlocked: boolean;
  isProcessing: boolean;
  onUnlockLifetime?: () => void;
}) {
  const isLifetime = card.key === "lifetime";
  const isSync = card.key === "sync";
  const isFree = card.key === "free";

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-[28px] border p-4 shadow-[var(--shadow-home-card)]",
        isLifetime && "shadow-[var(--shadow-card)]",
      )}
      style={{
        background: isLifetime
          ? "linear-gradient(145deg, color-mix(in srgb, var(--color-surface-tint) 76%, var(--color-surface-strong)), var(--color-surface-strong))"
          : isSync
            ? "linear-gradient(145deg, color-mix(in srgb, var(--color-healthy-bg) 42%, var(--color-surface-strong)), var(--color-surface-strong))"
            : "var(--color-surface-strong)",
        borderColor: isLifetime ? "color-mix(in srgb, var(--color-cta) 42%, var(--color-border))" : "var(--color-border)",
      }}
    >
      {card.badge && (
        <span
          className={cn(
            "mb-3 w-fit rounded-full px-2.5 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.08em]",
            isLifetime ? "bg-[var(--color-surface-tint)] text-[var(--color-primary)]" : "bg-[var(--color-healthy-bg)] text-[#496d59]",
          )}
        >
          {card.badge}
        </span>
      )}

      <div className="space-y-1">
        <h3 className="text-[1.18rem] font-extrabold leading-tight tracking-[-0.03em] text-[var(--color-text)]">
          {card.title}
        </h3>
        <p className="text-[0.82rem] leading-snug text-[var(--color-text-secondary)]">
          {card.subtitle}
        </p>
        <p className="pt-2 text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-[var(--color-text)]">
          {card.price}
        </p>
      </div>

      <ul className="mt-4 grid gap-2.5 text-[0.8rem] leading-snug text-[var(--color-text-secondary)]">
        {card.bullets.map((bullet) => (
          <li key={bullet} className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
            <CheckIcon className="mt-0.5 h-4 w-4 text-[var(--color-healthy)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        {isLifetime && (
          <Button
            type="button"
            variant="cta"
            className="h-11 w-full text-[0.88rem]"
            disabled={isLifetimeUnlocked || isProcessing}
            onClick={onUnlockLifetime}
          >
            {isLifetimeUnlocked ? "Unlocked" : isProcessing ? "Opening payment..." : "Unlock privately"}
          </Button>
        )}
        {isSync && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full text-[0.88rem]"
            disabled
          >
            Coming later
          </Button>
        )}
        {isFree && (
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full text-[0.88rem]"
            disabled
          >
            Included
          </Button>
        )}
      </div>
    </article>
  );
}

function ComparisonCard({ row }: { row: ComparisonRow }) {
  return (
    <article className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
      <h3 className="text-[0.9rem] font-extrabold leading-tight text-[var(--color-text)]">{row.choice}</h3>
      <dl className="mt-2 grid gap-2 text-[0.74rem] leading-snug">
        <div className="grid gap-0.5">
          <dt className="font-bold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">Local app</dt>
          <dd className="text-[var(--color-text-secondary)]">{row.localAccess}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="font-bold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">Family Sync</dt>
          <dd className="text-[var(--color-text-secondary)]">{row.syncAccess}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="font-bold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">If cancelled</dt>
          <dd className="text-[var(--color-text-secondary)]">{row.cancellation}</dd>
        </div>
      </dl>
    </article>
  );
}

export function PlanSyncPageContent({
  isLifetimeUnlocked = false,
  isProcessing = false,
  featureLabel,
  featureDescription,
  onUnlockLifetime,
  onRestore,
  onClose,
}: PlanSyncPageContentProps) {
  return (
    <div
      className="min-h-screen overflow-y-auto overflow-x-hidden text-[var(--color-text)]"
      style={{
        background: "linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg) 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-72 w-72 rounded-full bg-[rgba(255,180,142,0.2)] blur-3xl" />
        <div className="absolute right-[-26%] top-[14%] h-80 w-80 rounded-full bg-[rgba(154,219,193,0.14)] blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-[calc(var(--safe-area-bottom)+24px)] pt-[calc(var(--safe-area-top)+18px)] md:px-6 md:py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-2.5 shadow-[var(--shadow-soft)]">
              <Logo className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-[-0.03em]">Tiny Tummy</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {isLifetimeUnlocked ? "Lifetime Private unlocked" : "Free plan active"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-soft)]"
          >
            Not now
          </button>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          aria-labelledby="plan-sync-title"
          className="rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] md:p-6"
        >
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-1.5 text-[0.78rem] font-bold text-[var(--color-text-secondary)]">
              {featureLabel ?? "Free now. Lifetime Private when you need more."}
            </span>
            <h1 id="plan-sync-title" className="mt-4 max-w-[13ch] text-[2.3rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[var(--color-text)] md:text-[3.4rem]">
              Choose how Tiny Tummy works for your family
            </h1>
            <p className="mt-4 max-w-[42rem] text-[0.98rem] leading-7 text-[var(--color-text-secondary)] md:text-[1.05rem]">
              {featureDescription ?? "Use Tiny Tummy privately on this device, or add Family Sync later when your family needs shared logging."}
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {planCards.map((card) => (
              <PlanCard
                key={card.key}
                card={card}
                isLifetimeUnlocked={isLifetimeUnlocked}
                isProcessing={isProcessing}
                onUnlockLifetime={onUnlockLifetime}
              />
            ))}
          </div>

          <section aria-labelledby="plan-comparison-title" className="mt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="plan-comparison-title" className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-[var(--color-text)]">
                  Plan access
                </h2>
                <p className="mt-1 max-w-[42rem] text-[0.84rem] leading-6 text-[var(--color-text-secondary)]">
                  Free is the private preview experience. Lifetime Private unlocks the full local app. Family Sync is not available yet.
                </p>
              </div>
              {onRestore && (
                <button
                  type="button"
                  onClick={onRestore}
                  className="w-fit rounded-full px-3 py-2 text-[0.8rem] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tint)]"
                >
                  Restore purchases
                </button>
              )}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {comparisonRows.map((row) => (
                <ComparisonCard key={row.choice} row={row} />
              ))}
            </div>
          </section>

          <ul className="mt-5 grid gap-2 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-3 md:grid-cols-2">
            {trustNotes.map((note) => (
              <li key={note} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2 text-[0.78rem] font-semibold leading-5 text-[var(--color-text-secondary)]">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-cta)]" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </main>
    </div>
  );
}

export function PlanSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessKind } = useTrialAccess();
  const { restorePremium, unlockPremium } = useTrialActions();
  const { showError, showInfo, showSuccess } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const unlockState = getUnlockNavigationState(location.state);
  const featureCopy = unlockState.featureId ? getPremiumFeatureCopy(unlockState.featureId) : null;
  const isLifetimeUnlocked = accessKind === "premium";

  const showNonSuccessResult = (result: BillingPurchaseResult, fallback: string) => {
    if (result.code === "cancelled") return;
    if (result.code === "pending" || result.code === "no_purchase_found" || result.code === "unavailable" || result.code === "offline") {
      showInfo(result.message ?? fallback);
      return;
    }
    showError(result.message ?? fallback);
  };

  const handleUnlock = async () => {
    if (isLifetimeUnlocked || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await unlockPremium();
      if (!result.ok) {
        showNonSuccessResult(result, "Purchase could not be completed.");
        return;
      }
      showSuccess("Lifetime Private unlocked.");
      navigate(unlockState.returnTo, { replace: true });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unlock failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await restorePremium();
      if (!result.ok) {
        showNonSuccessResult(result, "Restore could not be completed.");
        return;
      }
      showSuccess("Purchase restored.");
      navigate(unlockState.returnTo, { replace: true });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Restore failed. Please try again.");
    }
  };

  return (
    <PlanSyncPageContent
      isLifetimeUnlocked={isLifetimeUnlocked}
      isProcessing={isProcessing}
      featureLabel={featureCopy?.label}
      featureDescription={featureCopy?.description}
      onUnlockLifetime={() => {
        void handleUnlock();
      }}
      onRestore={() => {
        void handleRestore();
      }}
      onClose={() => navigate(unlockState.returnTo)}
    />
  );
}
