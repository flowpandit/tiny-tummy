import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  HomeMoodMoonIcon,
  HomeMoodRainbowIcon,
  HomeMoodSunIcon,
  HomeSummaryBottleIcon,
  HomeSummaryDiaperIcon,
  HomeSummarySleepIcon,
} from "../ui/icons";
import { ScenicHero } from "../layout/ScenicHero";
import type { Child } from "../../lib/types";
import type { ChildDailySummary } from "../../lib/child-summary";
import { timeSince } from "../../lib/utils";

type MoodTone = "good" | "okay" | "moment";

interface MoodBurst {
  tone: MoodTone;
  key: number;
}

const MOOD_BURST_PARTICLES: Record<MoodTone, Array<{
  x: number;
  y: number;
  scale: number;
  rotate: number;
  delay: number;
}>> = {
  good: [
    { x: -120, y: -90, scale: 0.9, rotate: -18, delay: 0 },
    { x: -72, y: -132, scale: 0.68, rotate: 12, delay: 40 },
    { x: -18, y: -148, scale: 0.56, rotate: -8, delay: 90 },
    { x: 44, y: -140, scale: 0.82, rotate: 16, delay: 30 },
    { x: 98, y: -110, scale: 0.62, rotate: -14, delay: 120 },
    { x: 132, y: -64, scale: 0.74, rotate: 20, delay: 70 },
    { x: 84, y: -24, scale: 0.54, rotate: 8, delay: 150 },
    { x: -92, y: -42, scale: 0.6, rotate: -12, delay: 110 },
  ],
  okay: [
    { x: -114, y: -82, scale: 0.76, rotate: -10, delay: 0 },
    { x: -54, y: -132, scale: 0.58, rotate: 8, delay: 60 },
    { x: 10, y: -146, scale: 0.72, rotate: -14, delay: 100 },
    { x: 82, y: -128, scale: 0.6, rotate: 12, delay: 40 },
    { x: 126, y: -74, scale: 0.66, rotate: -6, delay: 130 },
    { x: 56, y: -26, scale: 0.52, rotate: 14, delay: 80 },
    { x: -84, y: -30, scale: 0.56, rotate: -18, delay: 150 },
  ],
  moment: [
    { x: -104, y: -72, scale: 0.68, rotate: -12, delay: 0 },
    { x: -42, y: -124, scale: 0.52, rotate: 10, delay: 80 },
    { x: 24, y: -138, scale: 0.64, rotate: -8, delay: 140 },
    { x: 94, y: -116, scale: 0.56, rotate: 14, delay: 60 },
    { x: 116, y: -48, scale: 0.48, rotate: -10, delay: 170 },
    { x: 48, y: -18, scale: 0.44, rotate: 8, delay: 110 },
    { x: -74, y: -26, scale: 0.46, rotate: -16, delay: 190 },
  ],
};

function MoodBurstIcon({ tone }: { tone: MoodTone }) {
  if (tone === "good") return <HomeMoodSunIcon className="h-7 w-7" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={tone === "moment" ? "h-35 w-35" : "h-6 w-6"} aria-hidden="true">
      <path
        d="M12 20.5c-.3 0-.59-.1-.82-.29C6.84 16.77 4 14.26 4 10.9 4 8.46 5.92 6.5 8.3 6.5c1.34 0 2.62.63 3.43 1.7.1.13.25.2.27.2s.18-.07.28-.2c.8-1.07 2.08-1.7 3.42-1.7C18.08 6.5 20 8.46 20 10.9c0 3.36-2.84 5.87-7.18 9.31-.23.19-.52.29-.82.29Z"
        fill={tone === "moment" ? "#d86a79" : "#e697a2"}
      />
      <path
        d="M12 20.5c-.3 0-.59-.1-.82-.29C6.84 16.77 4 14.26 4 10.9 4 8.46 5.92 6.5 8.3 6.5c1.34 0 2.62.63 3.43 1.7.1.13.25.2.27.2s.18-.07.28-.2c.8-1.07 2.08-1.7 3.42-1.7C18.08 6.5 20 8.46 20 10.9c0 3.36-2.84 5.87-7.18 9.31-.23.19-.52.29-.82.29Z"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="0.75"
      />
    </svg>
  );
}

function QuickSummaryRing({
  icon,
  label,
  value,
  progress,
  detail,
  glow,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  progress: number;
  detail: string;
  glow: string;
}) {
  const size = 92;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.max(0.08, Math.min(progress, 1));
  const dashOffset = circumference * (1 - normalizedProgress);

  return (
    <div className="text-center">
      <div className="mx-auto flex w-fit items-center justify-center">
        <div
          className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full"
          style={{
            background: "var(--color-home-ring-surface)",
            boxShadow: "0 0 0 5px var(--color-home-ring-outline), var(--shadow-soft)",
          }}
        >
          <div
            className="pointer-events-none absolute -inset-8 rounded-full opacity-90 blur-[30px]"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0) 18%, rgba(255,255,255,0.02) 34%, ${glow} 52%, rgba(255,255,255,0.1) 68%, rgba(255,255,255,0) 100%)`,
            }}
          />
          <div
            className="pointer-events-none absolute -inset-5 rounded-full opacity-70 blur-[16px]"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0) 34%, ${glow} 58%, rgba(255,255,255,0) 86%)`,
            }}
          />
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-home-ring-track)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-home-ring-progress)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                filter: "drop-shadow(0 0 6px var(--color-home-ring-progress-shadow))",
                transition: "stroke-dashoffset 280ms var(--ease-out-soft)",
              }}
            />
          </svg>
          <div className="relative z-10 flex max-w-[58px] flex-col items-center">
            <div className="flex h-5 items-center justify-center">{icon}</div>
            <p className="mt-1 text-[0.6rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-[var(--color-text)]">
              {label}: {value}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[12px] font-semibold tracking-[-0.01em] text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}

export function HomeTopSection({
  activeChild,
  summary,
  sleepSummaryLabel,
  sleepSummaryHoursValue,
  sleepNapCount,
  avatarAnchorRef,
  otherChildren,
  onSelectChild,
}: {
  activeChild: Child;
  summary: ChildDailySummary;
  sleepSummaryLabel: string;
  sleepSummaryHoursValue: number;
  sleepNapCount: number;
  avatarAnchorRef: RefObject<HTMLDivElement | null>;
  otherChildren: Child[];
  onSelectChild: (childId: string) => void;
}) {
  const [moodBurst, setMoodBurst] = useState<MoodBurst | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const totalDiapers = summary.todayWetDiapers + summary.todayDirtyDiapers;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener?.("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener?.("change", syncPreference);
    };
  }, []);

  useEffect(() => {
    if (!moodBurst) return;
    const timeoutId = window.setTimeout(
      () => setMoodBurst(null),
      moodBurst.tone === "moment" ? 2400 : moodBurst.tone === "okay" ? 1700 : 1100,
    );
    return () => window.clearTimeout(timeoutId);
  }, [moodBurst]);

  const moodCards = [
    {
      label: "Feeling Good",
      icon: <HomeMoodSunIcon className="h-9 w-9" />,
      tone: "var(--color-home-mood-warm)",
      burstTone: "good" as const,
    },
    {
      label: "Managing Okay",
      icon: <HomeMoodRainbowIcon className="h-11 w-11" />,
      tone: "var(--color-home-mood-calm)",
      burstTone: "okay" as const,
    },
    {
      label: "Need a Moment",
      icon: <HomeMoodMoonIcon className="h-8 w-8" />,
      tone: "var(--color-home-mood-calm)",
      burstTone: "moment" as const,
    },
  ];

  return (
    <section className="-mt-2 overflow-hidden pb-3 pt-1">
      <ScenicHero
        child={activeChild}
        title="How are you feeling today?"
        description="Daily Check-in: Parent & Baby Care"
        avatarAnchorRef={avatarAnchorRef}
        siblingChildren={otherChildren}
        onSelectChild={onSelectChild}
        scene="home"
      />

      <div className="relative z-10 px-4 md:px-6 lg:px-8">
        {moodBurst && !prefersReducedMotion && (
          <div className="pointer-events-none absolute inset-x-0 top-[-36px] z-20 h-[220px] overflow-visible">
            <div className="relative mx-auto h-full max-w-[420px]">
              {moodBurst.tone === "moment" ? (
                <div
                  key={moodBurst.key}
                  className="mood-heart-center absolute left-1/2 top-[108px]"
                >
                  <MoodBurstIcon tone="moment" />
                </div>
              ) : (
                MOOD_BURST_PARTICLES[moodBurst.tone].map((particle, index) => (
                  <div
                    key={`${moodBurst.key}-${index}`}
                    className={moodBurst.tone === "okay" ? "mood-heart-float absolute left-1/2 top-[112px]" : "mood-burst-particle absolute left-1/2 top-[112px]"}
                    style={{
                      "--burst-x": `${particle.x}px`,
                      "--burst-y": `${particle.y}px`,
                      "--burst-rotate": `${particle.rotate}deg`,
                      animationDelay: `${particle.delay}ms`,
                      transform: `translate(-50%, -50%) scale(${particle.scale})`,
                    } as CSSProperties}
                  >
                    <MoodBurstIcon tone={moodBurst.tone} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        <div className="-mt-32 grid grid-cols-3 gap-2.5">
          {moodCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => setMoodBurst({ tone: card.burstTone, key: Date.now() + Math.random() })}
              className="flex h-[64px] flex-col items-center justify-center rounded-[14px] border border-[var(--color-border)] px-1.5 py-1 text-center shadow-[var(--shadow-medium)]"
              style={{ background: card.tone }}
            >
              <div className="flex h-4 items-center justify-center [&_img]:h-4 [&_img]:w-4">{card.icon}</div>
              <p className="mt-1 text-[0.74rem] font-semibold leading-none text-[var(--color-text)]">{card.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-[0.9rem] font-medium text-[var(--color-text)]">Quick Summary (Last 24h)</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <QuickSummaryRing
              icon={<HomeSummaryDiaperIcon />}
              label="Diapers"
              value={String(totalDiapers)}
              progress={Math.min(totalDiapers / 8, 1)}
              detail={`${summary.todayWetDiapers} Wet, ${summary.todayDirtyDiapers} Dirty`}
              glow="rgba(244, 218, 113, 0.34)"
            />
            <QuickSummaryRing
              icon={<HomeSummaryBottleIcon />}
              label="Feeds"
              value={String(summary.todayFeeds)}
              progress={Math.min(summary.todayFeeds / 10, 1)}
              detail={summary.lastFeed ? `Last ${timeSince(summary.lastFeed.logged_at)}` : "No feed yet"}
              glow="rgba(239, 169, 118, 0.3)"
            />
            <QuickSummaryRing
              icon={<HomeSummarySleepIcon />}
              label="Sleep"
              value={sleepSummaryLabel}
              progress={Math.min(sleepSummaryHoursValue / 16, 1)}
              detail={sleepNapCount > 0 ? `${sleepNapCount} Naps` : "No sleep logs"}
              glow="rgba(208, 192, 239, 0.32)"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
