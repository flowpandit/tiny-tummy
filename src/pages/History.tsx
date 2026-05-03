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
import { HistoryTimeline } from "../components/history/HistoryTimeline";
import { CompactPageHeader } from "../components/ui/page-layout";
import {
  getEarliestHistoryDate,
  getHistoryDisplayDays,
  HISTORY_RANGE_OPTIONS,
} from "../lib/history-timeline";
import type {
  DiaperEntry,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
} from "../lib/types";

export function History() {
  const activeChild = useActiveChild();
  const { unitSystem, temperatureUnit } = useUnits();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [quickRangeDays, setQuickRangeDays] = useState<7 | 14 | 30>(7);
  const [editingDiaper, setEditingDiaper] = useState<DiaperEntry | null>(null);
  const [editingPoop, setEditingPoop] = useState<PoopEntry | null>(null);
  const [editingMeal, setEditingMeal] = useState<FeedingEntry | null>(null);
  const [editingSleep, setEditingSleep] = useState<SleepEntry | null>(null);
  const today = formatLocalDateKey(new Date());
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

  useEffect(() => {
    if (searchDate) setExpandedDay(searchDate);
  }, [searchDate]);

  if (!activeChild) return null;

  if (!isLoading && !hasAnyLogs) {
    return (
      <div className="px-4 pb-8 pt-10 md:px-6 lg:px-8">
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

  const earliestDate = getEarliestHistoryDate(grouped, today);

  return (
    <div className="mb-5 px-4 pb-5 pt-10 md:px-6 lg:px-8">
      <div className="mb-4">
        <CompactPageHeader
          title="History"
          value={quickRangeDays}
          options={HISTORY_RANGE_OPTIONS}
          onChange={(value) => {
            setSearchDate(null);
            setExpandedDay(null);
            setQuickRangeDays(value);
          }}
        />
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
