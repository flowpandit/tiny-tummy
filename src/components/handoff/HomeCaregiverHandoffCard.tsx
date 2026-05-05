import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";

function HandoffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M8.5 4.75h7A2.75 2.75 0 0 1 18.25 7.5v9A2.75 2.75 0 0 1 15.5 19.25h-7A2.75 2.75 0 0 1 5.75 16.5v-9A2.75 2.75 0 0 1 8.5 4.75Z" />
      <path d="M9 9h6" />
      <path d="M9 12h6" />
      <path d="M9 15h3.5" />
      <path d="M10 3.75h4" />
    </svg>
  );
}

export function HomeCaregiverHandoffCard({ className }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={cn("px-4 md:px-10", className)}>
      <button
        type="button"
        onClick={() => navigate("/handoff")}
        className="flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left shadow-[0_14px_28px_rgba(172,139,113,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 md:rounded-[24px] md:px-5 md:py-4"
        style={{
          background: "var(--color-home-card-surface)",
          borderColor: "var(--color-home-card-border)",
        }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-info-bg)] text-[var(--color-info)] md:h-12 md:w-12">
          <HandoffIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
            Caregiver handoff
          </span>
          <span className="mt-1 block text-[1rem] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text)] md:text-[1.12rem]">
            Today, last events, watch items
          </span>
        </span>
        <span aria-hidden="true" className="text-[1.45rem] leading-none text-[var(--color-home-chevron)]">&rsaquo;</span>
      </button>
    </div>
  );
}
