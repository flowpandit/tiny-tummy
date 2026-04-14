import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getHistoryRange,
  getVisiblePoopLogs,
  groupTimelineByDay,
  hasHistoryEntries,
  type TimelineEvent,
} from "../lib/history-timeline";
import { useDbClient } from "../contexts/DatabaseContext";
import type {
  Child,
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

type HistoryPageData = {
  diaperLogs: DiaperEntry[];
  poopLogs: PoopEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  symptomLogs: SymptomEntry[];
  growthLogs: GrowthEntry[];
  milestoneLogs: MilestoneEntry[];
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
};

function getEmptyHistoryPageData(): HistoryPageData {
  return {
    diaperLogs: [],
    poopLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    symptomLogs: [],
    growthLogs: [],
    milestoneLogs: [],
    episodes: [],
    episodeEvents: [],
  };
}

export function useHistoryPageState(
  activeChild: Child | null,
  today: string,
  quickRangeDays: 7 | 14 | 30,
  searchDate: string | null,
) {
  const db = useDbClient();
  const [data, setData] = useState<HistoryPageData>(getEmptyHistoryPageData);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refreshHistory = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!activeChild) {
      setData(getEmptyHistoryPageData());
      setIsLoading(false);
      return;
    }

    const { rangeStart, rangeEnd } = getHistoryRange(today, quickRangeDays, searchDate);

    setIsLoading(true);

    try {
      const [
        diaperLogs,
        poopLogs,
        feedingLogs,
        sleepLogs,
        symptomLogs,
        growthLogs,
        milestoneLogs,
        episodes,
        episodeEvents,
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

      setData({
        diaperLogs,
        poopLogs,
        feedingLogs,
        sleepLogs,
        symptomLogs,
        growthLogs,
        milestoneLogs,
        episodes,
        episodeEvents,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      setData(getEmptyHistoryPageData());
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [activeChild, quickRangeDays, searchDate, today]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const visiblePoopLogs = useMemo(
    () => getVisiblePoopLogs(data.diaperLogs, data.poopLogs),
    [data.diaperLogs, data.poopLogs],
  );

  const grouped = useMemo<Map<string, TimelineEvent[]>>(
    () => groupTimelineByDay({
      diaperLogs: data.diaperLogs,
      poopLogs: visiblePoopLogs,
      feedingLogs: data.feedingLogs,
      sleepLogs: data.sleepLogs,
      symptomLogs: data.symptomLogs,
      growthLogs: data.growthLogs,
      milestoneLogs: data.milestoneLogs,
      episodes: data.episodes,
      episodeEvents: data.episodeEvents,
    }),
    [data, visiblePoopLogs],
  );

  const hasAnyLogs = useMemo(
    () => hasHistoryEntries(data),
    [data],
  );

  const deletePoop = useCallback(async (id: string) => {
    const entry = data.poopLogs.find((log) => log.id === id);
    await db.deletePoopLog(entry ?? id);
    await refreshHistory();
  }, [data.poopLogs, refreshHistory]);

  const deleteMeal = useCallback(async (id: string) => {
    await db.deleteFeedingLog(id);
    await refreshHistory();
  }, [refreshHistory]);

  const deleteSleep = useCallback(async (id: string) => {
    await db.deleteSleepLog(id);
    await refreshHistory();
  }, [refreshHistory]);

  const deleteDiaper = useCallback(async (entry: DiaperEntry) => {
    await db.deleteDiaperLog(entry);
    await refreshHistory();
  }, [refreshHistory]);

  return {
    ...data,
    grouped,
    hasAnyLogs,
    isLoading,
    refreshHistory,
    deletePoop,
    deleteMeal,
    deleteSleep,
    deleteDiaper,
  };
}
