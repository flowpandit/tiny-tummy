import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getHistoryRange,
  getVisiblePoopLogs,
  groupTimelineByDay,
  hasHistoryEntries,
  type TimelineEvent,
} from "../lib/history-timeline";
import { useRepositories } from "../contexts/DatabaseContext";
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
  caregiverDisplayNames: Record<string, string>;
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
    caregiverDisplayNames: {},
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
  const { care, caregivers, elimination, feeding, growth, milestones, sleep } = useRepositories();
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
        childCaregivers,
      ] = await Promise.all([
        elimination.listDiaperLogsInRange(activeChild.id, rangeStart, rangeEnd),
        elimination.listPoopLogsInRange(activeChild.id, rangeStart, rangeEnd),
        feeding.listFeedingLogsInRange(activeChild.id, rangeStart, rangeEnd),
        sleep.listSleepLogsInRange(activeChild.id, rangeStart, rangeEnd),
        care.listSymptomsInRange(activeChild.id, rangeStart, rangeEnd),
        growth.listGrowthLogsInRange(activeChild.id, rangeStart, rangeEnd),
        milestones.listMilestonesInRange(activeChild.id, rangeStart, rangeEnd),
        care.listEpisodesInRange(activeChild.id, rangeStart, rangeEnd),
        care.listEpisodeEventsInRange(activeChild.id, rangeStart, rangeEnd),
        caregivers.listCaregiversForChild(activeChild.id),
      ]);

      if (requestId !== requestIdRef.current) return;

      setData({
        caregiverDisplayNames: Object.fromEntries(
          childCaregivers.map((caregiver) => [caregiver.id, caregiver.display_name]),
        ),
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
  }, [activeChild, care, caregivers, elimination, feeding, growth, milestones, quickRangeDays, searchDate, sleep, today]);

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
    await elimination.deletePoop(entry ?? id);
    await refreshHistory();
  }, [data.poopLogs, elimination, refreshHistory]);

  const deleteMeal = useCallback(async (id: string) => {
    await feeding.deleteFeed(id);
    await refreshHistory();
  }, [feeding, refreshHistory]);

  const deleteSleep = useCallback(async (id: string) => {
    await sleep.deleteSleep(id);
    await refreshHistory();
  }, [refreshHistory, sleep]);

  const deleteDiaper = useCallback(async (entry: DiaperEntry) => {
    await elimination.deleteDiaper(entry);
    await refreshHistory();
  }, [elimination, refreshHistory]);

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
