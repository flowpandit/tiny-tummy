import { buildChildDailySummary, type ChildDailySummary } from "../child-summary";
import { buildHandoffSummary, type HandoffSummary } from "../handoff-summary";
import type {
  Alert,
  DiaperEntry,
  EpisodeEvent,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
} from "../types";
import type { AppRepositories } from "../repositories";

export interface ChildSummarySnapshot extends ChildDailySummary {
  diaperLogs: DiaperEntry[];
  lastPoop: PoopEntry | null;
  lastSleep: SleepEntry | null;
  alerts: Alert[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
}

export interface HandoffService {
  getChildSummarySnapshot(
    childId: string,
    options?: {
      poopLimit?: number;
      feedingLimit?: number;
      symptomLimit?: number;
      dayKey?: string;
    },
  ): Promise<ChildSummarySnapshot>;
  getHandoffSummary(
    childId: string,
    options?: {
      poopLimit?: number;
      feedingLimit?: number;
      sleepLimit?: number;
      symptomLimit?: number;
      dayKey?: string;
      generatedAt?: string;
      parentNote?: string | null;
    },
  ): Promise<HandoffSummary>;
}

export function createHandoffService(
  repositories: Pick<AppRepositories, "children" | "elimination" | "feeding" | "sleep" | "care">,
): HandoffService {
  return {
    async getChildSummarySnapshot(childId, options = {}) {
      const poopLimit = options.poopLimit ?? 100;
      const feedingLimit = options.feedingLimit ?? 100;
      const symptomLimit = options.symptomLimit ?? 10;

      const [diaperLogs, poopLogs, lastPoop, feedingLogs, sleepLogs, alerts, activeEpisode, symptomLogs] = await Promise.all([
        repositories.elimination.listDiaperLogs(childId, poopLimit),
        repositories.elimination.listPoopLogs(childId, poopLimit),
        repositories.elimination.getLastRealPoop(childId),
        repositories.feeding.listFeedingLogs(childId, feedingLimit),
        repositories.sleep.listSleepLogs(childId, 1),
        repositories.care.listActiveAlerts(childId),
        repositories.care.getActiveEpisode(childId),
        repositories.care.listSymptoms(childId, symptomLimit),
      ]);

      const episodeEvents = activeEpisode
        ? await repositories.care.listEpisodeEvents(activeEpisode.id)
        : [];

      const summary = buildChildDailySummary({
        poopLogs,
        diaperLogs,
        feedingLogs,
        alerts,
        activeEpisode,
        episodeEvents,
        symptomLogs,
        dayKey: options.dayKey,
      });

      return {
        ...summary,
        diaperLogs,
        lastPoop,
        lastSleep: sleepLogs[0] ?? null,
        alerts,
        episodeEvents,
        symptomLogs,
      };
    },
    async getHandoffSummary(childId, options = {}) {
      const poopLimit = options.poopLimit ?? 100;
      const feedingLimit = options.feedingLimit ?? 100;
      const sleepLimit = options.sleepLimit ?? 50;
      const symptomLimit = options.symptomLimit ?? 20;

      const [children, diaperLogs, poopLogs, feedingLogs, sleepLogs, alerts, activeEpisode, symptomLogs] = await Promise.all([
        repositories.children.listActiveChildren(),
        repositories.elimination.listDiaperLogs(childId, poopLimit),
        repositories.elimination.listPoopLogs(childId, poopLimit),
        repositories.feeding.listFeedingLogs(childId, feedingLimit),
        repositories.sleep.listSleepLogs(childId, sleepLimit),
        repositories.care.listActiveAlerts(childId),
        repositories.care.getActiveEpisode(childId),
        repositories.care.listSymptoms(childId, symptomLimit),
      ]);
      const child = children.find((item) => item.id === childId) ?? null;

      if (!child) {
        throw new Error("Child not found for caregiver handoff.");
      }

      const episodeEvents = activeEpisode
        ? await repositories.care.listEpisodeEvents(activeEpisode.id)
        : [];

      return buildHandoffSummary({
        child,
        poopLogs,
        diaperLogs,
        feedingLogs,
        sleepLogs,
        alerts,
        activeEpisode,
        episodeEvents,
        symptomLogs,
        dayKey: options.dayKey,
        generatedAt: options.generatedAt,
        parentNote: options.parentNote,
      });
    },
  };
}

export type { HandoffSummary };
