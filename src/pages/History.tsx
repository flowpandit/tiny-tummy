import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useFeedingLogs } from "../hooks/useFeedingLogs";
import { useSleepLogs } from "../hooks/useSleepLogs";
import { useSymptoms } from "../hooks/useSymptoms";
import { useGrowthLogs } from "../hooks/useGrowthLogs";
import { useMilestoneLogs } from "../hooks/useMilestoneLogs";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../lib/feeding";
import { getMilestoneTypeLabel } from "../lib/milestone-constants";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { Badge } from "../components/ui/badge";
import { PoopIcon, MealIcon, NoPoopIcon } from "../components/ui/icons";
import { DatePicker } from "../components/ui/date-picker";
import { PageBackButton } from "../components/ui/page-layout";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { loadPhoto } from "../lib/photos";
import { cn } from "../lib/cn";
import { formatGrowthSummary as formatGrowthSummaryWithUnits } from "../lib/units";
import * as db from "../lib/db";
import type {
  Episode,
  EpisodeEvent,
  FeedingEntry,
  GrowthEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
} from "../lib/types";

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
  return <img src={src} alt="Log photo" className="h-10 w-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] object-cover" />;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayHeader(dateStr: string): string {
  const day = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSleepDuration(entry: SleepEntry): string {
  const minutes = Math.max(0, Math.round((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function SleepGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="1.75" className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3c-.12.64-.21 1.3-.21 2a9 9 0 0 0 10 7.79Z" />
    </svg>
  );
}

function SymptomGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-caution)" strokeWidth="1.75" className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function GrowthGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-healthy)" strokeWidth="1.75" className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20V8m5 12V4m5 16v-9" />
    </svg>
  );
}

function MilestoneGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 14 3-3 2 2 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h18" />
    </svg>
  );
}

function EpisodeGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="1.75" className="h-5 w-5 flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

type TimelineEvent =
  | { kind: "poop"; entry: PoopEntry }
  | { kind: "meal"; entry: FeedingEntry }
  | { kind: "sleep"; entry: SleepEntry }
  | { kind: "symptom"; entry: SymptomEntry }
  | { kind: "growth"; entry: GrowthEntry }
  | { kind: "milestone"; entry: MilestoneEntry }
  | { kind: "episode"; entry: Episode }
  | { kind: "episode_event"; entry: EpisodeEvent };

function getEventTimestamp(event: TimelineEvent): string {
  switch (event.kind) {
    case "poop":
    case "meal":
    case "symptom":
    case "milestone":
    case "episode_event":
      return event.entry.logged_at;
    case "sleep":
      return event.entry.started_at;
    case "growth":
      return event.entry.measured_at;
    case "episode":
      return event.entry.started_at;
  }
}

function groupByDay({
  poopLogs,
  feedingLogs,
  sleepLogs,
  symptomLogs,
  growthLogs,
  milestoneLogs,
  episodes,
  episodeEvents,
}: {
  poopLogs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  milestoneLogs: MilestoneEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
}): Map<string, TimelineEvent[]> {
  const all: TimelineEvent[] = [
    ...poopLogs.map((entry) => ({ kind: "poop" as const, entry })),
    ...feedingLogs.map((entry) => ({ kind: "meal" as const, entry })),
    ...sleepLogs.map((entry) => ({ kind: "sleep" as const, entry })),
    ...symptomLogs.map((entry) => ({ kind: "symptom" as const, entry })),
    ...growthLogs.map((entry) => ({ kind: "growth" as const, entry })),
    ...milestoneLogs.map((entry) => ({ kind: "milestone" as const, entry })),
    ...episodes.map((entry) => ({ kind: "episode" as const, entry })),
    ...episodeEvents.map((entry) => ({ kind: "episode_event" as const, entry })),
  ];

  const grouped = new Map<string, TimelineEvent[]>();

  for (const item of all) {
    const day = getEventTimestamp(item).split("T")[0];
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)?.push(item);
  }

  for (const events of grouped.values()) {
    events.sort((left, right) => new Date(getEventTimestamp(left)).getTime() - new Date(getEventTimestamp(right)).getTime());
  }

  return new Map([...grouped.entries()].sort((left, right) => right[0].localeCompare(left[0])));
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
    <div className="relative overflow-hidden rounded-[var(--radius-md)]">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-[var(--radius-md)] bg-[var(--color-alert)] pr-5"
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
  time,
  title,
  subtitle,
  tail,
  onTap,
}: {
  icon: ReactNode;
  time: string;
  title: string;
  subtitle?: string | null;
  tail?: ReactNode;
  onTap?: () => void;
}) {
  const className = cn(
    "flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors",
    onTap ? "cursor-pointer hover:bg-[var(--color-bg)]" : "",
  );

  return (
    <div onClick={onTap} className={className}>
      {icon}
      <span className="w-14 flex-shrink-0 text-xs text-[var(--color-muted)]">{time}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text)]">{title}</p>
        {subtitle && <p className="truncate text-xs text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      {tail}
    </div>
  );
}

function PoopItem({ log, onTap }: { log: PoopEntry; onTap: () => void }) {
  const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
  const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;

  return (
    <BaseItem
      onTap={onTap}
      icon={log.is_no_poop ? <NoPoopIcon className="h-5 w-5 flex-shrink-0" /> : <PoopIcon className="h-5 w-5 flex-shrink-0" color={colorInfo?.hex ?? "#8B6914"} />}
      time={formatTime(log.logged_at)}
      title={log.is_no_poop ? "No poop day" : typeInfo ? `Type ${typeInfo.type}: ${typeInfo.label}` : "Poop logged"}
      subtitle={log.notes}
      tail={(
        <div className="flex items-center gap-1">
          {log.photo_path && <PhotoThumbnail photoPath={log.photo_path} />}
          {log.size && <Badge variant="default">{log.size}</Badge>}
          {colorInfo?.isRedFlag && <Badge variant="alert">flag</Badge>}
        </div>
      )}
    />
  );
}

function MealItem({ meal, unitSystem, onTap }: { meal: FeedingEntry; unitSystem: "metric" | "imperial"; onTap: () => void }) {
  const detailText = getFeedingEntryDetailParts(meal, unitSystem).join(" · ");
  const secondaryText = [detailText, getFeedingEntrySecondaryText(meal)].filter(Boolean).join(" • ");

  return (
    <BaseItem
      onTap={onTap}
      icon={<MealIcon className="h-5 w-5 flex-shrink-0" color="var(--color-primary)" />}
      time={formatTime(meal.logged_at)}
      title={getFeedingEntryPrimaryLabel(meal)}
      subtitle={secondaryText}
      tail={<Badge variant="info">feed</Badge>}
    />
  );
}

function SleepItem({ entry, onTap }: { entry: SleepEntry; onTap: () => void }) {
  return (
    <BaseItem
      onTap={onTap}
      icon={<SleepGlyph />}
      time={formatTime(entry.started_at)}
      title={entry.sleep_type === "night" ? "Night sleep" : "Nap"}
      subtitle={`${formatSleepDuration(entry)} • ${formatTime(entry.started_at)} - ${formatTime(entry.ended_at)}${entry.notes ? ` • ${entry.notes}` : ""}`}
      tail={<Badge variant={entry.sleep_type === "night" ? "healthy" : "info"}>{entry.sleep_type}</Badge>}
    />
  );
}

function SymptomItem({ entry }: { entry: SymptomEntry }) {
  return (
    <BaseItem
      icon={<SymptomGlyph />}
      time={formatTime(entry.logged_at)}
      title={getSymptomTypeLabel(entry.symptom_type)}
      subtitle={[entry.notes, entry.episode_id ? "linked to episode" : null].filter(Boolean).join(" • ")}
      tail={<Badge variant={getSymptomSeverityBadgeVariant(entry.severity)}>{getSymptomSeverityLabel(entry.severity)}</Badge>}
    />
  );
}

function GrowthItem({ entry, unitSystem }: { entry: GrowthEntry; unitSystem: "metric" | "imperial" }) {
  return (
    <BaseItem
      icon={<GrowthGlyph />}
      time={formatTime(entry.measured_at)}
      title="Growth check"
      subtitle={[formatGrowthSummaryWithUnits(entry, unitSystem), entry.notes].filter(Boolean).join(" • ")}
      tail={<Badge variant="healthy">growth</Badge>}
    />
  );
}

function MilestoneItem({ entry }: { entry: MilestoneEntry }) {
  return (
    <BaseItem
      icon={<MilestoneGlyph />}
      time={formatTime(entry.logged_at)}
      title={getMilestoneTypeLabel(entry.milestone_type)}
      subtitle={entry.notes}
      tail={<Badge variant="default">milestone</Badge>}
    />
  );
}

function EpisodeItem({ entry }: { entry: Episode }) {
  const statusText = entry.status === "resolved"
    ? `Resolved ${entry.ended_at ? formatDateTime(entry.ended_at) : ""}`.trim()
    : "Active episode";

  return (
    <BaseItem
      icon={<EpisodeGlyph />}
      time={formatTime(entry.started_at)}
      title={`${getEpisodeTypeLabel(entry.episode_type)} episode`}
      subtitle={[statusText, entry.summary ?? entry.outcome].filter(Boolean).join(" • ")}
      tail={<Badge variant={entry.status === "resolved" ? "healthy" : "caution"}>{entry.status}</Badge>}
    />
  );
}

function EpisodeEventItem({ entry }: { entry: EpisodeEvent }) {
  return (
    <BaseItem
      icon={<EpisodeGlyph />}
      time={formatTime(entry.logged_at)}
      title={entry.title}
      subtitle={[getEpisodeEventTypeLabel(entry.event_type), entry.notes].filter(Boolean).join(" • ")}
      tail={<Badge variant="default">{getEpisodeEventTypeLabel(entry.event_type).toLowerCase()}</Badge>}
    />
  );
}

function DayCard({
  date,
  events,
  isExpanded,
  onToggle,
  onDeletePoop,
  onDeleteMeal,
  onDeleteSleep,
  onEditPoop,
  onEditMeal,
  onEditSleep,
  unitSystem,
}: {
  date: string;
  events: TimelineEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeletePoop: (id: string) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onEditPoop: (entry: PoopEntry) => void;
  onEditMeal: (entry: FeedingEntry) => void;
  onEditSleep: (entry: SleepEntry) => void;
  unitSystem: "metric" | "imperial";
}) {
  const poopCount = events.filter((event) => event.kind === "poop" && event.entry.is_no_poop === 0).length;
  const feedCount = events.filter((event) => event.kind === "meal").length;
  const sleepCount = events.filter((event) => event.kind === "sleep").length;
  const otherCount = events.filter((event) => !["poop", "meal", "sleep"].includes(event.kind)).length;
  const noPoopCount = events.filter((event) => event.kind === "poop" && event.entry.is_no_poop === 1).length;

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between rounded-[var(--radius-md)] px-4 py-3 transition-colors",
          isExpanded
            ? "border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5"
            : "border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]",
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-semibold", isExpanded ? "text-[var(--color-primary)]" : "text-[var(--color-text)]")}>
            {formatDayHeader(date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {poopCount > 0 && <span className="text-xs font-medium text-[var(--color-cta)]">{poopCount} poop{poopCount === 1 ? "" : "s"}</span>}
          {feedCount > 0 && <span className="text-xs font-medium text-[var(--color-primary)]">{feedCount} feed{feedCount === 1 ? "" : "s"}</span>}
          {sleepCount > 0 && <span className="text-xs font-medium text-[var(--color-info)]">{sleepCount} sleep</span>}
          {otherCount > 0 && <span className="text-xs text-[var(--color-text-soft)]">+{otherCount} other</span>}
          {noPoopCount > 0 && <span className="text-xs text-[var(--color-muted)]">no poop</span>}
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn("h-4 w-4", isExpanded ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 pl-2 pt-2">
              {events.map((event) => {
                switch (event.kind) {
                  case "poop":
                    return (
                      <SwipeableItem key={`poop-${event.entry.id}`} onDelete={() => onDeletePoop(event.entry.id)}>
                        <PoopItem log={event.entry} onTap={() => onEditPoop(event.entry)} />
                      </SwipeableItem>
                    );
                  case "meal":
                    return (
                      <SwipeableItem key={`meal-${event.entry.id}`} onDelete={() => onDeleteMeal(event.entry.id)}>
                        <MealItem meal={event.entry} unitSystem={unitSystem} onTap={() => onEditMeal(event.entry)} />
                      </SwipeableItem>
                    );
                  case "sleep":
                    return (
                      <SwipeableItem key={`sleep-${event.entry.id}`} onDelete={() => onDeleteSleep(event.entry.id)}>
                        <SleepItem entry={event.entry} onTap={() => onEditSleep(event.entry)} />
                      </SwipeableItem>
                    );
                  case "symptom":
                    return <SymptomItem key={`symptom-${event.entry.id}`} entry={event.entry} />;
                  case "growth":
                    return <GrowthItem key={`growth-${event.entry.id}`} entry={event.entry} unitSystem={unitSystem} />;
                  case "milestone":
                    return <MilestoneItem key={`milestone-${event.entry.id}`} entry={event.entry} />;
                  case "episode":
                    return <EpisodeItem key={`episode-${event.entry.id}`} entry={event.entry} />;
                  case "episode_event":
                    return <EpisodeEventItem key={`episode-event-${event.entry.id}`} entry={event.entry} />;
                }
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function History() {
  const { activeChild } = useChildContext();
  const { unitSystem } = useUnits();
  const { logs: poopLogs, isLoading: poopLoading, refresh: refreshPoop } = usePoopLogs(activeChild?.id ?? null, 100);
  const { logs: feedingLogs, isLoading: feedingLoading, refresh: refreshFeeding } = useFeedingLogs(activeChild?.id ?? null, 100);
  const { logs: sleepLogs, isLoading: sleepLoading, refresh: refreshSleep } = useSleepLogs(activeChild?.id ?? null, 100);
  const { logs: symptomLogs, isLoading: symptomLoading } = useSymptoms(activeChild?.id ?? null);
  const { logs: growthLogs, isLoading: growthLoading } = useGrowthLogs(activeChild?.id ?? null);
  const { logs: milestoneLogs, isLoading: milestoneLoading } = useMilestoneLogs(activeChild?.id ?? null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeEvents, setEpisodeEvents] = useState<EpisodeEvent[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!activeChild) {
      setEpisodes([]);
      setEpisodeEvents([]);
      setExtraLoading(false);
      return;
    }

    setExtraLoading(true);
    Promise.all([
      db.getEpisodes(activeChild.id, 100),
      db.getEpisodeEventsByChild(activeChild.id, 100),
    ])
      .then(([nextEpisodes, nextEvents]) => {
        if (requestId !== requestIdRef.current) return;
        setEpisodes(nextEpisodes);
        setEpisodeEvents(nextEvents);
        setExtraLoading(false);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setEpisodes([]);
        setEpisodeEvents([]);
        setExtraLoading(false);
      });
  }, [activeChild]);

  const isLoading = poopLoading || feedingLoading || sleepLoading || symptomLoading || growthLoading || milestoneLoading || extraLoading;

  const grouped = useMemo(() => groupByDay({
    poopLogs,
    feedingLogs,
    sleepLogs,
    symptomLogs,
    growthLogs,
    milestoneLogs,
    episodes,
    episodeEvents,
  }), [poopLogs, feedingLogs, sleepLogs, symptomLogs, growthLogs, milestoneLogs, episodes, episodeEvents]);

  const displayDays = useMemo(() => {
    if (!searchDate) return [...grouped.entries()];
    const filtered = grouped.get(searchDate);
    if (filtered) return [[searchDate, filtered]] as [string, TimelineEvent[]][];
    return [];
  }, [grouped, searchDate]);

  useEffect(() => {
    if (searchDate) setExpandedDay(searchDate);
  }, [searchDate]);

  if (!activeChild) return null;

  const hasAnyLogs = poopLogs.length > 0
    || feedingLogs.length > 0
    || sleepLogs.length > 0
    || symptomLogs.length > 0
    || growthLogs.length > 0
    || milestoneLogs.length > 0
    || episodes.length > 0
    || episodeEvents.length > 0;

  if (!isLoading && !hasAnyLogs) {
    return (
      <div className="px-4 py-8">
        <PageBackButton fallbackTo="/settings" />

        <div className="mt-4 flex flex-col items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-muted)" className="h-8 w-8">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-[var(--color-text)]">Your full care timeline will fill up here</p>
          <p className="mt-2 text-base text-[var(--color-muted)]">Poop, feeds, sleep, symptoms, growth, milestones, and episodes all appear here once they are logged.</p>
        </div>
      </div>
    );
  }

  const handleDeletePoop = async (id: string) => {
    const entry = poopLogs.find((log) => log.id === id);
    await db.deletePoopLog(entry ?? id);
    await refreshPoop();
  };

  const handleDeleteMeal = async (id: string) => {
    await db.deleteFeedingLog(id);
    await refreshFeeding();
  };

  const handleDeleteSleep = async (id: string) => {
    await db.deleteSleepLog(id);
    await refreshSleep();
  };

  const today = new Date().toISOString().split("T")[0];
  const allDates = [...grouped.keys()];
  const earliestDate = allDates.length > 0 ? allDates[allDates.length - 1] : today;

  return (
    <div className="my-5 px-4 py-5">
      <PageBackButton fallbackTo="/settings" />

      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Timeline</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              History
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
              One place for poop, feeds, sleep, symptoms, milestones, growth checks, and episode updates.
            </p>
          </div>
          <p className="text-xs text-[var(--color-muted)]">{grouped.size} day{grouped.size === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="mb-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DatePicker
              value={searchDate ?? today}
              onChange={(value) => setSearchDate(value)}
              max={today}
              min={earliestDate}
              label="Search by date"
              dismissOnDocumentClick
              overlayOffsetY={48}
            />
          </div>
          {searchDate && (
            <button
              onClick={() => { setSearchDate(null); setExpandedDay(null); }}
              className="h-11 flex-shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {displayDays.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">No entries for this date</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayDays.map(([date, events]) => (
            <DayCard
              key={date}
              date={date}
              events={events}
              isExpanded={expandedDay === date}
              onToggle={() => setExpandedDay(expandedDay === date ? null : date)}
              onDeletePoop={handleDeletePoop}
              onDeleteMeal={handleDeleteMeal}
              onDeleteSleep={handleDeleteSleep}
              onEditPoop={setEditingPoop}
              onEditMeal={setEditingMeal}
              onEditSleep={setEditingSleep}
              unitSystem={unitSystem}
            />
          ))}
        </div>
      )}

      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => setEditingPoop(null)}
          onSaved={() => { void refreshPoop(); void refreshFeeding(); }}
          onDeleted={() => { void refreshPoop(); void refreshFeeding(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => { void refreshPoop(); void refreshFeeding(); }}
          onDeleted={() => { void refreshPoop(); void refreshFeeding(); }}
        />
      )}
      {editingSleep && (
        <EditSleepSheet
          key={editingSleep.id}
          entry={editingSleep}
          open={!!editingSleep}
          onClose={() => setEditingSleep(null)}
          onSaved={() => { void refreshSleep(); }}
          onDeleted={() => { void refreshSleep(); }}
        />
      )}
    </div>
  );
}
