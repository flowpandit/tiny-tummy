import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { usePoopLogs } from "../hooks/usePoopLogs";
import { useDietLogs } from "../hooks/useDietLogs";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { FOOD_TYPES } from "../lib/diet-constants";
import { Badge } from "../components/ui/badge";
import { PoopIcon, MealIcon, NoPoopIcon } from "../components/ui/icons";
import { DatePicker } from "../components/ui/date-picker";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { loadPhoto } from "../lib/photos";
import { cn } from "../lib/cn";
import * as db from "../lib/db";
import type { PoopEntry, DietEntry } from "../lib/types";

// --- Shared sub-components ---

function PhotoThumbnail({ photoPath }: { photoPath: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    loadPhoto(photoPath).then(setSrc).catch(() => setSrc(null));
    return () => { if (src) URL.revokeObjectURL(src); };
  }, [photoPath]);
  if (!src) return null;
  return <img src={src} alt="Log photo" className="w-10 h-10 rounded-[var(--radius-sm)] object-cover border border-[var(--color-border)]" />;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// --- Timeline event types ---

type TimelineEvent =
  | { kind: "poop"; entry: PoopEntry }
  | { kind: "meal"; entry: DietEntry };

function groupByDay(poopLogs: PoopEntry[], dietLogs: DietEntry[]): Map<string, TimelineEvent[]> {
  const all: TimelineEvent[] = [
    ...poopLogs.map((e) => ({ kind: "poop" as const, entry: e })),
    ...dietLogs.map((e) => ({ kind: "meal" as const, entry: e })),
  ];

  const grouped = new Map<string, TimelineEvent[]>();
  for (const item of all) {
    const day = item.entry.logged_at.split("T")[0];
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(item);
  }

  // Sort events within each day chronologically (earliest first)
  for (const events of grouped.values()) {
    events.sort((a, b) => new Date(a.entry.logged_at).getTime() - new Date(b.entry.logged_at).getTime());
  }

  // Sort days newest first
  return new Map([...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

// --- Swipeable item ---

function SwipeableItem({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60], [1, 0]);

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-md)]">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-[var(--color-alert)] flex items-center justify-end pr-5 rounded-[var(--radius-md)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
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

// --- Event renderers ---

function PoopItem({ log, onTap }: { log: PoopEntry; onTap: () => void }) {
  const typeInfo = log.stool_type ? BITSS_TYPES.find((b) => b.type === log.stool_type) : null;
  const colorInfo = log.color ? STOOL_COLORS.find((c) => c.value === log.color) : null;

  return (
    <div
      onClick={onTap}
      className="flex items-center gap-3 bg-[var(--color-surface)] px-3 py-2.5 border border-[var(--color-border)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
    >
      {log.is_no_poop
        ? <NoPoopIcon className="w-5 h-5 flex-shrink-0" />
        : <PoopIcon className="w-5 h-5 flex-shrink-0" color={colorInfo?.hex ?? "#8B6914"} />
      }
      <span className="text-xs text-[var(--color-muted)] w-14 flex-shrink-0">{formatTime(log.logged_at)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">
          {log.is_no_poop ? "No poop" : typeInfo ? `Type ${typeInfo.type}: ${typeInfo.label}` : "Poop logged"}
        </p>
        {log.notes && <p className="text-xs text-[var(--color-text-secondary)] truncate">{log.notes}</p>}
      </div>
      {log.photo_path && <PhotoThumbnail photoPath={log.photo_path} />}
      <div className="flex gap-1">
        {log.size && <Badge variant="default">{log.size}</Badge>}
        {colorInfo?.isRedFlag && <Badge variant="alert">flag</Badge>}
      </div>
    </div>
  );
}

function MealItem({ meal, onTap }: { meal: DietEntry; onTap: () => void }) {
  const foodLabel = FOOD_TYPES.find((f) => f.value === meal.food_type)?.label ?? meal.food_type;

  return (
    <div
      onClick={onTap}
      className="flex items-center gap-3 bg-[var(--color-surface)] px-3 py-2.5 border border-[var(--color-border)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
    >
      <MealIcon className="w-5 h-5 flex-shrink-0" color="var(--color-primary)" />
      <span className="text-xs text-[var(--color-muted)] w-14 flex-shrink-0">{formatTime(meal.logged_at)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">
          {meal.food_name ? `${foodLabel}: ${meal.food_name}` : foodLabel}
        </p>
        {meal.notes && <p className="text-xs text-[var(--color-text-secondary)] truncate">{meal.notes}</p>}
      </div>
      <Badge variant="info">meal</Badge>
    </div>
  );
}

// --- Day card ---

function DayCard({
  date,
  events,
  isExpanded,
  onToggle,
  onDeletePoop,
  onDeleteMeal,
  onEditPoop,
  onEditMeal,
}: {
  date: string;
  events: TimelineEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeletePoop: (id: string) => void;
  onDeleteMeal: (id: string) => void;
  onEditPoop: (entry: PoopEntry) => void;
  onEditMeal: (entry: DietEntry) => void;
}) {
  const poopCount = events.filter((e) => e.kind === "poop" && !e.entry.is_no_poop).length;
  const mealCount = events.filter((e) => e.kind === "meal").length;
  const noPoopCount = events.filter((e) => e.kind === "poop" && e.entry.is_no_poop).length;

  return (
    <div>
      {/* Day header — always visible */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] cursor-pointer transition-colors",
          isExpanded
            ? "bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20"
            : "bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-muted)]",
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-sm font-semibold",
            isExpanded ? "text-[var(--color-primary)]" : "text-[var(--color-text)]",
          )}>
            {formatDayHeader(date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {poopCount > 0 && (
            <span className="text-xs text-[var(--color-cta)] font-medium">
              {poopCount} poop{poopCount !== 1 ? "s" : ""}
            </span>
          )}
          {mealCount > 0 && (
            <span className="text-xs text-[var(--color-primary)] font-medium">
              {mealCount} meal{mealCount !== 1 ? "s" : ""}
            </span>
          )}
          {noPoopCount > 0 && (
            <span className="text-xs text-[var(--color-muted)]">no poop</span>
          )}
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn("w-4 h-4", isExpanded ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded events */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 pt-2 pl-2">
              {events.map((event) => {
                if (event.kind === "poop") {
                  return (
                    <SwipeableItem key={`p-${event.entry.id}`} onDelete={() => onDeletePoop(event.entry.id)}>
                      <PoopItem log={event.entry} onTap={() => onEditPoop(event.entry)} />
                    </SwipeableItem>
                  );
                }
                return (
                  <SwipeableItem key={`m-${event.entry.id}`} onDelete={() => onDeleteMeal(event.entry.id)}>
                    <MealItem meal={event.entry} onTap={() => onEditMeal(event.entry)} />
                  </SwipeableItem>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main History page ---

export function History() {
  const { activeChild } = useChildContext();
  const { logs: poopLogs, isLoading: poopLoading, refresh: refreshPoop } = usePoopLogs(activeChild?.id ?? null);
  const { logs: dietLogs, isLoading: dietLoading, refresh: refreshDiet } = useDietLogs(activeChild?.id ?? null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<DietEntry | null>(null);

  const isLoading = poopLoading || dietLoading;

  const grouped = useMemo(() => groupByDay(poopLogs, dietLogs), [poopLogs, dietLogs]);

  // Filter to single day if search is active
  const displayDays = useMemo(() => {
    if (!searchDate) return [...grouped.entries()];
    const filtered = grouped.get(searchDate);
    if (filtered) return [[searchDate, filtered]] as [string, TimelineEvent[]][];
    return [];
  }, [grouped, searchDate]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchDate) setExpandedDay(searchDate);
  }, [searchDate]);

  if (!activeChild) return null;

  if (!isLoading && poopLogs.length === 0 && dietLogs.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-muted)" className="w-8 h-8">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-[var(--color-text)] text-xl font-semibold">Your timeline will fill up here</p>
        <p className="mt-2 text-base text-[var(--color-muted)]">Log entries from the Home screen to see your history.</p>
        </div>
      </div>
    );
  }

  const handleDeletePoop = async (id: string) => {
    await db.deletePoopLog(id);
    refreshPoop();
  };

  const handleDeleteMeal = async (id: string) => {
    await db.deleteDietLog(id);
    refreshDiet();
  };

  const today = new Date().toISOString().split("T")[0];
  // Earliest date with any entry
  const allDates = [...grouped.keys()];
  const earliestDate = allDates.length > 0 ? allDates[allDates.length - 1] : today;

  return (
    <div className="px-4 py-5">
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Timeline</p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
              History
            </h2>
          </div>
          <p className="text-xs text-[var(--color-muted)]">{grouped.size} day{grouped.size !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Date search */}
      <div className="mb-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DatePicker
              value={searchDate ?? today}
              onChange={(d) => setSearchDate(d)}
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
              className="h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Day list */}
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
              onEditPoop={setEditingPoop}
              onEditMeal={setEditingMeal}
            />
          ))}
        </div>
      )}

      {/* Edit sheets */}
      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => setEditingPoop(null)}
          onSaved={() => { refreshPoop(); refreshDiet(); }}
          onDeleted={() => { refreshPoop(); refreshDiet(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => { refreshPoop(); refreshDiet(); }}
          onDeleted={() => { refreshPoop(); refreshDiet(); }}
        />
      )}
    </div>
  );
}
