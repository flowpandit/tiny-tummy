import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { InsetPanel } from "../ui/page-layout";
import { TrackerMetricPanel } from "../tracking/TrackerPrimitives";
import { PoopIcon } from "../ui/icons";
import {
  formatBaselineRange,
  formatPredictionRange,
  formatPredictionRelative,
  getPredictionDescription,
  getPredictionHeadline,
  type AgeBaseline,
  type BaselineComparison,
  type DueRisk,
  type PoopPrediction,
} from "../../lib/poop-insights";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.137l3.71-3.907a.75.75 0 1 1 1.08 1.04l-4.25 4.474a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function nextLikelyToneStyles(prediction: PoopPrediction | null) {
  if (prediction?.state === "overdue") {
    return {
      background: "rgba(255, 239, 235, 0.86)",
      color: "#a64236",
      borderColor: "rgba(226, 92, 77, 0.18)",
    };
  }

  if (prediction?.state === "due") {
    return {
      background: "rgba(255, 247, 231, 0.9)",
      color: "#95671c",
      borderColor: "rgba(233, 200, 125, 0.28)",
    };
  }

  return {
    background: "rgba(230, 249, 239, 0.86)",
    color: "#167553",
    borderColor: "rgba(68, 185, 166, 0.14)",
  };
}

function InsightPoopArt({ accentColor }: { accentColor: string }) {
  return (
    <div className="pointer-events-none absolute bottom-5 right-5 hidden h-20 w-20 items-center justify-center rounded-full bg-white/42 md:flex" aria-hidden="true">
      <PoopIcon className="h-11 w-11" color={accentColor} />
    </div>
  );
}

function NextLikelyTile({
  prediction,
}: {
  prediction: PoopPrediction | null;
}) {
  const styles = nextLikelyToneStyles(prediction);

  return (
    <div
      className="min-w-0 rounded-[14px] border px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3"
      style={styles}
    >
      <div className="flex items-center gap-2">
        <PoopIcon className="h-4.5 w-4.5 shrink-0" color="currentColor" />
        <p className="min-w-0 text-[0.66rem] font-semibold uppercase tracking-[0.14em] md:text-[0.7rem]">
          Next poop
        </p>
      </div>
      <p className="mt-1.5 text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
        {getPredictionHeadline(prediction)}
      </p>
      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
        {prediction ? getPredictionDescription(prediction) : "A couple of logs will personalize the next window."}
      </p>
    </div>
  );
}

function BaselineTile({
  baseline,
  baselineComparison,
}: {
  baseline: AgeBaseline;
  baselineComparison: BaselineComparison;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[var(--color-home-card-border)] bg-white/62 px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] md:text-[0.7rem]">
        Usual rhythm
      </p>
      <p className="mt-1.5 text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
        {formatBaselineRange(baseline)}
      </p>
      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
        {baselineComparison.label}
      </p>
    </div>
  );
}

export function PoopHealthInsightCard({
  baseline,
  baselineComparison,
  dueRisk,
  healthInsight,
  patternNarrative,
  prediction,
  statusBadge,
  statusExpanded,
  onToggleExpanded,
}: {
  baseline: AgeBaseline;
  baselineComparison: BaselineComparison;
  dueRisk: DueRisk;
  healthInsight: { title: string; detail: string; accentColor: string };
  patternNarrative: string;
  prediction: PoopPrediction | null;
  statusBadge: { label: string; className: string };
  statusExpanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <Card
      className="relative h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "linear-gradient(135deg, rgba(255, 248, 242, 0.92) 0%, var(--color-home-card-surface) 58%, rgba(245, 255, 249, 0.9) 100%)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <InsightPoopArt accentColor={healthInsight.accentColor} />
      <CardContent className="relative overflow-hidden p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 md:max-w-[calc(100%_-_96px)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#a86235] md:text-[0.74rem]">
              Poop insight
            </p>
            <p className="mt-3 text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.12rem]">
              {healthInsight.title}
            </p>
            <p className="mt-2 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              {healthInsight.detail}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold md:px-3 md:text-[0.72rem] ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-home-card-border)] bg-white/54 p-2.5 md:mt-5 md:p-3">
          <p className="px-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.72rem]">
            Next likely
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NextLikelyTile prediction={prediction} />
            <BaselineTile baseline={baseline} baselineComparison={baselineComparison} />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold transition-opacity hover:opacity-75 md:text-[0.82rem]"
          style={{ color: healthInsight.accentColor }}
          aria-expanded={statusExpanded}
        >
          {statusExpanded ? "See less" : "See more"}
          <ChevronIcon expanded={statusExpanded} />
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
                className="pt-3 pr-0.5"
              >
                <div className="grid grid-cols-2 gap-2">
                  <TrackerMetricPanel
                    eyebrow="Age baseline"
                    value={formatBaselineRange(baseline)}
                    description={baseline.label}
                    tone={baselineComparison.tone}
                  />
                  <TrackerMetricPanel
                    eyebrow="Due risk"
                    value={dueRisk.label}
                    description={dueRisk.description}
                    tone={dueRisk.tone}
                  />
                  <InsetPanel className="col-span-2 border-[var(--color-home-card-border)] bg-white/54 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely poop</p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                          {getPredictionHeadline(prediction)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {prediction ? getPredictionDescription(prediction) : "Needs at least two real poop logs to estimate a rhythm."}
                        </p>
                      </div>
                      {prediction && (
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                          {prediction.confidence}
                        </span>
                      )}
                    </div>
                    {prediction && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                          Typical gap: {prediction.intervalLabel}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                          {formatPredictionRelative(prediction)}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                          Source: {prediction.source === "history" ? "recent rhythm" : "age baseline"}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]">
                          Window: {formatPredictionRange(prediction)}
                        </span>
                        {prediction.adjustments.slice(0, 2).map((adjustment) => (
                          <span
                            key={adjustment.label}
                            className="rounded-full border border-[var(--color-border)] bg-white/55 px-2.5 py-1 text-[11px] font-medium text-[var(--color-chip-text-on-light)]"
                          >
                            {adjustment.direction === "earlier" ? "Earlier" : "Later"}: {adjustment.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </InsetPanel>
                  <InsetPanel className="col-span-2 border-[var(--color-home-card-border)] bg-white/54 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">What this means</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{patternNarrative}</p>
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
