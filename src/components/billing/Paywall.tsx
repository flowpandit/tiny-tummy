import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTrial } from "../../contexts/TrialContext";
import { Button } from "../ui/button";
import { Logo } from "../ui/Logo";
import { useToast } from "../ui/toast";

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LockIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const featureRows = [
  "Unlimited reports you can share with your pediatrician",
  "Dashboards for poop, feeding, sleep, growth, and milestones",
  "No subscription pressure, ads, or cloud account",
  "All records stay on this device unless you export them",
];

export function Paywall() {
  const navigate = useNavigate();
  const { unlockPremium } = useTrial();
  const { showSuccess } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const checkoutTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (checkoutTimerRef.current !== null) {
        window.clearTimeout(checkoutTimerRef.current);
      }
    };
  }, []);

  const handleCheckout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    checkoutTimerRef.current = window.setTimeout(async () => {
      try {
        await unlockPremium();
        showSuccess("Tiny Tummy unlocked.");
      } finally {
        if (isMountedRef.current) {
          setIsProcessing(false);
        }
      }
    }, 1200);
  };

  const handleRestore = () => {
    showSuccess("Restore will connect once native billing is wired.");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,#fffef8_0%,#fff5ea_42%,#ffe9dc_100%)] text-[var(--color-text)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 16, 0] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute left-[-12%] top-[-6%] h-64 w-64 rounded-full bg-[color:rgba(255,180,142,0.34)] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -18, 0], y: [0, -14, 0] }}
          transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute right-[-10%] top-[18%] h-72 w-72 rounded-full bg-[color:rgba(154,219,193,0.22)] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 14, 0], y: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute bottom-[-10%] left-[18%] h-72 w-72 rounded-full bg-[color:rgba(231,203,109,0.2)] blur-3xl"
        />
      </div>

      <div className="relative flex min-h-full flex-col px-5 pb-[calc(var(--safe-area-bottom)+20px)] pt-[calc(var(--safe-area-top)+20px)]">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-[20px] bg-white/72 p-2.5 shadow-[var(--shadow-soft)] ring-1 ring-white/70 backdrop-blur">
                <Logo className="h-full w-full" />
              </div>
              <div>
                <p className="font-[var(--font-display)] text-xl font-semibold tracking-[-0.03em]">Tiny Tummy</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Trial ended</p>
              </div>
            </div>
            <div className="rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)] backdrop-blur">
              Lifetime unlock
            </div>
          </motion.div>

          <div className="grid gap-10 pb-6 pt-10 lg:min-h-[calc(100svh-var(--safe-area-top)-var(--safe-area-bottom)-120px)] lg:grid-cols-[minmax(0,1.2fr)_380px] lg:items-center lg:gap-14 lg:pt-14">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/60 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] backdrop-blur"
              >
                <LockIcon className="h-4 w-4 text-[var(--color-primary)]" />
                Continue tracking with one purchase
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: "easeOut" }}
                className="max-w-[11ch] font-[var(--font-display)] text-5xl font-semibold tracking-[-0.04em] text-[var(--color-text)] sm:text-6xl"
              >
                Keep every baby health record in one private place.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
                className="mt-5 max-w-[34rem] text-lg leading-relaxed text-[var(--color-text-secondary)]"
              >
                Tiny Tummy stays focused on the daily details that matter: logs, patterns, reports, and handoff notes you can trust when something changes.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28, ease: "easeOut" }}
                className="mt-10 grid gap-4 sm:grid-cols-2"
              >
                {featureRows.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 rounded-[24px] border border-white/70 bg-white/58 px-4 py-4 shadow-[0_12px_30px_rgba(122,88,56,0.08)] backdrop-blur"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-[var(--color-text)]">{feature}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,248,241,0.96))] p-6 shadow-[var(--shadow-lg)] backdrop-blur-xl"
            >
              <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(43,57,86,0.28),transparent)]" />

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">One-time unlock</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-[var(--font-display)] text-6xl font-semibold tracking-[-0.05em]">$9.99</span>
                <span className="pb-2 text-sm text-[var(--color-text-secondary)]">once</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                No monthly billing. No ads. No cloud account required.
              </p>

              <div className="mt-8 space-y-3 border-y border-[var(--color-border)] py-5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--color-text-secondary)]">Reports and exports</span>
                  <span className="font-medium">Included</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--color-text-secondary)]">Offline storage</span>
                  <span className="font-medium">Included</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--color-text-secondary)]">Subscription</span>
                  <span className="font-medium text-[var(--color-healthy)]">None</span>
                </div>
              </div>

              <motion.div
                animate={isProcessing ? { y: [0, -2, 0] } : { y: 0 }}
                transition={{ duration: 0.6, repeat: isProcessing ? Number.POSITIVE_INFINITY : 0, ease: "easeInOut" }}
                className="mt-6"
              >
                <Button
                  className="h-14 w-full text-lg shadow-[0_18px_36px_rgba(43,57,86,0.18)]"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Processing unlock...
                    </span>
                  ) : (
                    "Unlock Tiny Tummy"
                  )}
                </Button>
              </motion.div>

              <button
                onClick={handleRestore}
                className="mt-3 w-full rounded-full px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-opacity active:opacity-60"
              >
                Restore purchases
              </button>

              <div className="mt-6 rounded-[24px] bg-[var(--color-surface-tint)] px-4 py-4">
                <p className="text-sm font-medium text-[var(--color-text)]">Your existing data stays on this device.</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Unlocking restores access to the app without moving your child records anywhere else.
                </p>
              </div>

              <button
                onClick={() => navigate("/privacy")}
                className="mt-5 text-sm font-medium text-[var(--color-primary)]"
              >
                Privacy policy
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
