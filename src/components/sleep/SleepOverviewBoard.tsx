import type { ReactNode } from "react";
import { sleepSceneArt } from "../../assets/illustrations";
import { formatElapsedSince, type SleepAssistantCopy, type SleepGlanceStat, type WakeWindowProgress } from "../../lib/sleep-view-model";
import type { SleepEntry } from "../../lib/types";
import { Button } from "../ui/button";
import { HomeActionSleepIcon } from "../ui/icons";
import { SleepRecentHistorySection } from "./SleepRecentHistorySection";

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11.5v4.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8.25h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.75v4.75l3.25 1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PencilIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 17.75 6.05 13.4 15.9 3.55a2.05 2.05 0 0 1 2.9 0l1.65 1.65a2.05 2.05 0 0 1 0 2.9L10.6 17.95 6.25 19 5 17.75Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m14.5 5 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 8.75 15.5 12 10 15.25V8.75Z" fill="currentColor" />
    </svg>
  );
}

function SparkleStar({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.75 14.72 9.28 21.25 12 14.72 14.72 12 21.25 9.28 14.72 2.75 12 9.28 9.28 12 2.75Z" />
    </svg>
  );
}

function CloudInsightArt() {
  return (
    <div className="pointer-events-none absolute bottom-2 right-3 hidden h-[82px] w-[124px] opacity-90 sm:block md:bottom-3 md:right-5 md:h-[96px] md:w-[150px]" aria-hidden="true">
      <div className="absolute bottom-0 left-2 h-12 w-24 rounded-[999px] bg-[#dbeafe]" />
      <div className="absolute bottom-6 left-8 h-12 w-12 rounded-full bg-[#d9d6ff]" />
      <div className="absolute bottom-4 right-8 h-16 w-16 rounded-full bg-[#dcecff]" />
      <div className="absolute bottom-5 left-12 h-1.5 w-1.5 rounded-full bg-[#6d8fdc]" />
      <div className="absolute bottom-5 right-14 h-1.5 w-1.5 rounded-full bg-[#6d8fdc]" />
      <div className="absolute bottom-3 left-[58px] h-2 w-4 rounded-b-full border-b-2 border-[#6d8fdc]" />
      <SparkleStar className="absolute right-2 top-2 h-3.5 w-3.5 text-[#ffd66f]" />
      <SparkleStar className="absolute left-2 top-5 h-2.5 w-2.5 text-[#b9a8ff]" />
    </div>
  );
}

function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 md:px-0">
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
        {children}
      </p>
      {action}
    </div>
  );
}

function SleepHero({ copy }: { copy: SleepAssistantCopy }) {
  return (
    <section className="px-0 md:px-10">
      <div
        className="relative min-h-[340px] overflow-hidden rounded-b-[22px] border-y border-[var(--color-home-card-border)] px-8 pb-1 pt-4 shadow-[0_16px_34px_rgba(124,88,238,0.08)] md:min-h-[376px] md:rounded-[28px] md:border md:px-9 md:pb-7 md:pt-9"
        style={{
          background: "linear-gradient(112deg, color-mix(in srgb, var(--color-home-sleep-surface) 48%, var(--color-surface) 52%) 0%, color-mix(in srgb, var(--color-home-card-surface) 84%, transparent) 56%, color-mix(in srgb, var(--color-home-sleep-surface) 66%, var(--color-surface) 34%) 100%)",
        }}
      >
        <SparkleStar className="absolute right-[116px] top-16 h-5 w-5 text-[#d9c9ff] md:right-[390px] md:top-12 md:h-6 md:w-6" />
        <SparkleStar className="absolute right-10 top-[116px] h-6 w-6 text-[#e3d7ff] md:right-[94px] md:top-20 md:h-7 md:w-7" />
        <SparkleStar className="absolute right-[168px] top-[164px] h-3.5 w-3.5 text-[#ffd66f] md:left-[285px] md:right-auto md:top-[162px]" />

        <img
          src={sleepSceneArt}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-32 right-[-34px] w-[62%] max-w-none opacity-90 md:bottom-16 md:right-8 md:w-[50%] lg:right-12 lg:w-[46%]"
        />

        <div className="relative z-10 max-w-[16.5rem] md:max-w-[23rem]">
          <div className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-home-action-sleep-icon)] md:text-[0.85rem]">
            <HomeActionSleepIcon className="h-7 w-7" />
            <span>Sleep status</span>
          </div>
          <h1 className="mt-5 text-[2.08rem] font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--color-text)] md:mt-6 md:text-[3.1rem] md:leading-[1.02]">
            {copy.heroTitle}
          </h1>
          <p className="mt-3 max-w-[24ch] text-[0.94rem] leading-snug text-[var(--color-text-secondary)] md:mt-4 md:text-[1.12rem] md:leading-snug">
            {copy.heroDescription}
          </p>

          <div className="mt-6 inline-flex min-w-[196px] items-center gap-3 rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-3 shadow-[0_14px_28px_rgba(124,88,238,0.1)] md:mt-5 md:min-w-[236px] md:rounded-[20px] md:px-5 md:py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-home-sleep-surface)] text-[var(--color-home-action-sleep-icon)] md:h-14 md:w-14">
              <ClockIcon className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <div>
              <p className="text-[0.78rem] font-medium text-[var(--color-text-secondary)] md:text-[0.84rem]">{copy.heroBadgeLabel}</p>
              <p className="text-[1.14rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-home-action-sleep-icon)] md:text-[1.35rem]">
                {copy.heroBadgeValue}
              </p>
              <p className="text-[0.82rem] text-[var(--color-text-secondary)] md:text-[0.92rem]">{copy.heroBadgeDetail}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({
  copy,
  onOpenTimerSheet,
}: {
  copy: SleepAssistantCopy;
  onOpenTimerSheet: () => void;
}) {
  return (
    <section className="px-4 md:px-10">
      <div
        className="relative overflow-hidden rounded-[18px] border px-4 py-4 shadow-[0_16px_34px_rgba(211,174,103,0.1)] md:flex md:min-h-[120px] md:items-center md:gap-5 md:rounded-[24px] md:px-7 md:py-5"
        style={{
          background: "var(--gradient-home-recommendation)",
          borderColor: "var(--color-home-recommendation-border)",
        }}
      >
        <SparkleStar className="absolute bottom-7 right-[72px] h-3 w-3 text-[var(--color-home-recommendation-star)] md:right-[310px] md:top-8 md:h-4 md:w-4" />
        <SparkleStar className="absolute right-7 top-8 h-4 w-4 text-[var(--color-home-recommendation-star)] md:right-[226px] md:top-14 md:h-5 md:w-5" />

        <div className="flex items-start gap-3.5 md:flex-1 md:items-center md:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-home-recommendation-icon-surface)] text-white shadow-[var(--shadow-inner)] md:h-16 md:w-16">
            <SparkleStar className="h-6 w-6 md:h-8 md:w-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-home-recommendation-label)] md:text-[0.85rem]">
              Recommended next
            </p>
            <p className="mt-2 text-[1.12rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-text)] md:text-[1.45rem]">
              {copy.recommendationTitle}
            </p>
            <p className="mt-1 text-[0.88rem] leading-snug text-[var(--color-text-secondary)] md:text-[1rem]">
              {copy.recommendationDetail}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 md:mt-0">
          <Button
            type="button"
            variant="cta"
            size="md"
            onClick={onOpenTimerSheet}
            className="h-12 flex-1 bg-[linear-gradient(180deg,#ffbf50_0%,#ffa52e_100%)] text-[0.95rem] shadow-[0_12px_24px_rgba(255,165,46,0.22)] md:min-w-[230px] md:flex-none md:text-[1.05rem]"
          >
            {copy.recommendationActionLabel}
            <PlayIcon className="ml-2 h-5 w-5" />
          </Button>
          <button
            type="button"
            aria-label="Open sleep recommendation"
            onClick={onOpenTimerSheet}
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-home-recommendation-button-bg)] text-[2rem] leading-none text-[var(--color-home-recommendation-button-text)] shadow-[0_10px_28px_rgba(145,112,79,0.14)] md:flex"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function QuickActionButton({
  title,
  detail,
  badge,
  tone,
  icon,
  onClick,
}: {
  title: string;
  detail: string;
  badge?: string;
  tone: "sleep" | "active" | "manual";
  icon: ReactNode;
  onClick: () => void;
}) {
  const background = tone === "sleep"
    ? "var(--gradient-home-action-sleep)"
    : tone === "active"
      ? "linear-gradient(180deg, rgba(255, 242, 236, 0.98) 0%, rgba(255, 232, 224, 0.86) 100%)"
      : "linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(230, 239, 255, 0.9) 100%)";
  const iconColor = tone === "sleep"
    ? "var(--color-home-action-sleep-icon)"
    : tone === "active"
      ? "#ff6d35"
      : "#4b8df7";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[126px] flex-col items-center justify-center gap-2 rounded-[16px] border border-[var(--color-home-card-border)] px-3 text-center shadow-[0_12px_26px_rgba(187,144,108,0.08)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:min-h-[124px] md:flex-row md:justify-start md:gap-5 md:rounded-[20px] md:px-6 md:text-left"
      style={{ background }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14"
        style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: iconColor }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.92rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1.2rem]">
          {title}
        </span>
        <span className="mt-1 hidden text-[0.92rem] leading-snug text-[var(--color-text-secondary)] md:block">
          {detail}
        </span>
        {badge && (
          <span className="mt-1 block text-[0.82rem] font-medium leading-tight text-[#ff5f2a] md:text-[0.92rem]">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

function QuickActions({
  hasTimerSession,
  onOpenTimerSheet,
  onOpenManualSheet,
}: {
  hasTimerSession: boolean;
  onOpenTimerSheet: () => void;
  onOpenManualSheet: () => void;
}) {
  return (
    <section className="px-4 md:px-10">
      <SectionLabel>Quick actions</SectionLabel>
      <div className="mt-3 grid grid-cols-3 gap-3 md:mt-4 md:gap-5">
        <QuickActionButton
          title="Start sleep"
          detail="Begin a nap or night sleep"
          tone="sleep"
          icon={<HomeActionSleepIcon className="h-7 w-7" />}
          onClick={onOpenTimerSheet}
        />
        <QuickActionButton
          title="End sleep"
          detail={hasTimerSession ? "Stop ongoing sleep session" : "Open the sleep timer"}
          badge={hasTimerSession ? "Active" : undefined}
          tone="active"
          icon={<StopIcon className="h-7 w-7" />}
          onClick={onOpenTimerSheet}
        />
        <QuickActionButton
          title="Log sleep manually"
          detail="Add a sleep session manually"
          tone="manual"
          icon={<PencilIcon className="h-7 w-7" />}
          onClick={onOpenManualSheet}
        />
      </div>
    </section>
  );
}

function SleepWindowCard({
  childName,
  lastWakeTimestamp,
  wakeBaseline,
  progress,
  copy,
}: {
  childName: string;
  lastWakeTimestamp: string | null;
  wakeBaseline: string;
  progress: WakeWindowProgress;
  copy: SleepAssistantCopy;
}) {
  const lastWakeClock = lastWakeTimestamp
    ? new Date(lastWakeTimestamp).toLocaleString(undefined, { weekday: undefined, hour: "numeric", minute: "2-digit" })
    : "No wake logged";

  return (
    <section className="px-4 md:px-10">
      <div
        className="rounded-[22px] border px-4 py-4 shadow-[var(--shadow-home-card)] md:rounded-[30px] md:px-6 md:py-5"
        style={{
          background: "var(--color-home-card-surface)",
          borderColor: "var(--color-home-card-border)",
        }}
      >
        <div className="flex items-center gap-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text)] md:text-[0.85rem]">
          <span>Sleep window</span>
          <span className="text-[var(--color-text-soft)]"><InfoIcon /></span>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[1.18fr_1fr] md:items-center md:gap-8">
          <div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-[0.85rem] font-medium text-[var(--color-text)] md:text-[0.92rem]">Last wake</p>
                <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-home-action-sleep-icon)] md:text-[1.8rem]">
                  {formatElapsedSince(lastWakeTimestamp)}
                </p>
                <p className="mt-2 text-[0.84rem] text-[var(--color-text-secondary)] md:text-[0.95rem]">{lastWakeClock}</p>
              </div>
              <div className="border-l border-[var(--color-home-divider)] pl-5">
                <p className="text-[0.85rem] font-medium text-[var(--color-text)] md:text-[0.92rem]">Ideal wake window</p>
                <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[1.8rem]">
                  {wakeBaseline}
                </p>
                <p className="mt-2 text-[0.84rem] text-[var(--color-text-secondary)] md:text-[0.95rem]">from last wake</p>
              </div>
            </div>

            <div className="mt-7">
              <div className="relative h-3 rounded-full bg-[color-mix(in_srgb,var(--color-home-action-sleep-icon)_18%,transparent)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-home-action-sleep-icon)]"
                  style={{ width: `${progress.fillPercent}%` }}
                />
                <span
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[var(--color-home-card-surface)] bg-[var(--color-home-action-sleep-icon)] shadow-[0_4px_12px_rgba(124,88,238,0.24)]"
                  style={{ left: `${progress.thumbPercent}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 text-[0.8rem] text-[var(--color-text-secondary)] md:text-[0.9rem]">
                <span>Too early</span>
                <span className="text-center font-medium text-[var(--color-home-action-sleep-icon)]">Optimal</span>
                <span className="text-right">Overdue</span>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[color-mix(in_srgb,var(--color-home-action-sleep-icon)_18%,var(--color-home-card-border))] bg-[color-mix(in_srgb,var(--color-home-sleep-surface)_60%,var(--color-home-card-surface))] px-4 py-4 md:rounded-[20px] md:px-5 md:py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-home-sleep-surface)] text-[var(--color-home-action-sleep-icon)]">
                <HomeActionSleepIcon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-[0.95rem] font-semibold text-[var(--color-home-action-sleep-icon)] md:text-[1.05rem]">
                  {copy.insightTitle}
                </p>
                <p className="mt-1 text-[0.88rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.96rem]">
                  {copy.insightDetail || `${childName} is getting ready for sleep.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GlanceIcon({ accent }: { accent: SleepGlanceStat["accent"] }) {
  if (accent === "total") return <HomeActionSleepIcon className="h-5 w-5 text-[var(--color-home-action-sleep-icon)]" />;
  if (accent === "naps") return <SparkleStar className="h-5 w-5 text-[#ffb72f]" />;
  if (accent === "longest") return <ClockIcon className="h-5 w-5 text-[#48c987]" />;
  return <ChartIcon className="h-5 w-5 text-[#4b8df7]" />;
}

function ChartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 15.5v-3.5M12 15.5V8M16.5 15.5v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function glanceBackground(accent: SleepGlanceStat["accent"]) {
  if (accent === "total") return "var(--gradient-home-glance-sleep)";
  if (accent === "naps") return "linear-gradient(180deg, rgba(255, 249, 231, 0.98) 0%, rgba(255, 241, 204, 0.9) 100%)";
  if (accent === "longest") return "var(--gradient-home-glance-feed)";
  return "var(--gradient-home-glance-diaper)";
}

function TodayGlance({ stats }: { stats: SleepGlanceStat[] }) {
  return (
    <section>
      <SectionLabel>Today at a glance</SectionLabel>
      <div className="mt-3 grid grid-cols-4 gap-2 md:mt-4 md:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="min-h-[112px] rounded-[16px] border border-[var(--color-home-card-border)] px-2.5 py-3 shadow-[0_12px_24px_rgba(172,139,113,0.08)] md:min-h-[140px] md:rounded-[18px] md:px-4 md:py-4"
            style={{ background: glanceBackground(stat.accent) }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-home-card-surface)] md:h-10 md:w-10">
              <GlanceIcon accent={stat.accent} />
            </div>
            <p className="mt-3 text-[0.76rem] font-medium leading-tight text-[var(--color-text)] md:text-[0.86rem]">
              {stat.label}
            </p>
            <p className="mt-1 text-[1.22rem] font-semibold leading-none tracking-[-0.04em] text-[var(--color-text)] md:text-[1.5rem]">
              {stat.value}
            </p>
            <p className="mt-1 text-[0.72rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.85rem]">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SleepInsightCard({ copy }: { copy: SleepAssistantCopy }) {
  return (
    <section
      className="relative overflow-hidden rounded-[18px] border px-4 py-4 shadow-[0_12px_28px_rgba(112,155,222,0.08)] md:rounded-[22px] md:px-5 md:py-5"
      style={{
        background: "linear-gradient(135deg, rgba(238,246,255,0.94) 0%, rgba(246,241,255,0.92) 100%)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <CloudInsightArt />
      <div className="relative z-10 max-w-[28ch]">
        <div className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#4b8df7] md:text-[0.85rem]">
          <InfoIcon />
          <span>Sleep insight</span>
        </div>
        <p className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-[var(--color-text)] md:text-[1.12rem]">
          {copy.insightTitle}
        </p>
        <p className="mt-2 text-[0.84rem] leading-relaxed text-[var(--color-text-secondary)] md:text-[0.95rem]">
          {copy.insightDetail}
        </p>
      </div>
    </section>
  );
}

export function SleepOverviewBoard({
  childName,
  assistantCopy,
  lastWakeTimestamp,
  wakeBaseline,
  wakeWindowProgress,
  timerSessionSummary,
  sleepLogs,
  glanceStats,
  onOpenTimerSheet,
  onOpenManualSheet,
  onEditSleep,
}: {
  childName: string;
  assistantCopy: SleepAssistantCopy;
  lastWakeTimestamp: string | null;
  wakeBaseline: string;
  wakeWindowProgress: WakeWindowProgress;
  timerSessionSummary: null | { label: string; clock: string; summary: string };
  sleepLogs: SleepEntry[];
  glanceStats: SleepGlanceStat[];
  onOpenTimerSheet: () => void;
  onOpenManualSheet: () => void;
  onEditSleep: (entry: SleepEntry) => void;
}) {
  return (
    <div className="flex flex-col gap-3 pb-3 pt-0 md:gap-5 md:pb-4 md:pt-0.5">
      <SleepHero copy={assistantCopy} />
      <RecommendationCard copy={assistantCopy} onOpenTimerSheet={onOpenTimerSheet} />
      {timerSessionSummary && (
        <section className="px-4 md:px-10">
          <button
            type="button"
            onClick={onOpenTimerSheet}
            className="flex w-full items-center justify-between gap-4 rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-3 text-left shadow-[var(--shadow-home-card)]"
          >
            <span>
              <span className="block text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">{timerSessionSummary.label}</span>
              <span className="mt-1 block text-[1.35rem] font-semibold tracking-[-0.04em] text-[var(--color-text)]">{timerSessionSummary.clock}</span>
              <span className="mt-0.5 block text-[0.84rem] text-[var(--color-text-secondary)]">{timerSessionSummary.summary}</span>
            </span>
            <span className="text-[1.8rem] leading-none text-[var(--color-home-chevron)]" aria-hidden="true">›</span>
          </button>
        </section>
      )}
      <QuickActions
        hasTimerSession={Boolean(timerSessionSummary)}
        onOpenTimerSheet={onOpenTimerSheet}
        onOpenManualSheet={onOpenManualSheet}
      />
      <SleepWindowCard
        childName={childName}
        lastWakeTimestamp={lastWakeTimestamp}
        wakeBaseline={wakeBaseline}
        progress={wakeWindowProgress}
        copy={assistantCopy}
      />
      <div className="grid gap-4 px-4 md:grid-cols-[0.96fr_1.04fr] md:px-10">
        <SleepRecentHistorySection logs={sleepLogs} onEdit={onEditSleep} />
        <div className="space-y-4">
          <TodayGlance stats={glanceStats} />
          <SleepInsightCard copy={assistantCopy} />
        </div>
      </div>
    </div>
  );
}
