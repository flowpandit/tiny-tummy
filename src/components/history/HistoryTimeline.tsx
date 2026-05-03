import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { BITSS_TYPES, STOOL_COLORS } from "../../lib/constants";
import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../../lib/episode-constants";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../../lib/feeding";
import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import { loadPhoto } from "../../lib/photos";
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "../../lib/symptom-constants";
import { cn } from "../../lib/cn";
import {
  formatHistoryDateTime,
  formatHistoryDayHeader,
  formatHistorySleepDuration,
  formatHistoryTime,
  type TimelineEvent,
  type TimelineEventSummary,
} from "../../lib/history-timeline";
import { formatGrowthSummary as formatGrowthSummaryWithUnits, formatTemperatureValue } from "../../lib/units";
import {
  HomeActionBottleIcon,
  HomeActionDiaperIcon,
  HomeActionSleepIcon,
  MealIcon,
  NoPoopIcon,
  PoopIcon,
} from "../ui/icons";
import { diaperDirtyIcon, diaperMixedIcon, diaperWetIcon } from "../../assets/icons";
import type {
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
  TemperatureUnit,
} from "../../lib/types";

type HistoryTone = "feed" | "poop" | "wet" | "sleep" | "symptom" | "milestone" | "episode";

const HISTORY_TONES: Record<HistoryTone, {
  label: string;
  bg: string;
  fg: string;
  iconBg: string;
  dotBg: string;
  dotBorder: string;
}> = {
  feed: {
    label: "feed",
    bg: "color-mix(in srgb, #ef7f55 16%, transparent)",
    fg: "#de704d",
    iconBg: "color-mix(in srgb, #ef7f55 14%, white)",
    dotBg: "#fff6f1",
    dotBorder: "#f4ad8f",
  },
  poop: {
    label: "poop",
    bg: "color-mix(in srgb, #9a6a42 15%, transparent)",
    fg: "#8d603d",
    iconBg: "color-mix(in srgb, #9a6a42 13%, white)",
    dotBg: "#fff8f0",
    dotBorder: "#d2a77e",
  },
  wet: {
    label: "wet",
    bg: "color-mix(in srgb, #5f9fca 15%, transparent)",
    fg: "#4f8fbd",
    iconBg: "color-mix(in srgb, #5f9fca 13%, white)",
    dotBg: "#f4fbff",
    dotBorder: "#a9cfe5",
  },
  sleep: {
    label: "sleep",
    bg: "color-mix(in srgb, #7b66d7 15%, transparent)",
    fg: "#6f5ed0",
    iconBg: "color-mix(in srgb, #7b66d7 13%, white)",
    dotBg: "#f8f5ff",
    dotBorder: "#c6b8f0",
  },
  symptom: {
    label: "symptom",
    bg: "color-mix(in srgb, #c29542 16%, transparent)",
    fg: "#a87521",
    iconBg: "color-mix(in srgb, #c29542 14%, white)",
    dotBg: "#fffaf0",
    dotBorder: "#e3c98f",
  },
  milestone: {
    label: "milestone",
    bg: "color-mix(in srgb, #9875d7 15%, transparent)",
    fg: "#8060c2",
    iconBg: "color-mix(in srgb, #9875d7 13%, white)",
    dotBg: "#faf7ff",
    dotBorder: "#cfb9ef",
  },
  episode: {
    label: "episode",
    bg: "color-mix(in srgb, #cf765e 16%, transparent)",
    fg: "#b95f4c",
    iconBg: "color-mix(in srgb, #cf765e 14%, white)",
    dotBg: "#fff6f2",
    dotBorder: "#e6aa99",
  },
};

function PhotoThumbnail({ photoPath }: { photoPath: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let revokedSrc: string | null = null;

    loadPhoto(photoPath)
      .then((nextSrc) => {
        revokedSrc = nextSrc;
        setSrc(nextSrc);
      })
      .catch(() => setSrc(null));

    return () => {
      if (revokedSrc) URL.revokeObjectURL(revokedSrc);
    };
  }, [photoPath]);

  if (!src) return null;
  return <img src={src} alt="Log photo" className="h-8 w-8 rounded-[10px] border border-[var(--color-border)] object-cover" />;
}

function SleepGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
    </svg>
  );
}

function SymptomGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function GrowthGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20V8m5 12V4m5 16v-9" />
    </svg>
  );
}

function MilestoneGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 14 3-3 2 2 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h18" />
    </svg>
  );
}

function EpisodeGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

function OtherGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" />
      <path d="M9 10.25h.01M15 10.25h.01M9.5 14.25c1.25 1 3.75 1 5 0" />
    </svg>
  );
}

function HistoryTag({ tone, label }: { tone: HistoryTone; label?: string }) {
  const toneStyle = HISTORY_TONES[tone];

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[0.72rem] font-semibold leading-none"
      style={{ background: toneStyle.bg, color: toneStyle.fg }}
    >
      {label ?? toneStyle.label}
    </span>
  );
}

function IconBubble({ tone, children, className }: { tone: HistoryTone; children: ReactNode; className?: string }) {
  const toneStyle = HISTORY_TONES[tone];

  return (
    <span
      className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full", className)}
      style={{ background: toneStyle.iconBg, color: toneStyle.fg }}
    >
      {children}
    </span>
  );
}

function SwipeableItem({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60], [1, 0]);

  return (
    <div className="relative overflow-hidden rounded-[18px]">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[18px] bg-[var(--color-alert)] pr-5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-5 w-5">
          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
        </svg>
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) onDelete();
        }}
        className="relative z-10 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}

function BaseItem({
  icon,
  tone,
  time,
  title,
  subtitle,
  tagLabel,
  media,
  onTap,
}: {
  icon: ReactNode;
  tone: HistoryTone;
  time: string;
  title: string;
  subtitle?: string | null;
  tagLabel?: string;
  media?: ReactNode;
  onTap?: () => void;
}) {
  const className = cn(
    "group flex min-h-[68px] items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-home-card-surface)] px-3 py-2.5 text-left shadow-[0_10px_24px_rgba(172,139,113,0.07)] transition-colors",
    onTap ? "cursor-pointer hover:bg-[var(--color-surface-strong)]" : "",
  );

  return (
    <div
      onClick={onTap}
      onKeyDown={(event) => {
        if (!onTap) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap();
        }
      }}
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      className={className}
    >
      <IconBubble tone={tone}>{icon}</IconBubble>
      <div className="min-w-0 flex-1">
        <p className="text-[0.75rem] font-medium leading-none text-[var(--color-text-secondary)]">{time}</p>
        <p className="mt-1 text-[0.94rem] font-semibold leading-tight text-[var(--color-text)]">{title}</p>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[0.8rem] leading-snug text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {media}
        <HistoryTag tone={tone} label={tagLabel} />
        {onTap && (
          <span className="text-[1.35rem] leading-none text-[var(--color-text-soft)] transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            ›
          </span>
        )}
      </div>
    </div>
  );
}

function getDiaperHistoryIcon(diaperType: DiaperEntry["diaper_type"]): string {
  if (diaperType === "wet") return diaperWetIcon;
  if (diaperType === "mixed") return diaperMixedIcon;
  return diaperDirtyIcon;
}

function getEventTone(event: TimelineEvent): HistoryTone {
  switch (event.kind) {
    case "meal":
      return "feed";
    case "sleep":
      return "sleep";
    case "symptom":
      return "symptom";
    case "growth":
    case "milestone":
      return "milestone";
    case "episode":
    case "episode_event":
      return "episode";
    case "poop":
      return "poop";
    case "diaper":
      return event.entry.diaper_type === "wet" ? "wet" : "poop";
  }
}

function DiaperItem({ entry, onTap }: { entry: DiaperEntry; onTap: () => void }) {
  const tone = entry.diaper_type === "wet" ? "wet" : "poop";
  const stoolLabel = entry.stool_type ? BITSS_TYPES.find((item) => item.type === entry.stool_type)?.label : null;
  const details = [
    entry.urine_color ? getUrineColorLabel(entry.urine_color) : null,
    entry.stool_type ? `Type ${entry.stool_type}${stoolLabel ? `, ${stoolLabel}` : ""}` : null,
    entry.notes,
  ].filter(Boolean).join(" · ");

  return (
    <BaseItem
      onTap={onTap}
      tone={tone}
      icon={<img src={getDiaperHistoryIcon(entry.diaper_type)} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />}
      time={formatHistoryTime(entry.logged_at)}
      title={getDiaperTypeLabel(entry.diaper_type)}
      subtitle={details || null}
      tagLabel={tone === "wet" ? "wet" : "poop"}
    />
  );
}

function PoopItem({ log, onTap }: { log: PoopEntry; onTap: () => void }) {
  const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
  const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
  const details = [
    typeInfo ? `Type ${typeInfo.type}, ${typeInfo.label}` : null,
    colorInfo?.label,
    log.size,
    colorInfo?.isRedFlag ? "red flag color" : null,
    log.notes,
  ].filter(Boolean).join(" · ");

  return (
    <BaseItem
      onTap={onTap}
      tone="poop"
      icon={log.is_no_poop
        ? <NoPoopIcon className="h-4 w-4 flex-shrink-0" color="currentColor" />
        : <PoopIcon className="h-4 w-4 flex-shrink-0" color={colorInfo?.hex ?? "currentColor"} />}
      time={formatHistoryTime(log.logged_at)}
      title={log.is_no_poop ? "No poop day" : "Poop"}
      subtitle={details || null}
      tagLabel="poop"
      media={log.photo_path ? <PhotoThumbnail photoPath={log.photo_path} /> : null}
    />
  );
}

function MealItem({ meal, unitSystem, onTap }: { meal: FeedingEntry; unitSystem: "metric" | "imperial"; onTap: () => void }) {
  const detailText = getFeedingEntryDetailParts(meal, unitSystem).join(" · ");
  const secondaryText = [detailText, getFeedingEntrySecondaryText(meal)].filter(Boolean).join(" · ");

  return (
    <BaseItem
      onTap={onTap}
      tone="feed"
      icon={meal.food_type === "bottle" || meal.food_type === "formula"
        ? <HomeActionBottleIcon className="h-4 w-4" />
        : <MealIcon className="h-4 w-4 flex-shrink-0" color="currentColor" />}
      time={formatHistoryTime(meal.logged_at)}
      title={getFeedingEntryPrimaryLabel(meal)}
      subtitle={secondaryText || null}
      tagLabel="feed"
    />
  );
}

function SleepItem({ entry, onTap }: { entry: SleepEntry; onTap: () => void }) {
  return (
    <BaseItem
      onTap={onTap}
      tone="sleep"
      icon={<SleepGlyph />}
      time={formatHistoryTime(entry.started_at)}
      title={entry.sleep_type === "night" ? "Night sleep" : "Nap"}
      subtitle={`${formatHistorySleepDuration(entry)} · ${formatHistoryTime(entry.started_at)} - ${formatHistoryTime(entry.ended_at)}${entry.notes ? ` · ${entry.notes}` : ""}`}
      tagLabel="sleep"
    />
  );
}

function SymptomItem({ entry, temperatureUnit, onTap }: { entry: SymptomEntry; temperatureUnit: TemperatureUnit; onTap: () => void }) {
  const temperatureLabel = entry.temperature_c !== null
    ? formatTemperatureValue(entry.temperature_c, temperatureUnit)
    : null;

  return (
    <BaseItem
      onTap={onTap}
      tone="symptom"
      icon={<SymptomGlyph />}
      time={formatHistoryTime(entry.logged_at)}
      title={getSymptomTypeLabel(entry.symptom_type)}
      subtitle={[getSymptomSeverityLabel(entry.severity), temperatureLabel, getTemperatureMethodLabel(entry.temperature_method), entry.notes, entry.episode_id ? "in episode" : null].filter(Boolean).join(" · ")}
      tagLabel="symptom"
    />
  );
}

function GrowthItem({ entry, unitSystem }: { entry: GrowthEntry; unitSystem: "metric" | "imperial" }) {
  return (
    <BaseItem
      tone="milestone"
      icon={<GrowthGlyph />}
      time={formatHistoryTime(entry.measured_at)}
      title="Growth check"
      subtitle={[formatGrowthSummaryWithUnits(entry, unitSystem), entry.notes].filter(Boolean).join(" · ")}
      tagLabel="milestone"
    />
  );
}

function MilestoneItem({ entry }: { entry: MilestoneEntry }) {
  return (
    <BaseItem
      tone="milestone"
      icon={<MilestoneGlyph />}
      time={formatHistoryTime(entry.logged_at)}
      title={getMilestoneTypeLabel(entry.milestone_type)}
      subtitle={entry.notes}
      tagLabel="milestone"
    />
  );
}

function EpisodeItem({ entry, onTap }: { entry: Episode; onTap: () => void }) {
  const statusText = entry.status === "resolved"
    ? `Resolved ${entry.ended_at ? formatHistoryDateTime(entry.ended_at) : ""}`.trim()
    : "Active episode";

  return (
    <BaseItem
      onTap={onTap}
      tone="episode"
      icon={<EpisodeGlyph />}
      time={formatHistoryTime(entry.started_at)}
      title={`${getEpisodeTypeLabel(entry.episode_type)} episode`}
      subtitle={[statusText, entry.summary ?? entry.outcome].filter(Boolean).join(" · ")}
      tagLabel="episode"
    />
  );
}

function EpisodeEventItem({ entry, onTap }: { entry: EpisodeEvent; onTap: () => void }) {
  return (
    <BaseItem
      onTap={onTap}
      tone="episode"
      icon={<EpisodeGlyph />}
      time={formatHistoryTime(entry.logged_at)}
      title={entry.title}
      subtitle={[getEpisodeEventTypeLabel(entry.event_type), entry.notes].filter(Boolean).join(" · ")}
      tagLabel="episode"
    />
  );
}

function renderEventItem({
  event,
  onDeleteDiaper,
  onDeletePoop,
  onDeleteMeal,
  onDeleteSleep,
  onEditDiaper,
  onEditPoop,
  onEditMeal,
  onEditSleep,
  onEditSymptom,
  onOpenEpisode,
  unitSystem,
  temperatureUnit,
}: {
  event: TimelineEvent;
  onDeleteDiaper: (entry: DiaperEntry) => void;
  onDeletePoop: (id: string) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onEditDiaper: (entry: DiaperEntry) => void;
  onEditPoop: (entry: PoopEntry) => void;
  onEditMeal: (entry: FeedingEntry) => void;
  onEditSleep: (entry: SleepEntry) => void;
  onEditSymptom: (entry: SymptomEntry) => void;
  onOpenEpisode: (episodeId: string) => void;
  unitSystem: "metric" | "imperial";
  temperatureUnit: TemperatureUnit;
}) {
  switch (event.kind) {
    case "diaper":
      return <SwipeableItem onDelete={() => onDeleteDiaper(event.entry)}><DiaperItem entry={event.entry} onTap={() => onEditDiaper(event.entry)} /></SwipeableItem>;
    case "poop":
      return <SwipeableItem onDelete={() => onDeletePoop(event.entry.id)}><PoopItem log={event.entry} onTap={() => onEditPoop(event.entry)} /></SwipeableItem>;
    case "meal":
      return <SwipeableItem onDelete={() => onDeleteMeal(event.entry.id)}><MealItem meal={event.entry} unitSystem={unitSystem} onTap={() => onEditMeal(event.entry)} /></SwipeableItem>;
    case "sleep":
      return <SwipeableItem onDelete={() => onDeleteSleep(event.entry.id)}><SleepItem entry={event.entry} onTap={() => onEditSleep(event.entry)} /></SwipeableItem>;
    case "symptom":
      return <SymptomItem entry={event.entry} temperatureUnit={temperatureUnit} onTap={() => onEditSymptom(event.entry)} />;
    case "growth":
      return <GrowthItem entry={event.entry} unitSystem={unitSystem} />;
    case "milestone":
      return <MilestoneItem entry={event.entry} />;
    case "episode":
      return <EpisodeItem entry={event.entry} onTap={() => onOpenEpisode(event.entry.id)} />;
    case "episode_event":
      return <EpisodeEventItem entry={event.entry} onTap={() => onOpenEpisode(event.entry.episode_id)} />;
  }
}

function TimelineRail({
  event,
  isFirst,
  isLast,
  hasTrailingGap,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  hasTrailingGap: boolean;
}) {
  const tone = getEventTone(event);
  const toneStyle = HISTORY_TONES[tone];
  const dotTop = hasTrailingGap ? "calc((100% - 0.625rem) / 2)" : "50%";

  return (
    <div className="relative h-full w-5 flex-shrink-0">
      {!isFirst && (
        <span
          className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-[var(--color-home-divider)]"
          style={{ height: dotTop }}
          aria-hidden="true"
        />
      )}
      {!isLast && (
        <span
          className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-[var(--color-home-divider)]"
          style={{ top: dotTop }}
          aria-hidden="true"
        />
      )}
      <span
        className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ top: dotTop, backgroundColor: toneStyle.dotBg, borderColor: toneStyle.dotBorder }}
        aria-hidden="true"
      />
    </div>
  );
}

function DayCard({
  date,
  events,
  isExpanded,
  onToggle,
  onDeleteDiaper,
  onDeletePoop,
  onDeleteMeal,
  onDeleteSleep,
  onEditDiaper,
  onEditPoop,
  onEditMeal,
  onEditSleep,
  onEditSymptom,
  onOpenEpisode,
  unitSystem,
  temperatureUnit,
}: {
  date: string;
  events: TimelineEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeleteDiaper: (entry: DiaperEntry) => void;
  onDeletePoop: (id: string) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onEditDiaper: (entry: DiaperEntry) => void;
  onEditPoop: (entry: PoopEntry) => void;
  onEditMeal: (entry: FeedingEntry) => void;
  onEditSleep: (entry: SleepEntry) => void;
  onEditSymptom: (entry: SymptomEntry) => void;
  onOpenEpisode: (episodeId: string) => void;
  unitSystem: "metric" | "imperial";
  temperatureUnit: TemperatureUnit;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.36)] px-3 py-3 shadow-[0_12px_28px_rgba(172,139,113,0.06)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-0.5 pb-2.5 text-left"
        aria-expanded={isExpanded}
      >
        <h2 className="text-[1.04rem] font-semibold leading-none text-[var(--color-text)]">{formatHistoryDayHeader(date)}</h2>
        <div className="flex items-center gap-2 text-[0.82rem] font-medium text-[var(--color-text-secondary)]">
          <span>{events.length} event{events.length === 1 ? "" : "s"}</span>
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 flex-shrink-0 text-[var(--color-text-soft)]"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col">
              {events.map((event, index) => (
                <div
                  key={`${event.kind}-${event.entry.id}`}
                  className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5"
                >
                  <TimelineRail
                    event={event}
                    isFirst={index === 0}
                    isLast={index === events.length - 1}
                    hasTrailingGap={index < events.length - 1}
                  />
                  <div className={cn(index < events.length - 1 && "pb-2.5")}>
                    {renderEventItem({
                      event,
                      onDeleteDiaper,
                      onDeletePoop,
                      onDeleteMeal,
                      onDeleteSleep,
                      onEditDiaper,
                      onEditPoop,
                      onEditMeal,
                      onEditSleep,
                      onEditSymptom,
                      onOpenEpisode,
                      unitSystem,
                      temperatureUnit,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function OverviewMetric({
  tone,
  value,
  label,
  icon,
}: {
  tone: HistoryTone;
  value: string | number;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
      <IconBubble tone={tone} className="h-8 w-8 sm:h-9 sm:w-9">{icon}</IconBubble>
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-[0.92rem] font-semibold leading-none text-[var(--color-text)] sm:text-[0.98rem]">{value}</p>
        <p className="mt-0.5 truncate text-[0.68rem] font-medium leading-tight text-[var(--color-text-secondary)] sm:text-[0.76rem]">{label}</p>
      </div>
    </div>
  );
}

export function HistoryTodayOverview({
  summary,
  title = "Today overview",
}: {
  summary: TimelineEventSummary;
  title?: string;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-home-card-surface)] px-3.5 py-3.5 shadow-[0_12px_28px_rgba(172,139,113,0.07)]">
      <h2 className="text-[0.98rem] font-semibold leading-none text-[var(--color-text)]">{title}</h2>
      <div className="mt-3 grid grid-cols-5 gap-1">
        <OverviewMetric tone="feed" value={summary.feeds} label="Feeds" icon={<HomeActionBottleIcon className="h-4 w-4" />} />
        <OverviewMetric tone="poop" value={summary.poops} label="Poops" icon={<PoopIcon className="h-4 w-4" color="currentColor" />} />
        <OverviewMetric tone="sleep" value={summary.sleep} label="Sleep" icon={<HomeActionSleepIcon className="h-4 w-4" />} />
        <OverviewMetric tone="wet" value={summary.diapers} label="Diapers" icon={<HomeActionDiaperIcon className="h-4 w-4" />} />
        <OverviewMetric tone="episode" value={summary.other > 0 ? `+${summary.other}` : summary.other} label="Other" icon={<OtherGlyph />} />
      </div>
    </section>
  );
}

export function HistoryTimeline({
  displayDays,
  expandedDay,
  onDeleteDiaper,
  onDeleteMeal,
  onDeletePoop,
  onDeleteSleep,
  onEditDiaper,
  onEditMeal,
  onEditPoop,
  onEditSleep,
  onEditSymptom,
  onOpenEpisode,
  onSetExpandedDay,
  unitSystem,
  temperatureUnit,
}: {
  displayDays: Array<[string, TimelineEvent[]]>;
  expandedDay: string | null;
  onDeleteDiaper: (entry: DiaperEntry) => void;
  onDeleteMeal: (id: string) => void;
  onDeletePoop: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onEditDiaper: (entry: DiaperEntry) => void;
  onEditMeal: (entry: FeedingEntry) => void;
  onEditPoop: (entry: PoopEntry) => void;
  onEditSleep: (entry: SleepEntry) => void;
  onEditSymptom: (entry: SymptomEntry) => void;
  onOpenEpisode: (episodeId: string) => void;
  onSetExpandedDay: (date: string | null) => void;
  unitSystem: "metric" | "imperial";
  temperatureUnit: TemperatureUnit;
}) {
  return (
    <div className="flex flex-col gap-3">
      {displayDays.map(([date, events]) => (
        <DayCard
          key={date}
          date={date}
          events={events}
          isExpanded={expandedDay === date}
          onToggle={() => onSetExpandedDay(expandedDay === date ? null : date)}
          onDeleteDiaper={onDeleteDiaper}
          onDeletePoop={onDeletePoop}
          onDeleteMeal={onDeleteMeal}
          onDeleteSleep={onDeleteSleep}
          onEditDiaper={onEditDiaper}
          onEditPoop={onEditPoop}
          onEditMeal={onEditMeal}
          onEditSleep={onEditSleep}
          onEditSymptom={onEditSymptom}
          onOpenEpisode={onOpenEpisode}
          unitSystem={unitSystem}
          temperatureUnit={temperatureUnit}
        />
      ))}
    </div>
  );
}
