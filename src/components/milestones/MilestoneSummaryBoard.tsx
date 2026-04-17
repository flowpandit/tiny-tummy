import { Avatar } from "../child/Avatar";
import { Button } from "../ui/button";
import { cn } from "../../lib/cn";

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MetricCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-5 py-4 shadow-[var(--shadow-card)]"
      style={{
        backgroundImage: `radial-gradient(circle at 68% 22%, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 48%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(from 180deg, ${accent} 0 138deg, color-mix(in srgb, ${accent} 12%, transparent) 138deg 360deg)`,
          }}
        >
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--color-surface-strong)] text-2xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
            {value}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
        {label}
      </p>
    </div>
  );
}

export function MilestoneSummaryBoard({
  child,
  journeyCopy,
  totalMilestones,
  lastThirtyDays,
  onAddMilestone,
}: {
  child: { id: string; name: string; avatar_color: string };
  journeyCopy: string;
  totalMilestones: number;
  lastThirtyDays: number;
  onAddMilestone: () => void;
}) {
  return (
    <section className="space-y-5">
      <div
        className={cn(
          "relative overflow-hidden rounded-[34px] border border-[var(--color-border)] px-6 pb-7 pt-6 text-center shadow-[var(--shadow-lg)]",
          "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-surface-strong)_96%,transparent)_0%,color-mix(in_srgb,var(--color-bg-elevated)_76%,transparent)_100%)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-cta) 20%, transparent) 0%, transparent 58%)",
          }}
        />
        <div className="relative mx-auto flex w-fit flex-col items-center">
          <div className="rounded-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_68%,white)_0%,color-mix(in_srgb,var(--color-cta)_62%,white)_100%)] p-[3px] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            <Avatar
              childId={child.id}
              name={child.name}
              color={child.avatar_color}
              size="lg"
              className="h-20 w-20 border-2 border-white/70"
            />
          </div>
          <h1 className="mt-5 font-[var(--font-display)] text-[2.2rem] font-semibold tracking-[-0.04em] text-[var(--color-text)]">
            {child.name}&apos;s Journey
          </h1>
          <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {journeyCopy}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard value={String(totalMilestones)} label="Total milestones" accent="var(--color-cta)" />
        <MetricCard value={String(lastThirtyDays)} label="Last 30 days" accent="var(--color-info)" />
      </div>

      <Button
        type="button"
        variant="cta"
        size="lg"
        className="w-full gap-2 text-[1.02rem] shadow-[var(--shadow-medium)]"
        onClick={onAddMilestone}
      >
        <PlusGlyph />
        Add milestone
      </Button>
    </section>
  );
}
