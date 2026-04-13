import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { InsetPanel } from "../ui/page-layout";
import { TrackerMetricPanel } from "../tracking/TrackerPrimitives";
import {
  buildSleepNarrative,
  formatPredictionRange,
  formatPredictionRelative,
  formatWakeBaselineRange,
  getPredictionDescription,
  getPredictionHeadline,
  getSleepStatusAccentColor,
  type SleepPrediction,
  type WakeBaseline,
  type WakeComparison,
  type WakeRisk,
} from "../../lib/sleep-insights";

export function SleepStatusCard({
  baseline,
  prediction,
  statusExpanded,
  wakeComparison,
  wakeRisk,
  onToggleExpanded,
}: {
  baseline: WakeBaseline;
  prediction: SleepPrediction | null;
  statusExpanded: boolean;
  wakeComparison: WakeComparison;
  wakeRisk: WakeRisk;
  onToggleExpanded: () => void;
}) {
  const accentColor = getSleepStatusAccentColor(wakeRisk);
  const narrative = buildSleepNarrative({ baseline, wakeComparison, wakeRisk, prediction });

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
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Current sleep status</p>
            <p className="mt-1 text-[0.95rem] font-semibold" style={{ color: accentColor }}>
              {wakeRisk.label === "High" ? "Next sleep needs attention" : wakeRisk.label === "Medium" ? "Next rest is approaching" : "Wake rhythm looks settled"}
            </p>
            <p className="mt-1 max-w-[34ch] text-[0.92rem] leading-snug text-[var(--color-text-secondary)]">{baseline.description}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${wakeRisk.label === "High"
            ? "bg-[var(--color-alert-bg)] text-[var(--color-alert)]"
            : wakeRisk.label === "Medium"
              ? "bg-[var(--color-caution-bg)] text-[var(--color-caution)]"
              : "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]"
            }`}>
            {wakeRisk.label === "High" ? "Watch" : wakeRisk.label === "Medium" ? "Soon" : "Normal"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-2 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--color-text-secondary)] transition-opacity hover:opacity-75"
          aria-expanded={statusExpanded}
        >
          {statusExpanded ? "See less" : "See more"}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${statusExpanded ? "rotate-180" : ""}`} aria-hidden="true">
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
              <motion.div initial={{ y: -6 }} animate={{ y: 0 }} exit={{ y: -6 }} transition={{ duration: 0.18, ease: "easeOut" }} className="pt-2 pr-0.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <TrackerMetricPanel eyebrow="Wake baseline" value={formatWakeBaselineRange(baseline)} description={wakeComparison.label} tone={wakeComparison.tone} />
                  <TrackerMetricPanel eyebrow="Due risk" value={wakeRisk.label} description={wakeRisk.description} tone={wakeRisk.tone} />
                  <InsetPanel className="col-span-2 border-[var(--color-info)]/18 bg-[var(--color-info-bg)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely sleep</p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">{getPredictionHeadline(prediction)}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {prediction ? getPredictionDescription(prediction) : "Needs at least two sleep logs to estimate a rhythm."}
                        </p>
                      </div>
                      {prediction && (
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-chip-text-on-light)]">
                          {prediction.confidence}
                        </span>
                      )}
                    </div>
                    {prediction && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">Typical wake: {prediction.intervalLabel}</span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">{formatPredictionRelative(prediction)}</span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">Source: {prediction.source === "history" ? "recent rhythm" : "age baseline"}</span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">Window: {formatPredictionRange(prediction)}</span>
                        {prediction.adjustments.slice(0, 2).map((adjustment) => (
                          <span key={adjustment.label} className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                            {adjustment.direction === "earlier" ? "Earlier" : "Later"}: {adjustment.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </InsetPanel>
                  <InsetPanel className="col-span-2 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">What this means</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{narrative}</p>
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
