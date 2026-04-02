import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import watercolorClouds from "../../assets/watercolor-clouds.svg";
import watercolorMountains from "../../assets/watercolor-mountains.svg";
import watercolorSun from "../../assets/watercolor-sun.svg";
import { Avatar } from "../child/Avatar";
import {
  HomeMoodMoonIcon,
  HomeMoodRainbowIcon,
  HomeMoodSunIcon,
  HomeSummaryBottleIcon,
  HomeSummaryDiaperIcon,
  HomeSummarySleepIcon,
} from "../ui/icons";
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
            background: "radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255,252,247,0.98) 62%, rgba(255,248,241,0.84) 100%)",
            boxShadow: "0 0 0 5px rgba(255,239,230,0.88), 0 10px 24px rgba(232, 182, 153, 0.14)",
          }}
        >
          <div
            className="pointer-events-none absolute -inset-4 rounded-full blur-[18px]"
            style={{ background: `radial-gradient(circle, rgba(255,255,255,0) 48%, ${glow} 68%, rgba(255,255,255,0) 100%)` }}
          />
          <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(243, 211, 195, 0.72)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(239,157,123,0.98)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                filter: "drop-shadow(0 0 6px rgba(239,157,123,0.24))",
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
  onContinueToDashboard,
  avatarAnchorRef,
}: {
  activeChild: Child;
  summary: ChildDailySummary;
  sleepSummaryLabel: string;
  sleepSummaryHoursValue: number;
  sleepNapCount: number;
  onContinueToDashboard: () => void;
  avatarAnchorRef: RefObject<HTMLDivElement | null>;
}) {
  const totalDiapers = summary.todayWetDiapers + summary.todayDirtyDiapers;
  const moodCards = [
    { label: "Feeling Good", icon: <HomeMoodSunIcon />, tone: "bg-[rgba(255,237,222,0.9)]" },
    { label: "Managing Okay", icon: <HomeMoodRainbowIcon />, tone: "bg-[rgba(255,252,247,0.95)]" },
    { label: "Need a Moment", icon: <HomeMoodMoonIcon />, tone: "bg-[rgba(255,252,247,0.95)]" },
  ];

  return (
    <section className="-mx-4 -mt-2 overflow-hidden px-4 pb-3 pt-1">
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="home-hero-curve" clipPathUnits="objectBoundingBox">
            <path d="M0,0 H1 V0.62 Q0.6,0.74 0,0.64 Z" />
          </clipPath>
        </defs>
      </svg>
      <div
        className="relative h-[350px] overflow-hidden px-4 pt-6"
        style={{ clipPath: "url(#home-hero-curve)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_76%_18%,rgba(255,214,119,0.58)_0%,rgba(255,214,119,0.2)_20%,rgba(255,255,255,0)_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,204,170,0.14)_0%,rgba(255,255,255,0)_44%)]" />
        <img src={watercolorClouds} alt="" aria-hidden="true" className="pointer-events-none absolute left-[-14px] top-[18px] w-[calc(100%+28px)] opacity-95" />
        <img src={watercolorSun} alt="" aria-hidden="true" className="pointer-events-none absolute right-[14px] top-[10px] w-[130px] opacity-95" />
        <img src={watercolorMountains} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[74px] w-full scale-[1.12] opacity-100" />
        <div className="pointer-events-none absolute inset-x-[-6%] top-[86px] h-[165px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(245,221,208,0.08)_40%,rgba(238,183,155,0.2)_100%)]" />
        <div className="pointer-events-none absolute left-[12px] top-[106px] h-12 w-20 rounded-full bg-white/46 blur-[8px]" />
        <div className="pointer-events-none absolute left-[42px] top-[112px] h-8 w-8 rounded-full bg-white/54 blur-[6px]" />
        <div className="pointer-events-none absolute left-[72px] top-[108px] h-9 w-9 rounded-full bg-white/36 blur-[8px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(251,245,234,0)_0%,rgba(251,245,234,0.56)_68%,rgba(251,245,234,0.92)_100%)]" />
        <div className="relative flex h-full items-start pt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="w-full pr-[102px]"
          >
            <h1 className="font-[var(--font-display)] text-[2.05rem] font-extrabold leading-[1.1] tracking-[-0.05em] text-[#E79A88]">
              How are you holding up today?
            </h1>
            <p className="mt-2 text-[0.98rem] leading-tight tracking-[-0.02em] text-[var(--color-text)]">
              Daily Check-in: Parent & Baby Care
            </p>
            <div ref={avatarAnchorRef} className="mt-5 flex items-center gap-3">
              <Avatar
                childId={activeChild.id}
                name={activeChild.name}
                color={activeChild.avatar_color}
                size="sm"
                className="h-10 w-10 border-2 border-white/70 shadow-[var(--shadow-soft)]"
              />
              <div>
                <p className="text-[1.05rem] font-semibold text-[var(--color-text)]">{activeChild.name}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4">
        <div className="-mt-24 grid grid-cols-3 gap-3">
          {moodCards.map((card) => (
            <button
              key={card.label}
              type="button"
              className={`min-h-[96px] rounded-[20px] border border-[rgba(155,126,102,0.14)] px-2 py-3 text-center shadow-[0_24px_44px_rgba(188,146,114,0.28),0_10px_22px_rgba(233,197,170,0.26),0_2px_10px_rgba(255,255,255,0.68)] ${card.tone}`}
            >
              <div className="flex justify-center">{card.icon}</div>
              <p className="mt-2 text-[0.92rem] font-semibold leading-tight text-[var(--color-text)]">{card.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] border border-[rgba(155,126,102,0.14)] bg-[rgba(255,252,247,0.94)] p-4 shadow-[0_14px_28px_rgba(184,146,118,0.11)]">
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

        <button
          type="button"
          onClick={onContinueToDashboard}
          className="mt-4 h-12 w-full rounded-full bg-[var(--color-cta)] px-5 text-[0.98rem] font-semibold text-white shadow-[var(--shadow-medium)]"
        >
          Continue to Dashboard
        </button>
      </div>
    </section>
  );
}
