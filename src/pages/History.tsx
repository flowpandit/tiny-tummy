import { useState, useEffect, useMemo } from "react";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useHistoryPageState } from "../hooks/useHistoryPageState";
import { formatLocalDateKey } from "../lib/utils";
import { DatePicker } from "../components/ui/date-picker";
import { EditPoopSheet } from "../components/logging/EditPoopSheet";
import { EditMealSheet } from "../components/logging/EditMealSheet";
import { EditDiaperSheet } from "../components/logging/EditDiaperSheet";
import { EditSleepSheet } from "../components/sleep/EditSleepSheet";
import { HistoryTimeline, HistoryTodayOverview } from "../components/history/HistoryTimeline";
import { cn } from "../lib/cn";
import {
  formatHistoryDayHeader,
  getEarliestHistoryDate,
  getHistoryDisplayDays,
  HISTORY_RANGE_OPTIONS,
  summarizeTimelineEvents,
} from "../lib/history-timeline";
import type {
  DiaperEntry,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
} from "../lib/types";

function HistoryRangeSelector({
  value,
  onChange,
}: {
  value: 7 | 14 | 30;
  onChange: (value: 7 | 14 | 30) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/76 p-1 shadow-[var(--shadow-inner)]">
      {HISTORY_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-w-11 rounded-full px-3 py-1.5 text-[0.78rem] font-semibold leading-none transition-colors duration-150",
            value === option.value
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_6px_14px_rgba(95,74,60,0.16)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function History() {
  const activeChild = useActiveChild();
  const { unitSystem, temperatureUnit } = useUnits();
  const today = formatLocalDateKey(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(today);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [quickRangeDays, setQuickRangeDays] = useState<7 | 14 | 30>(7);
  const [editingDiaper, setEditingDiaper] = useState<DiaperEntry | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const {
    grouped,
    hasAnyLogs,
    isLoading,
    refreshHistory,
    deletePoop,
    deleteMeal,
    deleteSleep,
    deleteDiaper,
  } = useHistoryPageState(activeChild, today, quickRangeDays, searchDate);

  const displayDays = useMemo(() => getHistoryDisplayDays(grouped, searchDate), [grouped, searchDate]);
  const overviewDate = searchDate ?? today;
  const overviewSummary = useMemo(
    () => summarizeTimelineEvents(grouped.get(overviewDate) ?? []),
    [grouped, overviewDate],
  );
  const overviewTitle = searchDate && searchDate !== today
    ? `${formatHistoryDayHeader(searchDate)} overview`
    : "Today overview";

  useEffect(() => {
    if (searchDate) setExpandedDay(searchDate);
  }, [searchDate]);

  if (!activeChild) return null;

  if (!isLoading && !hasAnyLogs) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-4 pb-4 pt-2 md:max-w-[820px] md:px-10 md:pt-4">
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-12 text-center shadow-[0_14px_34px_rgba(172,139,113,0.08)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-strong)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-muted)" className="h-6 w-6">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[var(--color-text)]">Your care timeline will fill up here</p>
          <p className="mt-2 max-w-[32ch] text-sm leading-6 text-[var(--color-muted)]">Poop, feeds, sleep, symptoms, growth, milestones, and episodes appear here once they are logged.</p>
        </div>
      </div>
    );
  }

  const earliestDate = getEarliestHistoryDate(grouped, today);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-4 pb-4 pt-2 md:max-w-[820px] md:px-10 md:pt-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.9rem] font-semibold leading-none tracking-[-0.035em] text-[var(--color-text)] md:text-[2.2rem]">
          History
        </h1>
        <HistoryRangeSelector
          value={quickRangeDays}
          onChange={(value) => {
            setSearchDate(null);
            setExpandedDay(today);
            setQuickRangeDays(value);
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <DatePicker
            value={searchDate ?? today}
            onChange={(value) => {
              setSearchDate(value);
              setExpandedDay(value);
            }}
            max={today}
            min={earliestDate}
            label="Select history date"
            dismissOnDocumentClick
            overlayOffsetY={36}
          />
        </div>
        {searchDate && (
          <button
            type="button"
            onClick={() => { setSearchDate(null); setExpandedDay(today); }}
            className="h-11 flex-shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[0.82rem] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)]"
          >
            Clear
          </button>
        )}
      </div>

      <HistoryTodayOverview summary={overviewSummary} title={overviewTitle} />

      {displayDays.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">No entries for this date</p>
        </div>
      ) : (
        <HistoryTimeline
          displayDays={displayDays}
          expandedDay={expandedDay}
          onDeleteDiaper={deleteDiaper}
          onDeletePoop={deletePoop}
          onDeleteMeal={deleteMeal}
          onDeleteSleep={deleteSleep}
          onEditDiaper={setEditingDiaper}
          onEditPoop={setEditingPoop}
          onEditMeal={setEditingMeal}
          onEditSleep={setEditingSleep}
          onSetExpandedDay={setExpandedDay}
          unitSystem={unitSystem}
          temperatureUnit={temperatureUnit}
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
