import type { ReactNode, RefObject } from "react";
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
  const totalDiapers = summary.todayWetDiapers + summary.todayDirtyDiapers;
  const moodCards = [
    {
      label: "Feeling Good",
      icon: <HomeMoodSunIcon className="h-9 w-9" />,
      tone: "var(--color-home-mood-warm)",
    },
    {
      label: "Managing Okay",
      icon: <HomeMoodRainbowIcon className="h-11 w-11" />,
      tone: "var(--color-home-mood-calm)",
    },
    {
      label: "Need a Moment",
      icon: <HomeMoodMoonIcon className="h-8 w-8" />,
      tone: "var(--color-home-mood-calm)",
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
        <div className="-mt-32 grid grid-cols-3 gap-2.5">
          {moodCards.map((card) => (
            <button
              key={card.label}
              type="button"
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
