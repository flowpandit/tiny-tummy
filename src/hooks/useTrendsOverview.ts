import { useMemo } from "react";
import { useDiaperLogs } from "./useDiaperLogs";
import { useFeedingLogs } from "./useFeedingLogs";
import { usePoopLogs } from "./usePoopLogs";
import { useSleepLogs } from "./useSleepLogs";
import { useStats } from "./useStats";
import { buildTrendsOverviewModel } from "../lib/trends";
import type { Child } from "../lib/types";

export function useTrendsOverview(child: Child | null, days: number) {
  const childId = child?.id ?? null;
  const poopState = usePoopLogs(childId, 200);
  const feedingState = useFeedingLogs(childId, 300);
  const sleepState = useSleepLogs(childId, 200);
  const diaperState = useDiaperLogs(childId, 300);
  const poopStats = useStats(childId, days);

  const overview = useMemo(() => {
    if (!child) return null;

    return buildTrendsOverviewModel({
      child,
      days,
      poopLogs: poopState.logs,
      lastRealPoop: poopState.lastRealPoop,
      feedingLogs: feedingState.logs,
      sleepLogs: sleepState.logs,
      diaperLogs: diaperState.logs,
    });
  }, [
    child,
    days,
    diaperState.logs,
    feedingState.logs,
    poopState.lastRealPoop,
    poopState.logs,
    sleepState.logs,
  ]);

  const isLoading = poopState.isLoading
    || feedingState.isLoading
    || sleepState.isLoading
    || diaperState.isLoading
    || poopStats.isLoading;

  return {
    overview,
    poopStats,
    isLoading,
  };
}
