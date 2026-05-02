import { AnimatePresence, motion } from "framer-motion";
import { diaperDirtyIcon, diaperWetIcon } from "../../assets/icons";
import {
  getHydrationAccentColor,
  getHydrationBadgeClassName,
  type DiaperPrediction,
  type DiaperNextLikelyEstimate,
  type HydrationStatus,
} from "../../lib/diaper-insights";
import { InsetPanel } from "../ui/page-layout";
import { Card, CardContent } from "../ui/card";

function getHydrationBadgeText(tone: HydrationStatus["tone"]) {
  if (tone === "cta") return "Watch";
  if (tone === "info") return "Track";
  return "Good";
}

function getHydrationTitle(childName: string, tone: HydrationStatus["tone"]) {
  if (tone === "cta") return `Check ${childName}'s wet output`;
  if (tone === "info") return `${childName}'s wet output needs logging`;
  return `${childName}'s hydration looks good`;
}

function getHydrationDetail(status: HydrationStatus) {
  if (status.tone === "healthy") {
    return "Keep logging wet diapers to spot changes early.";
  }

  return status.description;
}

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

function HydrationDropArt({ tone }: { tone: HydrationStatus["tone"] }) {
  const faceColor = tone === "cta" ? "#cb7f74" : tone === "info" ? "#6f8fd5" : "#1f8c74";

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 hidden h-24 w-24 md:block" aria-hidden="true">
      <svg viewBox="0 0 96 96" className="h-full w-full">
        <path d="M48 10c-9.9 12.5-24 29.3-24 43.7C24 68 34.7 79 48 79s24-11 24-25.3C72 39.3 57.9 22.5 48 10Z" fill="#c7efdb" stroke="#9bdfc0" strokeWidth="3" />
        <ellipse cx="48" cy="82" rx="26" ry="4" fill="#a8ddc1" opacity=".48" />
        <circle cx="40" cy="55" r="2.5" fill={faceColor} />
        <circle cx="56" cy="55" r="2.5" fill={faceColor} />
        <path d="M42 64c4 4 8 4 12 0" fill="none" stroke={faceColor} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M79 27c2 5 4 7 9 9-5 2-7 4-9 9-2-5-4-7-9-9 5-2 7-4 9-9Z" fill="#bcefdc" />
        <path d="M17 41c1.5 3.7 3.1 5.3 6.8 6.8-3.7 1.5-5.3 3.1-6.8 6.8-1.5-3.7-3.1-5.3-6.8-6.8 3.7-1.5 5.3-3.1 6.8-6.8Z" fill="#bcefdc" />
      </svg>
    </div>
  );
}

function nextLikelyToneStyles(tone: DiaperNextLikelyEstimate["tone"]) {
  if (tone === "dirty") {
    return {
      background: "rgba(255, 241, 235, 0.82)",
      color: "#a24f21",
      borderColor: "rgba(244, 123, 49, 0.14)",
    };
  }

  if (tone === "soon") {
    return {
      background: "rgba(255, 247, 231, 0.9)",
      color: "#95671c",
      borderColor: "rgba(233, 200, 125, 0.28)",
    };
  }

  if (tone === "baseline") {
    return {
      background: "rgba(255, 255, 255, 0.62)",
      color: "var(--color-text-secondary)",
      borderColor: "var(--color-home-card-border)",
    };
  }

  return {
    background: "rgba(230, 249, 239, 0.86)",
    color: "#167553",
    borderColor: "rgba(68, 185, 166, 0.14)",
  };
}

function NextLikelyTile({
  estimate,
  icon,
}: {
  estimate: DiaperNextLikelyEstimate;
  icon: string;
}) {
  const styles = nextLikelyToneStyles(estimate.tone);

  return (
    <div
      className="min-w-0 rounded-[14px] border px-3 py-2.5 md:rounded-[16px] md:px-3.5 md:py-3"
      style={styles}
    >
      <div className="flex items-center gap-2">
        <img src={icon} alt="" aria-hidden="true" className="h-4.5 w-4.5 shrink-0 object-contain" />
        <p className="min-w-0 text-[0.66rem] font-semibold uppercase tracking-[0.14em] md:text-[0.7rem]">
          {estimate.label}
        </p>
      </div>
      <p className="mt-1.5 text-[0.9rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
        {estimate.value}
      </p>
      <p className="mt-1 text-[0.68rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.72rem]">
        {estimate.detail}
      </p>
    </div>
  );
}

export function DiaperStatusCard({
  childName,
  dirtyPrediction,
  dirtyDiaperMeta,
  hydrationStatus,
  nextPoopEstimate,
  nextWetEstimate,
  statusExpanded,
  todayDirtyCount,
  todayMixedCount,
  todayWetCount,
  onToggleExpanded,
}: {
  childName: string;
  dirtyPrediction: DiaperPrediction;
  dirtyDiaperMeta: { timeSinceLabel: string; stoolLabel: string | null; stoolColorLabel: string | null } | null;
  hydrationStatus: HydrationStatus;
  nextPoopEstimate: DiaperNextLikelyEstimate;
  nextWetEstimate: DiaperNextLikelyEstimate;
  statusExpanded: boolean;
  todayDirtyCount: number;
  todayMixedCount: number;
  todayWetCount: number;
  onToggleExpanded: () => void;
}) {
  const accentColor = getHydrationAccentColor(hydrationStatus.tone);

  return (
    <Card
      className="relative h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "linear-gradient(135deg, rgba(245, 255, 249, 0.9) 0%, var(--color-home-card-surface) 62%, rgba(255, 250, 244, 0.92) 100%)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <HydrationDropArt tone={hydrationStatus.tone} />
      <CardContent className="relative overflow-hidden p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 md:max-w-[calc(100%_-_112px)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#0ca66f] md:text-[0.74rem]">
              Diaper insight
            </p>
            <p className="mt-3 text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.12rem]">
              {getHydrationTitle(childName, hydrationStatus.tone)}
            </p>
            <p className="mt-2 max-w-[34ch] text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.82rem]">
              {getHydrationDetail(hydrationStatus)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.66rem] font-semibold md:px-3 md:text-[0.72rem] ${getHydrationBadgeClassName(hydrationStatus.tone)}`}>
            {getHydrationBadgeText(hydrationStatus.tone)}
          </span>
        </div>

        <div className="mt-4 rounded-[16px] border border-[var(--color-home-card-border)] bg-white/54 p-2.5 md:mt-5 md:p-3">
          <p className="px-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.72rem]">
            Next likely
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NextLikelyTile estimate={nextWetEstimate} icon={diaperWetIcon} />
            <NextLikelyTile estimate={nextPoopEstimate} icon={diaperDirtyIcon} />
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
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Wet", value: todayWetCount },
                      { label: "Dirty", value: todayDirtyCount },
                      { label: "Mixed", value: todayMixedCount },
                    ].map(({ label, value }) => (
                      <InsetPanel key={label} className="border-[var(--color-home-card-border)] bg-white/54 p-2.5 text-center">
                        <p className="text-[0.95rem] font-semibold leading-none text-[var(--color-text)]">{value}</p>
                        <p className="mt-1 text-[0.64rem] uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{label}</p>
                      </InsetPanel>
                    ))}
                  </div>
                  <InsetPanel className="border-[var(--color-home-card-border)] bg-white/54 p-3">
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
