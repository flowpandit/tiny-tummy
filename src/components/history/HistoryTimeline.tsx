import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { BITSS_TYPES, STOOL_COLORS } from "../../lib/constants";
import { getDiaperTypeLabel, getUrineColorLabel } from "../../lib/diaper";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../../lib/episode-constants";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel, getFeedingEntrySecondaryText } from "../../lib/feeding";
import { getMilestoneTypeLabel } from "../../lib/milestone-constants";
import { loadPhoto } from "../../lib/photos";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../../lib/symptom-constants";
import { cn } from "../../lib/cn";
import {
  formatHistoryDateTime,
  formatHistoryDayHeader,
  formatHistorySleepDuration,
  formatHistoryTime,
  type TimelineEvent,
} from "../../lib/history-timeline";
import { formatGrowthSummary as formatGrowthSummaryWithUnits, formatTemperatureValue } from "../../lib/units";
import { Badge } from "../ui/badge";
import { MealIcon, NoPoopIcon, PoopIcon } from "../ui/icons";
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
    "flex items-start gap-3 px-3.5 py-2 transition-colors",
    onTap ? "cursor-pointer hover:bg-[var(--color-bg-elevated)]/42" : "",
  );

  return (
    <div onClick={onTap} className={className}>
      {icon}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <span className="pt-0.5 text-[0.84rem] font-medium leading-none text-[var(--color-text-secondary)]">{time}</span>
        </div>
        <p className="mt-1 text-[0.88rem] font-medium leading-[1.08] text-[var(--color-text)]">{title}</p>
        {subtitle && <p className="mt-0.5 text-[0.8rem] leading-[1.08] text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      {tail && <div className="flex-shrink-0">{tail}</div>}
    </div>
  );
}

function getDiaperHistoryIcon(diaperType: DiaperEntry["diaper_type"]): string {
  if (diaperType === "wet") return diaperWetIcon;
  if (diaperType === "mixed") return diaperMixedIcon;
  return diaperDirtyIcon;
}

function DiaperItem({ entry, onTap }: { entry: DiaperEntry; onTap: () => void }) {
  const diaperTone = entry.diaper_type === "wet"
    ? { bg: "color-mix(in srgb, var(--color-info) 18%, transparent)", fg: "var(--color-info)" }
    : entry.diaper_type === "mixed"
      ? { bg: "color-mix(in srgb, var(--color-primary) 18%, transparent)", fg: "var(--color-primary)" }
      : { bg: "color-mix(in srgb, var(--color-cta) 18%, transparent)", fg: "var(--color-cta)" };

  const stoolLabel = entry.stool_type ? BITSS_TYPES.find((item) => item.type === entry.stool_type)?.label : null;
  const details = [
    entry.urine_color ? getUrineColorLabel(entry.urine_color) : null,
    entry.stool_type ? `Type ${entry.stool_type}${stoolLabel ? `, ${stoolLabel}` : ""}` : null,
    entry.notes,
  ].filter(Boolean).join(" • ");

  return (
    <BaseItem
      onTap={onTap}
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: diaperTone.bg }}>
          <img src={getDiaperHistoryIcon(entry.diaper_type)} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
        </span>
      )}
      time={formatHistoryTime(entry.logged_at)}
      title={getDiaperTypeLabel(entry.diaper_type)}
      subtitle={details || null}
      tail={(
        <Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" style={{ backgroundColor: diaperTone.bg, color: diaperTone.fg }}>
          {entry.diaper_type}
        </Badge>
      )}
    />
  );
}

function PoopItem({ log, onTap }: { log: PoopEntry; onTap: () => void }) {
  const typeInfo = log.stool_type ? BITSS_TYPES.find((item) => item.type === log.stool_type) : null;
  const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
  const poopTone = colorInfo?.isRedFlag
    ? { bg: "var(--color-alert-bg)", fg: "var(--color-alert)" }
    : { bg: "color-mix(in srgb, var(--color-cta) 18%, transparent)", fg: "var(--color-cta)" };

  return (
    <BaseItem
      onTap={onTap}
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: poopTone.bg }}>
          {log.is_no_poop
            ? <NoPoopIcon className="h-4 w-4 flex-shrink-0" color={poopTone.fg} />
            : <PoopIcon className="h-4 w-4 flex-shrink-0" color={colorInfo?.hex ?? poopTone.fg} />}
        </span>
      )}
      time={formatHistoryTime(log.logged_at)}
      title={log.is_no_poop ? "No poop day" : typeInfo ? `Type ${typeInfo.type}: ${typeInfo.label}` : "Poop logged"}
      subtitle={log.notes}
      tail={(
        <div className="flex items-center gap-1">
          {log.photo_path && <PhotoThumbnail photoPath={log.photo_path} />}
          {log.size && (
            <Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem] capitalize" style={{ backgroundColor: poopTone.bg, color: poopTone.fg }}>
              {log.size}
            </Badge>
          )}
          {colorInfo?.isRedFlag && <Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" variant="alert">flag</Badge>}
        </div>
      )}
    />
  );
}

function MealItem({ meal, unitSystem, onTap }: { meal: FeedingEntry; unitSystem: "metric" | "imperial"; onTap: () => void }) {
  const detailText = getFeedingEntryDetailParts(meal, unitSystem).join(" · ");
  const secondaryText = [detailText, getFeedingEntrySecondaryText(meal)].filter(Boolean).join(" • ");
  const mealTone = { bg: "color-mix(in srgb, var(--color-cta) 16%, transparent)", fg: "var(--color-cta)" };

  return (
    <BaseItem
      onTap={onTap}
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: mealTone.bg }}>
          <MealIcon className="h-4 w-4 flex-shrink-0" color={mealTone.fg} />
        </span>
      )}
      time={formatHistoryTime(meal.logged_at)}
      title={getFeedingEntryPrimaryLabel(meal)}
      subtitle={secondaryText}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" style={{ backgroundColor: mealTone.bg, color: mealTone.fg }}>feed</Badge>}
    />
  );
}

function SleepItem({ entry, onTap }: { entry: SleepEntry; onTap: () => void }) {
  const sleepTone = { bg: "color-mix(in srgb, var(--color-info) 18%, transparent)", fg: "var(--color-info)" };

  return (
    <BaseItem
      onTap={onTap}
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: sleepTone.bg }}>
          <SleepGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.started_at)}
      title={entry.sleep_type === "night" ? "Night sleep" : "Nap"}
      subtitle={`${formatHistorySleepDuration(entry)} • ${formatHistoryTime(entry.started_at)} - ${formatHistoryTime(entry.ended_at)}${entry.notes ? ` • ${entry.notes}` : ""}`}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" style={{ backgroundColor: sleepTone.bg, color: sleepTone.fg }}>{entry.sleep_type}</Badge>}
    />
  );
}

function SymptomItem({ entry, temperatureUnit }: { entry: SymptomEntry; temperatureUnit: TemperatureUnit }) {
  const symptomTone = { bg: "color-mix(in srgb, var(--color-caution) 18%, transparent)", fg: "var(--color-caution)" };
  const temperatureLabel = entry.temperature_c !== null
    ? formatTemperatureValue(entry.temperature_c, temperatureUnit)
    : null;

  return (
    <BaseItem
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: symptomTone.bg }}>
          <SymptomGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.logged_at)}
      title={getSymptomTypeLabel(entry.symptom_type)}
      subtitle={[temperatureLabel, entry.notes, entry.episode_id ? "linked to episode" : null].filter(Boolean).join(" • ")}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" variant={getSymptomSeverityBadgeVariant(entry.severity)}>{getSymptomSeverityLabel(entry.severity)}</Badge>}
    />
  );
}

function GrowthItem({ entry, unitSystem }: { entry: GrowthEntry; unitSystem: "metric" | "imperial" }) {
  const growthTone = { bg: "color-mix(in srgb, var(--color-healthy) 18%, transparent)", fg: "var(--color-healthy)" };

  return (
    <BaseItem
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: growthTone.bg }}>
          <GrowthGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.measured_at)}
      title="Growth check"
      subtitle={[formatGrowthSummaryWithUnits(entry, unitSystem), entry.notes].filter(Boolean).join(" • ")}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" style={{ backgroundColor: growthTone.bg, color: growthTone.fg }}>growth</Badge>}
    />
  );
}

function MilestoneItem({ entry }: { entry: MilestoneEntry }) {
  const milestoneTone = { bg: "color-mix(in srgb, #9f7aea 18%, transparent)", fg: "#8b67d7" };

  return (
    <BaseItem
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: milestoneTone.bg }}>
          <MilestoneGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.logged_at)}
      title={getMilestoneTypeLabel(entry.milestone_type)}
      subtitle={entry.notes}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" style={{ backgroundColor: milestoneTone.bg, color: milestoneTone.fg }}>milestone</Badge>}
    />
  );
}

function EpisodeItem({ entry }: { entry: Episode }) {
  const statusText = entry.status === "resolved"
    ? `Resolved ${entry.ended_at ? formatHistoryDateTime(entry.ended_at) : ""}`.trim()
    : "Active episode";

  return (
    <BaseItem
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-cta) 16%, transparent)" }}>
          <EpisodeGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.started_at)}
      title={`${getEpisodeTypeLabel(entry.episode_type)} episode`}
      subtitle={[statusText, entry.summary ?? entry.outcome].filter(Boolean).join(" • ")}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" variant={entry.status === "resolved" ? "healthy" : "caution"}>{entry.status}</Badge>}
    />
  );
}

function EpisodeEventItem({ entry }: { entry: EpisodeEvent }) {
  const eventTone = { bg: "color-mix(in srgb, var(--color-primary) 16%, transparent)", fg: "var(--color-primary)" };

  return (
    <BaseItem
      icon={(
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: eventTone.bg }}>
          <EpisodeGlyph />
        </span>
      )}
      time={formatHistoryTime(entry.logged_at)}
      title={entry.title}
      subtitle={[getEpisodeEventTypeLabel(entry.event_type), entry.notes].filter(Boolean).join(" • ")}
      tail={<Badge className="min-h-0 px-2.5 py-[0.33rem] text-[0.74rem]" variant="default">{getEpisodeEventTypeLabel(entry.event_type).toLowerCase()}</Badge>}
    />
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
  unitSystem: "metric" | "imperial";
  temperatureUnit: TemperatureUnit;
}) {
  const diaperCount = events.filter((event) => event.kind === "diaper").length;
  const poopCount = events.filter((event) => event.kind === "poop" && event.entry.is_no_poop === 0).length;
  const feedCount = events.filter((event) => event.kind === "meal").length;
  const sleepCount = events.filter((event) => event.kind === "sleep").length;
  const otherCount = events.filter((event) => !["diaper", "poop", "meal", "sleep"].includes(event.kind)).length;
  const noPoopCount = events.filter((event) => event.kind === "poop" && event.entry.is_no_poop === 1).length;
  const summaryClassName = "text-[0.92rem] font-medium";

  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors",
          isExpanded ? "bg-[var(--color-surface-strong)]" : "hover:bg-[var(--color-surface-strong)]/72",
        )}
        aria-expanded={isExpanded}
      >
        <div className="min-w-0 flex items-center gap-3">
          <span className="text-[1.22rem] font-semibold leading-none text-[var(--color-text)]">{formatHistoryDayHeader(date)}</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="max-w-[11.5rem] pt-0.5 text-right leading-tight">
            <div className="flex flex-wrap justify-end gap-x-1.5 gap-y-0.5">
              {diaperCount > 0 && <span className={cn(summaryClassName, "text-[var(--color-info)]")}>{diaperCount} diaper{diaperCount === 1 ? "" : "s"}</span>}
              {poopCount > 0 && <span className={cn(summaryClassName, "text-[var(--color-cta)]")}>{poopCount} poop{poopCount === 1 ? "" : "s"}</span>}
              {feedCount > 0 && <span className={cn(summaryClassName, "text-[var(--color-primary)]")}>{feedCount} feed{feedCount === 1 ? "" : "s"}</span>}
              {sleepCount > 0 && <span className={cn(summaryClassName, "text-[var(--color-info)]")}>{sleepCount} sleep{sleepCount === 1 ? "" : "s"}</span>}
            </div>
            {otherCount > 0 && <div className="mt-0.5 text-[0.88rem] text-[var(--color-text-soft)]">+{otherCount} other</div>}
            {noPoopCount > 0 && <div className="mt-0.5 text-[0.8rem] text-[var(--color-muted)]">no poop</div>}
          </div>
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-soft)]"
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
            <div className="bg-[var(--color-surface)] px-3 pb-2">
              {events.map((event) => {
                switch (event.kind) {
                  case "diaper":
                    return <div key={`diaper-wrap-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><SwipeableItem onDelete={() => onDeleteDiaper(event.entry)}><DiaperItem entry={event.entry} onTap={() => onEditDiaper(event.entry)} /></SwipeableItem></div>;
                  case "poop":
                    return <div key={`poop-wrap-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><SwipeableItem onDelete={() => onDeletePoop(event.entry.id)}><PoopItem log={event.entry} onTap={() => onEditPoop(event.entry)} /></SwipeableItem></div>;
                  case "meal":
                    return <div key={`meal-wrap-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><SwipeableItem onDelete={() => onDeleteMeal(event.entry.id)}><MealItem meal={event.entry} unitSystem={unitSystem} onTap={() => onEditMeal(event.entry)} /></SwipeableItem></div>;
                  case "sleep":
                    return <div key={`sleep-wrap-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><SwipeableItem onDelete={() => onDeleteSleep(event.entry.id)}><SleepItem entry={event.entry} onTap={() => onEditSleep(event.entry)} /></SwipeableItem></div>;
                  case "symptom":
                    return <div key={`symptom-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><SymptomItem entry={event.entry} temperatureUnit={temperatureUnit} /></div>;
                  case "growth":
                    return <div key={`growth-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><GrowthItem entry={event.entry} unitSystem={unitSystem} /></div>;
                  case "milestone":
                    return <div key={`milestone-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><MilestoneItem entry={event.entry} /></div>;
                  case "episode":
                    return <div key={`episode-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><EpisodeItem entry={event.entry} /></div>;
                  case "episode_event":
                    return <div key={`episode-event-${event.entry.id}`} className="border-t border-[var(--color-border)]/45 first:border-t-0"><EpisodeEventItem entry={event.entry} /></div>;
                }
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  onSetExpandedDay: (date: string | null) => void;
  unitSystem: "metric" | "imperial";
  temperatureUnit: TemperatureUnit;
}) {
  return (
    <div className="flex flex-col gap-2">
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
          unitSystem={unitSystem}
          temperatureUnit={temperatureUnit}
        />
      ))}
    </div>
  );
}
