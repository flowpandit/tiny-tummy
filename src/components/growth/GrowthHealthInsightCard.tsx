import { AnimatePresence, motion } from "framer-motion";
import type { GrowthPercentileResult } from "../../lib/growth-percentiles";
import { countGrowthMeasures } from "../../lib/growth-view";
import type { GrowthEntry } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";
import { InsetPanel } from "../ui/page-layout";

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

function GrowthShieldArt() {
  return (
    <div className="pointer-events-none absolute bottom-5 right-5 hidden h-20 w-20 items-center justify-center rounded-full bg-[var(--color-tracker-art-surface)] md:flex" aria-hidden="true">
      <svg viewBox="0 0 96 96" className="h-full w-full">
        <path d="M48 15 72 25.2v19.5c0 17.3-9.8 28.3-24 36.3-14.2-8-24-19-24-36.3V25.2L48 15Z" fill="#8fdab1" />
        <path d="m37 47.5 7.1 7.1L59.5 39" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M78 28c2 5 4 7 9 9-5 2-7 4-9 9-2-5-4-7-9-9 5-2 7-4 9-9Z" fill="#bcefdc" />
        <path d="M16 50c1.5 3.7 3.1 5.3 6.8 6.8-3.7 1.5-5.3 3.1-6.8 6.8-1.5-3.7-3.1-5.3-6.8-6.8 3.7-1.5 5.3-3.1 6.8-6.8Z" fill="#bcefdc" />
      </svg>
    </div>
  );
}

function getBadge(sexMissing: boolean, latest: GrowthEntry | null) {
  if (sexMissing) {
    return {
      label: "Needs profile",
      className: "bg-[var(--color-caution-bg)] text-[var(--color-caution)]",
    };
  }

  if (!latest) {
    return {
      label: "Ready",
      className: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
    };
  }

  return {
    label: "On track",
    className: "bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]",
  };
}

function getInsightCopy({
  childName,
  latest,
  sexMissing,
}: {
  childName: string;
  latest: GrowthEntry | null;
  sexMissing: boolean;
}) {
  if (sexMissing) {
    return {
      title: "Percentiles need one profile detail",
      detail: "Add child sex in Settings to compare each measurement with the right reference chart.",
    };
  }

  if (!latest) {
    return {
      title: "Ready for a first check-in",
      detail: "Log the measurements you have today, then the chart will keep the trend visible.",
    };
  }

  return {
    title: `${childName} is growing steadily`,
    detail: "Measurements are saved with percentile context so changes are easier to follow over time.",
  };
}

export function GrowthHealthInsightCard({
  activeMetricLabel,
  activeMetricPercentile,
  childName,
  growthReference,
  latest,
  oldestLog,
  statusExpanded,
  totalMeasurementsLogged,
  sexMissing,
  onToggleExpanded,
}: {
  activeMetricLabel: string;
  activeMetricPercentile: GrowthPercentileResult | null;
  childName: string;
  growthReference: string;
  latest: GrowthEntry | null;
  oldestLog: GrowthEntry | null;
  statusExpanded: boolean;
  totalMeasurementsLogged: number;
  sexMissing: boolean;
  onToggleExpanded: () => void;
}) {
  const badge = getBadge(sexMissing, latest);
  const copy = getInsightCopy({ childName, latest, sexMissing });

  return (
    <Card
      className="relative h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[20px]"
      style={{
        background: "var(--gradient-tracker-insight-growth)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <GrowthShieldArt />
      <CardContent className="relative overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 md:max-w-[calc(100%_-_96px)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-healthy)] md:text-[0.74rem]">
              Health insight
            </p>
            <p className="mt-3 text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.12rem]">
              {copy.title}
            </p>
            <p className="mt-2 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              {copy.detail}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold md:px-3 md:text-[0.72rem] ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="mt-4 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[var(--color-healthy)] transition-opacity hover:opacity-75 md:text-[0.82rem]"
          aria-expanded={statusExpanded}
        >
          {statusExpanded ? "See less" : "See more"}
          <ChevronIcon expanded={statusExpanded} />
        </button>

        <AnimatePresence initial={false}>
          {statusExpanded && (
            <motion.div
              key="growth-insight-details"
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
                className="grid gap-2 pt-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <InsetPanel className="border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Reference</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{growthReference}</p>
                  </InsetPanel>
                  <InsetPanel className="border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Latest set</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{countGrowthMeasures(latest)}/3</p>
                  </InsetPanel>
                </div>
                <InsetPanel className="border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Trend focus</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                    {activeMetricPercentile
                      ? `${activeMetricLabel} is currently around ${activeMetricPercentile.percentileLabel.toLowerCase()} on the ${activeMetricPercentile.reference} reference.`
                      : sexMissing
                        ? "Profile details are needed before percentiles can be calculated."
                        : `Add a ${activeMetricLabel.toLowerCase()} measurement to start this trend.`}
                  </p>
                </InsetPanel>
                <InsetPanel className="border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Saved history</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                    {oldestLog
                      ? `${totalMeasurementsLogged} measures saved since ${formatDate(oldestLog.measured_at)}.`
                      : "Add a first measurement to build the growth history."}
                  </p>
                </InsetPanel>
                {latest?.notes && (
                  <InsetPanel className="border-[var(--color-home-card-border)] bg-[var(--color-tracker-panel-surface)] p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Latest note</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{latest.notes}</p>
                  </InsetPanel>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
