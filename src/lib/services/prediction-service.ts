import {
  getFeedBaseline,
  getFeedPrediction,
  getUnifiedFeedTimeline,
  type FeedBaseline,
  type FeedPrediction,
} from "../feed-insights";
import {
  getClassifiedSleepLogs,
  getSleepPrediction,
  getWakeBaseline,
  type SleepPrediction,
  type WakeBaseline,
} from "../sleep-insights";
import type { Child, FeedingEntry, SleepEntry } from "../types";

export interface FeedPredictionSnapshot {
  baseline: FeedBaseline;
  timeline: FeedingEntry[];
  prediction: FeedPrediction | null;
}

export interface SleepPredictionSnapshot {
  baseline: WakeBaseline;
  logs: SleepEntry[];
  prediction: SleepPrediction | null;
}

export interface PredictionService {
  getFeedWindow(child: Child, feedingLogs: FeedingEntry[]): FeedPredictionSnapshot;
  getSleepWindow(child: Child, sleepLogs: SleepEntry[]): SleepPredictionSnapshot;
}

export function createPredictionService(): PredictionService {
  return {
    getFeedWindow(child, feedingLogs) {
      const timeline = getUnifiedFeedTimeline(feedingLogs);
      const baseline = getFeedBaseline(child.date_of_birth, child.feeding_type);

      return {
        baseline,
        timeline,
        prediction: getFeedPrediction(timeline, baseline),
      };
    },
    getSleepWindow(child, sleepLogs) {
      const logs = getClassifiedSleepLogs(sleepLogs);
      const baseline = getWakeBaseline(child.date_of_birth);

      return {
        baseline,
        logs,
        prediction: getSleepPrediction(logs, baseline),
      };
    },
  };
}

export const defaultPredictionService = createPredictionService();
