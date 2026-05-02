import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "../ui/card";
import { InsetPanel } from "../ui/page-layout";
import { TrackerMetricPanel } from "../tracking/TrackerPrimitives";
import { HomeActionBottleIcon } from "../ui/icons";
import {
  formatFeedBaselineRange,
  formatPredictionRange,
  formatPredictionRelative,
  getFeedStatusAccentColor,
  getPredictionDescription,
  getPredictionHeadline,
  getWeekTrackedVolumeChip,
  type FeedBaseline,
  type FeedComparison,
  type FeedMixSnapshot,
  type FeedPrediction,
  type FeedRisk,
} from "../../lib/feed-insights";
import type { UnitSystem } from "../../lib/types";

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

function nextLikelyToneStyles(prediction: FeedPrediction | null) {
  if (prediction?.state === "overdue") {
    return {
      background: "var(--color-tracker-next-alert-surface)",
      color: "var(--color-tracker-next-alert-text)",
      borderColor: "var(--color-tracker-next-alert-border)",
    };
  }

  if (prediction?.state === "due") {
    return {
      background: "var(--color-tracker-next-caution-surface)",
      color: "var(--color-tracker-next-caution-text)",
      borderColor: "var(--color-tracker-next-caution-border)",
    };
  }

  return {
    background: "var(--color-tracker-next-healthy-surface)",
    color: "var(--color-tracker-next-healthy-text)",
    borderColor: "var(--color-tracker-next-healthy-border)",
  };
}

function FeedInsightArt({ accentColor }: { accentColor: string }) {
  return (
    <div
      className="pointer-events-none absolute bottom-5 right-5 hidden h-20 w-20 items-center justify-center rounded-full bg-[var(--color-tracker-art-surface)] md:flex"
      style={{ color: accentColor }}
      aria-hidden="true"
    >
      <HomeActionBottleIcon className="h-11 w-11" />
    </div>
  );
}

function NextLikelyTile({ prediction }: { prediction: FeedPrediction | null }) {
  const styles = nextLikelyToneStyles(prediction);

  return (
    <div
      className="min-w-0 rounded-[14px] border px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3"
      style={styles}
    >
      <div className="flex items-center gap-2">
        <HomeActionBottleIcon className="h-4.5 w-4.5 shrink-0" />
        <p className="min-w-0 text-[0.66rem] font-semibold uppercase tracking-[0.14em] md:text-[0.7rem]">
          Next feed
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
  baseline: FeedBaseline;
  baselineComparison: FeedComparison;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-next-neutral-surface)] px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] md:text-[0.7rem]">
        Usual rhythm
      </p>
      <p className="mt-1.5 text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
        {formatFeedBaselineRange(baseline)}
      </p>
      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
        {baselineComparison.label}
      </p>
    </div>
  );
}

function getStatusHeadline(dueRisk: FeedRisk) {
  if (dueRisk.label === "High") return "Feed window may be ready";
  if (dueRisk.label === "Medium") return "Next feed is getting close";
  return "Feeding rhythm looks settled";
}

function getStatusBadge(dueRisk: FeedRisk) {
  if (dueRisk.label === "High") {
    return {
      label: "Watch",
      className: "bg-[var(--color-alert-bg)] text-[var(--color-alert)]",
    };
  }

  if (dueRisk.label === "Medium") {
    return {
      label: "Soon",
      className: "bg-[var(--color-caution-bg)] text-[var(--color-caution)]",
    };
  }

  return {
    label: "Normal",
    className: "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]",
  };
}

export function FeedStatusCard({
  baseline,
  baselineComparison,
  dueRisk,
  feedMix,
  narrative,
  prediction,
  statusExpanded,
  unitSystem,
  weekTrackedMl,
  onToggleExpanded,
}: {
  baseline: FeedBaseline;
  baselineComparison: FeedComparison;
  dueRisk: FeedRisk;
  feedMix: FeedMixSnapshot;
  narrative: string;
  prediction: FeedPrediction | null;
  statusExpanded: boolean;
  unitSystem: UnitSystem;
  weekTrackedMl: number;
  onToggleExpanded: () => void;
}) {
  const accentColor = getFeedStatusAccentColor(dueRisk);
  const weekTrackedChip = getWeekTrackedVolumeChip(weekTrackedMl, unitSystem);
  const statusBadge = getStatusBadge(dueRisk);

  return (
    <Card
      className="relative h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--gradient-tracker-insight-feed)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <FeedInsightArt accentColor={accentColor} />
      <CardContent className="relative overflow-hidden p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 md:max-w-[calc(100%_-_96px)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#a86235] md:text-[0.74rem]">
              Feed insight
            </p>
            <p className="mt-3 text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.12rem]">
              {getStatusHeadline(dueRisk)}
            </p>
            <p className="mt-2 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              {dueRisk.description}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold md:px-3 md:text-[0.72rem] ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-2.5 md:mt-5 md:p-3">
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
          style={{ color: accentColor }}
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
                    value={formatFeedBaselineRange(baseline)}
                    description={baselineComparison.label}
                    tone={baselineComparison.tone}
                  />
                  <TrackerMetricPanel
                    eyebrow="Due risk"
                    value={dueRisk.label}
                    description={dueRisk.description}
                    tone={dueRisk.tone}
                  />
                  <InsetPanel className={`col-span-2 p-3 ${feedMix.tone === "info"
                    ? "border-[var(--color-info)]/18 bg-[var(--color-info-bg)]"
                    : feedMix.tone === "cta"
                      ? "border-[var(--color-cta)]/16 bg-[var(--color-surface-tint)]"
                      : "border-[var(--color-healthy)]/18 bg-[var(--color-healthy-bg)]"
                    }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">This week mix</p>
                        <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                          {feedMix.dominantLabel}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {feedMix.description}
                        </p>
                      </div>
                      {feedMix.dominantCount > 0 && (
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-tracker-chip-text)]">
                          {feedMix.dominantCount} logs
                        </span>
                      )}
                    </div>
                    {(feedMix.chips.length > 0 || weekTrackedChip) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {feedMix.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]"
                          >
                            {chip}
                          </span>
                        ))}
                        {weekTrackedChip && (
                          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]">
                            {weekTrackedChip}
                          </span>
                        )}
                      </div>
                    )}
                  </InsetPanel>
                  <InsetPanel className="col-span-2 border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Next likely feed</p>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--color-text)]">
                          {getPredictionHeadline(prediction)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {prediction ? getPredictionDescription(prediction) : "Needs at least two logged feeds to estimate a rhythm."}
                        </p>
                      </div>
                      {prediction && (
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-tracker-chip-text)]">
                          {prediction.confidence}
                        </span>
                      )}
                    </div>
                    {prediction && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]">
                          Typical gap: {prediction.intervalLabel}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]">
                          {formatPredictionRelative(prediction)}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]">
                          Source: {prediction.source === "history" ? "recent rhythm" : "age baseline"}
                        </span>
                        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]">
                          Window: {formatPredictionRange(prediction)}
                        </span>
                        {prediction.adjustments.slice(0, 2).map((adjustment) => (
                          <span
                            key={adjustment.label}
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-tracker-chip-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-tracker-chip-text)]"
                          >
                            {adjustment.direction === "earlier" ? "Earlier" : "Later"}: {adjustment.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </InsetPanel>
                  <InsetPanel className="col-span-2 border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
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
