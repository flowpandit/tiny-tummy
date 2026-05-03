import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { EmptyState } from "../ui/page-layout";
import { HomeActionEpisodeIcon, HomeActionSymptomIcon } from "../ui/icons";
import { cn } from "../../lib/cn";
import { getEpisodeTypeLabel } from "../../lib/episode-constants";
import {
  getSymptomSeverityBadgeVariant,
  getSymptomSeverityLabel,
  getSymptomTypeLabel,
} from "../../lib/symptom-constants";
import {
  formatHealthStartedLine,
  getSymptomDisplayDetail,
  type HealthInsightModel,
  type HealthInsightTone,
  type HealthTimelineItem,
  type HealthTimelineTone,
} from "../../lib/health-view-model";
import type { Episode, SymptomEntry, TemperatureUnit } from "../../lib/types";

const healthCardStyle = {
  background: "var(--color-home-card-surface)",
  borderColor: "var(--color-home-card-border)",
};
const detailSeparator = " \u00b7 ";

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m7.5 4.5 5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m4.5 6 3.5 3.5L11.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.8 18.2 6.4v5.3c0 4.3-2.5 7.1-6.2 8.8-3.7-1.7-6.2-4.5-6.2-8.8V6.4L12 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m9.2 12.1 1.9 1.9 3.9-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThermometerIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M10 14.5V5.8a3 3 0 0 1 6 0v8.7a4.5 4.5 0 1 1-6 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8.5v7.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function RashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9.4 9.2h.02M14.7 10.2h.02M11.2 14.9h.02M15.1 15.1h.02M8.4 13.1h.02" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldArt() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-4 h-20 w-20 opacity-90 md:bottom-5 md:right-6 md:h-28 md:w-28" aria-hidden="true">
      <svg viewBox="0 0 112 112" className="h-full w-full">
        <path d="M56 16 83 27.5v22.3C83 69.2 71.9 81.7 56 90.7 40.1 81.7 29 69.2 29 49.8V27.5L56 16Z" fill="#95e2be" />
        <path d="m44.2 54.6 8.1 8.1 18-19.2" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M91 34c2.1 5.1 4.2 7.2 9.3 9.3-5.1 2.1-7.2 4.2-9.3 9.3-2.1-5.1-4.2-7.2-9.3-9.3 5.1-2.1 7.2-4.2 9.3-9.3Z" fill="#bdf2d9" />
        <path d="M22 61c1.6 3.9 3.3 5.6 7.2 7.2-3.9 1.6-5.6 3.3-7.2 7.2-1.6-3.9-3.3-5.6-7.2-7.2 3.9-1.6 5.6-3.3 7.2-7.2Z" fill="#bdf2d9" />
      </svg>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[0.95rem] font-semibold leading-tight text-[var(--color-text)] md:text-[1.05rem]">
        {title}
      </h2>
      {action}
    </div>
  );
}

function HistoryLink({ children = "View all" }: { children?: ReactNode }) {
  return (
    <Link
      to="/history"
      state={{ origin: "/health" }}
      className="inline-flex min-h-8 items-center rounded-full bg-[var(--color-surface-tint)] px-3 text-[0.72rem] font-semibold text-[var(--color-text-secondary)] transition-opacity hover:opacity-75"
    >
      {children}
    </Link>
  );
}

function getTimelineToneStyles(tone: HealthTimelineTone) {
  if (tone === "fever" || tone === "episode") {
    return {
      dot: "#ff7d32",
      surface: "rgba(255, 240, 230, 0.92)",
      text: "#f26f1d",
    };
  }
  if (tone === "rash" || tone === "severe") {
    return {
      dot: "#ef6c8f",
      surface: "rgba(255, 235, 241, 0.92)",
      text: "#d85e7f",
    };
  }
  if (tone === "symptom") {
    return {
      dot: "#78aeea",
      surface: "rgba(237, 244, 255, 0.92)",
      text: "#5a94d5",
    };
  }
  return {
    dot: "#8ecfb0",
    surface: "rgba(235, 249, 240, 0.92)",
    text: "var(--color-healthy)",
  };
}

function getHealthInsightToneStyles(tone: HealthInsightTone) {
  if (tone === "alert") {
    return {
      text: "var(--color-alert)",
      accent: "rgba(255, 231, 226, 0.96)",
    };
  }
  if (tone === "caution") {
    return {
      text: "#f26f1d",
      accent: "rgba(255, 239, 228, 0.96)",
    };
  }
  if (tone === "info") {
    return {
      text: "var(--color-info)",
      accent: "rgba(237, 244, 255, 0.96)",
    };
  }
  return {
    text: "var(--color-healthy)",
    accent: "rgba(235, 249, 240, 0.96)",
  };
}

function getTimelineIcon(item: HealthTimelineItem) {
  if (item.tone === "fever" || item.tone === "episode") return <ThermometerIcon className="h-5 w-5" />;
  if (item.tone === "rash" || item.tone === "severe") return <RashIcon className="h-5 w-5" />;
  if (item.kind === "episode_event") return <HealthShieldIcon className="h-5 w-5" />;
  return <HomeActionSymptomIcon className="h-5 w-5" />;
}

export function HealthSummaryStats({
  activeEpisodeCount,
  recentSymptomCount,
  severeMarkerCount,
  className,
}: {
  activeEpisodeCount: number;
  recentSymptomCount: number;
  severeMarkerCount: number;
  className?: string;
}) {
  const stats = [
    {
      label: "Active episodes",
      value: activeEpisodeCount,
      description: activeEpisodeCount === 1 ? "episode open" : "episodes open",
      icon: <HomeActionEpisodeIcon className="h-5 w-5" />,
      surface: "rgba(255, 239, 228, 0.98)",
      color: "#f26f1d",
    },
    {
      label: "Recent symptoms",
      value: recentSymptomCount,
      description: recentSymptomCount === 1 ? "recent log" : "recent logs",
      icon: <HomeActionSymptomIcon className="h-5 w-5" />,
      surface: "rgba(237, 244, 255, 0.98)",
      color: "var(--color-info)",
    },
    {
      label: "Severe markers",
      value: severeMarkerCount,
      description: "marked severe",
      icon: <HealthShieldIcon className="h-5 w-5" />,
      surface: severeMarkerCount > 0 ? "rgba(255, 231, 226, 0.95)" : "rgba(229, 242, 231, 0.95)",
      color: severeMarkerCount > 0 ? "var(--color-alert)" : "var(--color-healthy)",
    },
  ];

  return (
    <div
      className={cn(
        "relative z-10 mx-auto w-full max-w-[760px] overflow-hidden rounded-[20px] border px-2 py-2 shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px] md:px-5 md:py-4",
        className,
      )}
      style={healthCardStyle}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--color-home-divider)]">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col items-center px-1.5 py-2 text-center md:flex-row md:items-center md:justify-center md:gap-3 md:px-4 md:text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-11 md:w-11" style={{ background: stat.surface, color: stat.color }}>
              {stat.icon}
            </span>
            <div className="mt-2 min-w-0 md:mt-0">
              <p className="text-[0.65rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.75rem]">
                {stat.label}
              </p>
              <p className="mt-1 text-[1.45rem] font-semibold leading-none text-[var(--color-text)] md:text-[1.7rem]">
                {stat.value}
              </p>
              <p className="mt-1 text-[0.64rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.74rem]">
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HealthQuickActionsCard({
  onLogSymptom,
  onStartEpisode,
}: {
  onLogSymptom: () => void;
  onStartEpisode: () => void;
}) {
  const actions = [
    {
      id: "symptom",
      title: "Log symptom",
      detail: "Fever, cough, appetite, rash, gut signs",
      icon: <HomeActionSymptomIcon className="h-6 w-6" />,
      surface: "rgba(237, 244, 255, 0.98)",
      color: "var(--color-info)",
      onClick: onLogSymptom,
    },
    {
      id: "episode",
      title: "Start episode",
      detail: "Track fever, illness, rash, gut issues",
      icon: <HomeActionEpisodeIcon className="h-6 w-6" />,
      surface: "rgba(255, 239, 228, 0.98)",
      color: "#f26f1d",
      onClick: onStartEpisode,
    },
  ];

  return (
    <Card className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]" style={healthCardStyle}>
      <CardContent className="p-4 md:p-5">
        <SectionHeader title="Quick actions" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="flex min-h-[88px] items-center gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-tracker-panel-surface)] px-3.5 py-3 text-left transition-transform hover:-translate-y-0.5 md:min-h-[94px] md:px-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: action.surface, color: action.color }}>
                {action.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-semibold leading-tight text-[var(--color-text)] md:text-[1rem]">
                  {action.title}
                </span>
                <span className="mt-1 block max-w-[28ch] text-[0.76rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.84rem]">
                  {action.detail}
                </span>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthActiveEpisodeCard({
  episode,
  linkedSymptoms,
  onOpenEpisode,
  onStartEpisode,
}: {
  episode: Episode | null;
  linkedSymptoms: SymptomEntry[];
  onOpenEpisode: (episode: Episode) => void;
  onStartEpisode: () => void;
}) {
  const linkedSymptomSummary = linkedSymptoms.map((symptom) => getSymptomTypeLabel(symptom.symptom_type)).slice(0, 3).join(", ");
  const detail = episode?.summary ?? linkedSymptomSummary;

  return (
    <Card className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]" style={healthCardStyle}>
      <CardContent className="p-4 md:p-5">
        <SectionHeader title="Active episode" action={<HistoryLink />} />
        {episode ? (
          <button
            type="button"
            onClick={() => onOpenEpisode(episode)}
            className="mt-3 flex min-h-[90px] w-full items-center gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-tracker-panel-surface)] px-3.5 py-3 text-left transition-transform hover:-translate-y-0.5 md:min-h-[102px] md:px-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(255,239,228,0.98)] text-[#f26f1d]">
              <ThermometerIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.94rem] font-semibold leading-tight text-[var(--color-text)] md:text-[1rem]">
                {getEpisodeTypeLabel(episode.episode_type)}
              </span>
              <span className="mt-1 block truncate text-[0.74rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.82rem]">
                {formatHealthStartedLine(episode.started_at)}
              </span>
              <span className="mt-1 block truncate text-[0.74rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.82rem]">
                {detail || "Tap to add updates as things change."}
              </span>
            </span>
            <Badge variant="caution" className="shrink-0">
              Active
            </Badge>
          </button>
        ) : (
          <EmptyState
            className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-6"
            icon={<HomeActionEpisodeIcon className="h-7 w-7 text-[var(--color-text-soft)]" />}
            title="No active episode"
            description="Start one when symptoms need a running timeline."
            action={<Button variant="secondary" size="sm" onClick={onStartEpisode}>Start episode</Button>}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function HealthRecentSymptomsCard({
  symptoms,
  temperatureUnit,
  onLogSymptom,
}: {
  symptoms: SymptomEntry[];
  temperatureUnit: TemperatureUnit;
  onLogSymptom: () => void;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]" style={healthCardStyle}>
      <CardContent className="p-4 md:p-5">
        <SectionHeader title="Recent symptoms" action={<HistoryLink />} />
        <div className="mt-3">
          {symptoms.length === 0 ? (
            <EmptyState
              className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-6"
              icon={<HomeActionSymptomIcon className="h-7 w-7 text-[var(--color-text-soft)]" />}
              title="No symptoms logged"
              description="Log fever, rash, appetite, cough, or gut signs when they appear."
              action={<Button variant="secondary" size="sm" onClick={onLogSymptom}>Log symptom</Button>}
            />
          ) : symptoms.map((symptom, index) => (
            <Link
              key={symptom.id}
              to="/history"
              state={{ origin: "/health" }}
              className="relative flex min-h-[68px] items-center gap-3 py-2.5 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(255,239,228,0.92)] text-[#f26f1d]">
                {symptom.symptom_type === "rash" ? <RashIcon className="h-5 w-5" /> : <ThermometerIcon className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.86rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.94rem]">
                  {getSymptomTypeLabel(symptom.symptom_type)}
                </span>
                <span className="mt-0.5 block truncate text-[0.73rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.8rem]">
                  {getSymptomDisplayDetail(symptom, temperatureUnit)}
                </span>
              </span>
              <Badge variant={getSymptomSeverityBadgeVariant(symptom.severity)} className="shrink-0">
                {getSymptomSeverityLabel(symptom.severity)}
              </Badge>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--color-home-chevron)]" />
              {index < symptoms.length - 1 && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-[52px] bottom-0 h-px bg-[var(--color-home-divider)]" />
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthInsightCard({
  insight,
  onLogSymptom,
  onStartEpisode,
}: {
  insight: HealthInsightModel;
  onLogSymptom: () => void;
  onStartEpisode: () => void;
}) {
  const tone = getHealthInsightToneStyles(insight.tone);
  const action = insight.action === "history" ? (
    <Link
      to="/history"
      state={{ origin: "/health" }}
      className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold transition-opacity hover:opacity-75 md:text-[0.84rem]"
      style={{ color: tone.text }}
    >
      {insight.actionLabel}
      <ChevronDownIcon />
    </Link>
  ) : (
    <button
      type="button"
      onClick={insight.action === "episode" ? onStartEpisode : onLogSymptom}
      className="mt-4 inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.78rem] font-semibold transition-opacity hover:opacity-75 md:text-[0.84rem]"
      style={{ background: tone.accent, color: tone.text }}
    >
      {insight.actionLabel}
    </button>
  );

  return (
    <Card
      className="relative overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]"
      style={{
        background: "var(--gradient-tracker-insight-growth)",
        borderColor: "var(--color-home-card-border)",
      }}
    >
      <ShieldArt />
      <CardContent className="relative p-4 pr-24 md:p-5 md:pr-36">
        <p
          className="flex items-center gap-1.5 text-[0.72rem] font-semibold leading-tight md:text-[0.78rem]"
          style={{ color: tone.text }}
        >
          <HealthShieldIcon className="h-4 w-4" />
          {insight.eyebrow}
        </p>
        <p className="mt-3 max-w-[42ch] text-[0.96rem] font-semibold leading-tight text-[var(--color-text)] md:text-[1.06rem]">
          {insight.title}
        </p>
        <p className="mt-2 max-w-[44ch] text-[0.78rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.86rem]">
          {insight.description}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}

export function HealthRecentHistoryCard({
  items,
}: {
  items: HealthTimelineItem[];
}) {
  return (
    <Card className="overflow-hidden rounded-[18px] border shadow-[var(--shadow-home-card)] backdrop-blur-sm md:rounded-[24px]" style={healthCardStyle}>
      <CardContent className="p-4 md:p-5">
        <SectionHeader title="Recent history" action={<HistoryLink />} />
        <div className="mt-3">
          {items.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--color-home-empty-surface)] px-4 py-5 text-center text-[0.78rem] leading-snug text-[var(--color-text-secondary)]">
              Health events will appear here as you log symptoms or episodes.
            </div>
          ) : items.map((item, index) => {
            const tone = getTimelineToneStyles(item.tone);
            const isLast = index === items.length - 1;

            return (
              <Link
                key={item.id}
                to="/history"
                state={{ origin: "/health" }}
                className="relative flex min-h-[68px] items-center gap-3 py-2.5 text-left"
              >
                <span className="relative flex w-3 shrink-0 justify-center self-stretch pt-4">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
                  {!isLast && (
                    <span className="absolute top-8 h-[42px] w-px bg-[var(--color-home-divider)]" aria-hidden="true" />
                  )}
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: tone.surface, color: tone.text }}>
                  {getTimelineIcon(item)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.84rem] font-semibold leading-tight text-[var(--color-text)] md:text-[0.94rem]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.72rem] leading-tight text-[var(--color-text-secondary)] md:text-[0.8rem]">
                    {[item.meta, item.detail].filter(Boolean).join(detailSeparator)}
                  </span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--color-home-chevron)]" />
                {!isLast && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-[66px] bottom-0 h-px bg-[var(--color-home-divider)]" />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
