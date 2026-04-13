import { AnimatePresence, motion } from "framer-motion";
import {
  getHydrationAccentColor,
  getHydrationBadgeClassName,
  getHydrationBadgeLabel,
  type DiaperPrediction,
  type HydrationStatus,
} from "../../lib/diaper-insights";
import { InsetPanel } from "../ui/page-layout";
import { Card, CardContent } from "../ui/card";
import { TrackerMetricPanel } from "../tracking/TrackerPrimitives";

export function DiaperStatusCard({
  dirtyPrediction,
  dirtyDiaperMeta,
  hydrationStatus,
  statusExpanded,
  todayDirtyCount,
  todayMixedCount,
  todayWetCount,
  wetPrediction,
  onToggleExpanded,
}: {
  dirtyPrediction: DiaperPrediction;
  dirtyDiaperMeta: { timeSinceLabel: string; stoolLabel: string | null; stoolColorLabel: string | null } | null;
  hydrationStatus: HydrationStatus;
  statusExpanded: boolean;
  todayDirtyCount: number;
  todayMixedCount: number;
  todayWetCount: number;
  wetPrediction: DiaperPrediction;
  onToggleExpanded: () => void;
}) {
  const accentColor = getHydrationAccentColor(hydrationStatus.tone);

  return (
    <Card className="relative overflow-hidden">
      <span
        aria-hidden="true"
        className="absolute bottom-1.5 left-0 top-1.5 w-1.5 rounded-r-full"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="overflow-hidden py-3.5 pl-7 pr-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current diaper status</p>
            <p className="mt-1 text-[0.95rem] font-semibold" style={{ color: accentColor }}>
              {hydrationStatus.title}
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.92rem] leading-snug text-[var(--color-text-secondary)]">{hydrationStatus.description}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${getHydrationBadgeClassName(hydrationStatus.tone)}`}>
            {getHydrationBadgeLabel(hydrationStatus.tone)}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--color-text-secondary)] transition-opacity hover:opacity-75"
          aria-expanded={statusExpanded}
        >
          {statusExpanded ? "See less" : "See more"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform ${statusExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.137l3.71-3.907a.75.75 0 1 1 1.08 1.04l-4.25 4.474a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        <AnimatePresence initial={false}>
          {statusExpanded && (
            <motion.div
              key="status-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -6 }}
                animate={{ y: 0 }}
                exit={{ y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="pt-2 pr-0.5"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <TrackerMetricPanel
                    eyebrow="Today output"
                    value={`${todayWetCount}/${todayDirtyCount}`}
                    description={`${todayWetCount} wet and ${todayDirtyCount} dirty so far`}
                    tone="healthy"
                  />
                  <TrackerMetricPanel
                    eyebrow="Mixed diapers"
                    value={`${todayMixedCount}`}
                    description="Counted in both wet and dirty totals"
                    tone="info"
                  />
                  <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely wet diaper</p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{wetPrediction.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{wetPrediction.detail}</p>
                      </div>
                      <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        hydration
                      </span>
                    </div>
                  </InsetPanel>
                  <InsetPanel className="col-span-2 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Dirty diaper rhythm</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{dirtyPrediction.detail}</p>
                    {dirtyDiaperMeta && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                          Last dirty: {dirtyDiaperMeta.timeSinceLabel}
                        </span>
                        {dirtyDiaperMeta.stoolLabel && (
                          <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                            {dirtyDiaperMeta.stoolLabel}
                          </span>
                        )}
                        {dirtyDiaperMeta.stoolColorLabel && (
                          <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                            {dirtyDiaperMeta.stoolColorLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </InsetPanel>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
