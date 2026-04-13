import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useChildContext } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { formatLocalDateKey } from "../lib/utils";
import { DatePicker } from "../components/ui/date-picker";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { cn } from "../lib/cn";
import { HistoryTimeline } from "../components/history/HistoryTimeline";
import { addDaysToDateKey, getVisiblePoopLogs, groupTimelineByDay, type TimelineEvent } from "../lib/history-timeline";
import * as db from "../lib/db";
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
} from "../lib/types";

export function History() {
  const RANGE_OPTIONS = [
    { label: "7 days", value: 7 },
    { label: "14 days", value: 14 },
    { label: "30 days", value: 30 },
  ] as const;
  const { activeChild } = useChildContext();
  const { unitSystem } = useUnits();
  const [diaperLogs, setDiaperLogs] = useState<DiaperEntry[]>([]);
  const [poopLogs, setPoopLogs] = useState<PoopEntry[]>([]);
  const [feedingLogs, setFeedingLogs] = useState<FeedingEntry[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepEntry[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomEntry[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthEntry[]>([]);
  const [milestoneLogs, setMilestoneLogs] = useState<MilestoneEntry[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodeEvents, setEpisodeEvents] = useState<EpisodeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [quickRangeDays, setQuickRangeDays] = useState<7 | 14 | 30>(7);
  const [editingDiaper, setEditingDiaper] = useState<DiaperEntry | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const today = formatLocalDateKey(new Date());

  const refreshHistory = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!activeChild) {
      setDiaperLogs([]);
      setPoopLogs([]);
      setFeedingLogs([]);
      setSleepLogs([]);
      setSymptomLogs([]);
      setGrowthLogs([]);
      setMilestoneLogs([]);
      setEpisodes([]);
      setEpisodeEvents([]);
      setIsLoading(false);
      return;
    }

    const rangeEnd = searchDate ?? today;
    const rangeStart = searchDate ?? addDaysToDateKey(today, -(quickRangeDays - 1));

    setIsLoading(true);

    try {
      const [
        nextDiapers,
        nextPoops,
        nextMeals,
        nextSleep,
        nextSymptoms,
        nextGrowth,
        nextMilestones,
        nextEpisodes,
        nextEpisodeEvents,
      ] = await Promise.all([
        db.getDiaperLogsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getPoopLogsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getFeedingLogsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getSleepLogsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getSymptomsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getGrowthLogsForRange(activeChild.id, rangeStart, rangeEnd),
        db.getMilestonesForRange(activeChild.id, rangeStart, rangeEnd),
        db.getEpisodesForRange(activeChild.id, rangeStart, rangeEnd),
        db.getEpisodeEventsForRange(activeChild.id, rangeStart, rangeEnd),
      ]);

      if (requestId !== requestIdRef.current) return;

      setDiaperLogs(nextDiapers);
      setPoopLogs(nextPoops);
      setFeedingLogs(nextMeals);
      setSleepLogs(nextSleep);
      setSymptomLogs(nextSymptoms);
      setGrowthLogs(nextGrowth);
      setMilestoneLogs(nextMilestones);
      setEpisodes(nextEpisodes);
      setEpisodeEvents(nextEpisodeEvents);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setDiaperLogs([]);
      setPoopLogs([]);
      setFeedingLogs([]);
      setSleepLogs([]);
      setSymptomLogs([]);
      setGrowthLogs([]);
      setMilestoneLogs([]);
      setEpisodes([]);
      setEpisodeEvents([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [activeChild, quickRangeDays, searchDate, today]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const visiblePoopLogs = useMemo(() => {
    return getVisiblePoopLogs(diaperLogs, poopLogs);
  }, [diaperLogs, poopLogs]);

  const grouped = useMemo(() => groupTimelineByDay({
    diaperLogs,
    poopLogs: visiblePoopLogs,
    feedingLogs,
    sleepLogs,
    symptomLogs,
    growthLogs,
    milestoneLogs,
    episodes,
    episodeEvents,
  }), [diaperLogs, visiblePoopLogs, feedingLogs, sleepLogs, symptomLogs, growthLogs, milestoneLogs, episodes, episodeEvents]);

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

  const hasAnyLogs = diaperLogs.length > 0
    || poopLogs.length > 0
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
    await refreshHistory();
  };

  const handleDeleteMeal = async (id: string) => {
    await db.deleteFeedingLog(id);
    await refreshHistory();
  };

  const handleDeleteSleep = async (id: string) => {
    await db.deleteSleepLog(id);
    await refreshHistory();
  };

  const handleDeleteDiaper = async (entry: DiaperEntry) => {
    await db.deleteDiaperLog(entry);
    await refreshHistory();
  };

  const allDates = [...grouped.keys()];
  const earliestDate = allDates.length > 0 ? allDates[allDates.length - 1] : today;

  return (
    <div className="mb-5 px-4 pb-5">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-text)]">
            History
          </h2>
          <div className="flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-1">
            {RANGE_OPTIONS.map((option) => {
              const active = !searchDate && quickRangeDays === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSearchDate(null);
                    setExpandedDay(null);
                    setQuickRangeDays(option.value);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200",
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
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
        <HistoryTimeline
          displayDays={displayDays}
          expandedDay={expandedDay}
          onDeleteDiaper={handleDeleteDiaper}
          onDeletePoop={handleDeletePoop}
          onDeleteMeal={handleDeleteMeal}
          onDeleteSleep={handleDeleteSleep}
          onEditDiaper={setEditingDiaper}
          onEditPoop={setEditingPoop}
          onEditMeal={setEditingMeal}
          onEditSleep={setEditingSleep}
          onSetExpandedDay={setExpandedDay}
          unitSystem={unitSystem}
        />
      )}

      {editingPoop && (
        <EditPoopSheet
          key={editingPoop.id}
          entry={editingPoop}
          open={!!editingPoop}
          onClose={() => setEditingPoop(null)}
          onSaved={() => { void refreshHistory(); }}
          onDeleted={() => { void refreshHistory(); }}
        />
      )}
      {editingDiaper && (
        <EditDiaperSheet
          key={editingDiaper.id}
          entry={editingDiaper}
          open={!!editingDiaper}
          onClose={() => setEditingDiaper(null)}
          onSaved={() => { setEditingDiaper(null); void refreshHistory(); }}
          onDeleted={() => { setEditingDiaper(null); void refreshHistory(); }}
        />
      )}
      {editingMeal && (
        <EditMealSheet
          key={editingMeal.id}
          entry={editingMeal}
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onSaved={() => { void refreshHistory(); }}
          onDeleted={() => { void refreshHistory(); }}
        />
      )}
      {editingSleep && (
        <EditSleepSheet
          key={editingSleep.id}
          entry={editingSleep}
          open={!!editingSleep}
          onClose={() => setEditingSleep(null)}
          onSaved={() => { void refreshHistory(); }}
          onDeleted={() => { void refreshHistory(); }}
        />
      )}
    </div>
  );
}
