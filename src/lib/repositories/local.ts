import * as defaultDbClient from "../db";
import type {
  AppRepositories,
  CreateEpisodeEventInput,
  CreateFeedingInput,
  LinkedSymptomForEpisode,
  ReportSourceRequest,
  SaveSymptomWithEpisodeEventInput,
  StartEpisodeWithLinkedSymptomsInput,
  UpdateFeedingInput,
} from "./types";

export type LocalDbClient = typeof defaultDbClient;

function createFeedingLog(client: LocalDbClient, input: CreateFeedingInput) {
  return (client.createFeedingLog ?? client.createDietLog)(input);
}

async function saveSymptomWithEpisodeEvent(
  client: LocalDbClient,
  input: SaveSymptomWithEpisodeEventInput,
) {
  return client.runDbTransaction(async () => {
    if (input.updateEpisodeStartedAt) {
      await client.updateEpisode(input.updateEpisodeStartedAt.episodeId, {
        started_at: input.updateEpisodeStartedAt.startedAt,
      });
    }

    if (input.existingSymptom) {
      await client.updateSymptomLog(input.existingSymptom.id, input.symptom);
      await client.deleteGeneratedSymptomEpisodeEvent({
        symptomId: input.existingSymptom.id,
        episodeId: input.existingSymptom.episode_id,
        loggedAt: input.existingSymptom.logged_at,
      });

      if (input.episodeEvent) {
        await client.createEpisodeEvent({
          ...input.episodeEvent,
          child_id: input.childId,
          source_id: input.existingSymptom.id,
        });
      }

      return null;
    }

    const symptom = await client.createSymptomLog(input.symptom as Parameters<LocalDbClient["createSymptomLog"]>[0]);

    if (input.episodeEvent) {
      await client.createEpisodeEvent({
        ...input.episodeEvent,
        child_id: input.childId,
        source_id: symptom.id,
      });
    }

    return symptom;
  });
}

async function deleteSymptomWithGeneratedEvent(
  client: LocalDbClient,
  input: { id: string; episode_id: string | null; logged_at: string },
): Promise<void> {
  await client.runDbTransaction(async () => {
    await client.deleteGeneratedSymptomEpisodeEvent({
      symptomId: input.id,
      episodeId: input.episode_id,
      loggedAt: input.logged_at,
    });
    await client.deleteSymptomLog(input.id);
  });
}

function buildLinkedSymptomEvent(
  childId: string,
  episodeId: string,
  linkedSymptom: LinkedSymptomForEpisode,
): CreateEpisodeEventInput {
  return {
    episode_id: episodeId,
    child_id: childId,
    event_type: "symptom",
    title: linkedSymptom.eventTitle,
    notes: linkedSymptom.symptom.notes,
    logged_at: linkedSymptom.symptom.logged_at,
    source_kind: "symptom",
    source_id: linkedSymptom.symptom.id,
  };
}

async function startEpisodeWithLinkedSymptoms(
  client: LocalDbClient,
  input: StartEpisodeWithLinkedSymptomsInput,
) {
  return client.runDbTransaction(async () => {
    const episode = await client.createEpisode(input.episode);

    for (const linkedSymptom of input.linkedSymptoms) {
      const symptom = linkedSymptom.symptom;
      await client.updateSymptomLog(symptom.id, { episode_id: episode.id });
      await client.deleteGeneratedSymptomEpisodeEvent({
        symptomId: symptom.id,
        episodeId: symptom.episode_id,
        loggedAt: symptom.logged_at,
      });
      await client.createEpisodeEvent(buildLinkedSymptomEvent(input.episode.child_id, episode.id, linkedSymptom));
    }

    return episode;
  });
}

async function getReportSourceData(
  repositories: Pick<AppRepositories, "children" | "elimination" | "feeding" | "sleep" | "care" | "growth" | "milestones">,
  input: ReportSourceRequest,
) {
  const shouldLoadSleep = input.options.includeSleepContext || input.options.mode === "caregiver_handoff";
  const shouldLoadGrowth = input.options.includeGrowth !== false && input.options.includeGrowthContext !== false;
  const [children, logs, diaperLogs, feedingLogs, sleepLogs, episodes, episodeEvents, symptomLogs, milestoneLogs, growthLogs] = await Promise.all([
    repositories.children.listActiveChildren(),
    repositories.elimination.listPoopLogsInRange(input.childId, input.startDate, input.endDate),
    repositories.elimination.listDiaperLogsInRange(input.childId, input.startDate, input.endDate),
    repositories.feeding.listFeedingLogsInRange(input.childId, input.startDate, input.endDate),
    shouldLoadSleep
      ? repositories.sleep.listSleepLogsInRange(input.childId, input.startDate, input.endDate)
      : Promise.resolve([]),
    repositories.care.listEpisodesInRange(input.childId, input.startDate, input.endDate),
    repositories.care.listEpisodeEventsInRange(input.childId, input.startDate, input.endDate),
    repositories.care.listSymptomsInRange(input.childId, input.startDate, input.endDate),
    repositories.milestones.listMilestonesInRange(input.childId, input.startDate, input.endDate),
    shouldLoadGrowth
      ? repositories.growth.listGrowthLogsInRange(input.childId, input.startDate, input.endDate)
      : Promise.resolve([]),
  ]);

  return {
    child: children.find((child) => child.id === input.childId) ?? null,
    logs,
    diaperLogs,
    feedingLogs,
    sleepLogs,
    growthLogs,
    episodes,
    episodeEvents,
    symptomLogs,
    milestoneLogs,
  };
}

export function createLocalRepositories(client: LocalDbClient = defaultDbClient): AppRepositories {
  const children: AppRepositories["children"] = {
    createChild: (input) => client.createChild(input),
    listActiveChildren: () => client.getChildren(),
    updateChild: (childId, updates) => client.updateChild(childId, updates),
    deleteChild: (childId) => client.deleteChild(childId),
  };

  const caregivers: AppRepositories["caregivers"] = {
    deleteCaregiver: (caregiverId) => client.deleteCaregiver(caregiverId),
    deleteChildCaregiverLink: (linkId) => client.deleteChildCaregiverLink(linkId),
  };

  const elimination: AppRepositories["elimination"] = {
    recordPoop: (input) => client.createPoopLog(input),
    markNoPoopDay: (childId) => client.logNoPoop(childId),
    listPoopLogs: (childId, limit) => client.getPoopLogs(childId, limit),
    listPoopLogsInRange: (childId, startDate, endDate) => client.getPoopLogsForRange(childId, startDate, endDate),
    getLastRealPoop: (childId) => client.getLastRealPoop(childId),
    updatePoop: (entryId, updates) => client.updatePoopLog(entryId, updates),
    deletePoop: (entry) => client.deletePoopLog(entry),
    reconcileAutoNoPoopDays: (childId) => client.reconcileAutoNoPoopDays(childId),
    recordDiaper: (input) => client.createDiaperLog(input),
    listDiaperLogs: (childId, limit) => client.getDiaperLogs(childId, limit),
    listDiaperLogsInRange: (childId, startDate, endDate) => client.getDiaperLogsForRange(childId, startDate, endDate),
    getLastDiaper: (childId) => client.getLastDiaperLog(childId),
    getLastWetDiaper: (childId) => client.getLastWetDiaper(childId),
    getLastDirtyDiaper: (childId) => client.getLastDirtyDiaper(childId),
    updateDiaper: (entryId, updates) => client.updateDiaperLog(entryId, updates),
    deleteDiaper: (entry) => client.deleteDiaperLog(entry),
    getPoopFrequencyStats: (childId, days) => client.getFrequencyStats(childId, days),
    getPoopConsistencyTrend: (childId, days) => client.getConsistencyTrend(childId, days),
    getPoopColorDistribution: (childId, days) => client.getColorDistribution(childId, days),
  };

  const feeding: AppRepositories["feeding"] = {
    recordFeed: (input: CreateFeedingInput) => createFeedingLog(client, input),
    listFeedingLogs: (childId, limit) => client.getFeedingLogs(childId, limit),
    listFeedingLogsInRange: (childId, startDate, endDate) => client.getFeedingLogsForRange(childId, startDate, endDate),
    updateFeed: (entryId, updates: UpdateFeedingInput) => client.updateDietLog(entryId, updates),
    deleteFeed: (entryId) => client.deleteDietLog(entryId),
  };

  const sleep: AppRepositories["sleep"] = {
    recordSleep: (input) => client.createSleepLog(input),
    listSleepLogs: (childId, limit) => client.getSleepLogs(childId, limit),
    listSleepLogsInRange: (childId, startDate, endDate) => client.getSleepLogsForRange(childId, startDate, endDate),
    updateSleep: (entryId, updates) => client.updateSleepLog(entryId, updates),
    deleteSleep: (entryId) => client.deleteSleepLog(entryId),
  };

  const care: AppRepositories["care"] = {
    recordSymptom: (input) => client.createSymptomLog(input),
    updateSymptom: (entryId, updates) => client.updateSymptomLog(entryId, updates),
    deleteSymptom: (entryId) => client.deleteSymptomLog(entryId),
    listSymptoms: (childId, limit) => client.getSymptoms(childId, limit),
    listSymptomsInRange: (childId, startDate, endDate) => client.getSymptomsForRange(childId, startDate, endDate),
    saveSymptomWithEpisodeEvent: (input) => saveSymptomWithEpisodeEvent(client, input),
    deleteSymptomWithGeneratedEvent: (input) => deleteSymptomWithGeneratedEvent(client, input),
    startEpisode: (input) => client.createEpisode(input),
    startEpisodeWithLinkedSymptoms: (input) => startEpisodeWithLinkedSymptoms(client, input),
    getActiveEpisode: (childId) => client.getActiveEpisode(childId),
    listActiveEpisodes: (childId) => client.getActiveEpisodes(childId),
    listRecentEpisodes: (childId, limit) => client.getEpisodes(childId, limit),
    listEpisodesInRange: (childId, startDate, endDate) => client.getEpisodesForRange(childId, startDate, endDate),
    updateEpisode: (entryId, updates) => client.updateEpisode(entryId, updates),
    resolveEpisode: (entryId, input) => client.closeEpisode(entryId, input),
    addEpisodeEvent: (input) => client.createEpisodeEvent(input),
    deleteGeneratedSymptomEvent: (input) => client.deleteGeneratedSymptomEpisodeEvent(input),
    listEpisodeEvents: (episodeId) => client.getEpisodeEvents(episodeId),
    listEpisodeEventsForChild: (childId, limit) => client.getEpisodeEventsByChild(childId, limit),
    listEpisodeEventsInRange: (childId, startDate, endDate) => client.getEpisodeEventsForRange(childId, startDate, endDate),
    listActiveAlerts: (childId) => client.getActiveAlerts(childId),
    recordAlert: (input) => client.createAlert(input),
    hasAlertForLog: (childId, alertType, relatedLogId) => client.hasAlertForLog(childId, alertType, relatedLogId),
    dismissAlert: (alertId) => client.dismissAlert(alertId),
  };

  const growth: AppRepositories["growth"] = {
    recordGrowth: (input) => client.createGrowthLog(input),
    listGrowthLogs: (childId, limit) => client.getGrowthLogs(childId, limit),
    listGrowthLogsInRange: (childId, startDate, endDate) => client.getGrowthLogsForRange(childId, startDate, endDate),
    getLatestGrowth: (childId) => client.getLatestGrowthLog(childId),
    updateGrowth: (entryId, updates) => client.updateGrowthLog(entryId, updates),
    deleteGrowth: (entryId) => client.deleteGrowthLog(entryId),
  };

  const milestones: AppRepositories["milestones"] = {
    recordMilestone: (input) => client.createMilestoneLog(input),
    listMilestones: (childId, limit) => client.getMilestoneLogs(childId, limit),
    listMilestonesInRange: (childId, startDate, endDate) => client.getMilestonesForRange(childId, startDate, endDate),
    deleteMilestone: (entryId) => client.deleteMilestoneLog(entryId),
  };

  const settings: AppRepositories["settings"] = {
    getSetting: (key) => client.getSetting(key),
    setSetting: (key, value) => client.setSetting(key, value),
    deleteSetting: (key) => client.deleteSetting(key),
    listQuickPresets: (childId, kind) => client.getQuickPresets(childId, kind),
    replaceQuickPresets: (childId, kind, presets) => client.replaceQuickPresets(childId, kind, presets),
  };

  const attachments: AppRepositories["attachments"] = {
    deleteAttachmentMetadata: (attachmentId) => client.deleteAttachmentMetadata(attachmentId),
    deleteAttachmentMetadataForOwner: (ownerTable, ownerId) => client.deleteAttachmentMetadataForOwner(ownerTable, ownerId),
  };

  const exportImport: AppRepositories["exportImport"] = {
    loadSnapshotSourceData: (input) => client.loadSnapshotSourceData(input),
    loadSnapshotImportExistingRecords: () => client.loadSnapshotImportExistingRecords(),
    importSnapshotIntoEmptyDatabase: (snapshot) => client.importSnapshotIntoEmptyDatabase(snapshot),
  };

  const repositories: AppRepositories = {
    children,
    caregivers,
    elimination,
    feeding,
    sleep,
    care,
    growth,
    milestones,
    settings,
    attachments,
    exportImport,
    reportSource: {
      getLatestActivityDate: (childId) => client.getLatestReportActivityDate(childId),
      getSourceData: (input) => getReportSourceData(repositories, input),
    },
  };

  return repositories;
}
