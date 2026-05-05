import test from "node:test";
import assert from "node:assert/strict";
import { CURRENT_CAREGIVER_SETTING_KEY, type ChildCaregiverProfile } from "../src/lib/caregivers.ts";
import { createLocalRepositories, type LocalDbClient } from "../src/lib/repositories/index.ts";
import { createReportService } from "../src/lib/services/report-service.ts";
import { createHandoffService } from "../src/lib/services/handoff-service.ts";
import { defaultReportOptions, type ReportSourceData } from "../src/lib/reporting.ts";
import type {
  Alert,
  Caregiver,
  Child,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  MilestoneEntry,
  PoopEntry,
  SleepEntry,
  SymptomEntry,
} from "../src/lib/types.ts";

const child: Child = {
  id: "child-1",
  name: "Luna",
  date_of_birth: "2026-04-01",
  sex: null,
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const caregiver: Caregiver = {
  id: "caregiver-1",
  display_name: "Mum",
  role: "parent",
  relationship: "parent",
  email: null,
  phone: null,
  avatar_color: "#7c3aed",
  is_primary: 1,
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
};

const childCaregiverProfile: ChildCaregiverProfile = {
  ...caregiver,
  child_caregiver_id: "child-caregiver-1",
  child_id: child.id,
  relationship_to_child: "parent",
  permissions: null,
  link_created_at: "2026-04-01T00:00:00.000Z",
  link_updated_at: "2026-04-01T00:00:00.000Z",
};

const poop: PoopEntry = {
  id: "poop-1",
  child_id: child.id,
  logged_at: "2026-04-12T09:00:00.000Z",
  stool_type: 4,
  color: "yellow",
  size: "medium",
  is_no_poop: 0,
  notes: null,
  photo_path: null,
  created_at: "2026-04-12T09:00:00.000Z",
  updated_at: "2026-04-12T09:00:00.000Z",
};

const diaper: DiaperEntry = {
  id: "diaper-1",
  child_id: child.id,
  logged_at: "2026-04-12T10:00:00.000Z",
  diaper_type: "mixed",
  urine_color: "normal",
  stool_type: 5,
  color: "brown",
  size: "large",
  notes: null,
  photo_path: null,
  linked_poop_log_id: "linked-poop-1",
  created_at: "2026-04-12T10:00:00.000Z",
  updated_at: "2026-04-12T10:00:00.000Z",
};

const feed: FeedingEntry = {
  id: "feed-1",
  child_id: child.id,
  logged_at: "2026-04-12T08:00:00.000Z",
  food_type: "breast_milk",
  food_name: null,
  amount_ml: null,
  duration_minutes: 12,
  breast_side: "left",
  bottle_content: null,
  reaction_notes: null,
  is_constipation_support: 0,
  notes: null,
  created_at: "2026-04-12T08:00:00.000Z",
};

const episode: Episode = {
  id: "episode-1",
  child_id: child.id,
  episode_type: "constipation",
  status: "active",
  started_at: "2026-04-12T07:00:00.000Z",
  ended_at: null,
  summary: "Watching tummy",
  outcome: null,
  created_at: "2026-04-12T07:00:00.000Z",
  updated_at: "2026-04-12T07:00:00.000Z",
};

const symptom: SymptomEntry = {
  id: "symptom-1",
  child_id: child.id,
  episode_id: episode.id,
  symptom_type: "straining",
  severity: "mild",
  temperature_c: null,
  temperature_method: null,
  logged_at: "2026-04-12T07:30:00.000Z",
  notes: "A little strain",
  created_at: "2026-04-12T07:30:00.000Z",
  updated_at: "2026-04-12T07:30:00.000Z",
};

const milestone: MilestoneEntry = {
  id: "milestone-1",
  child_id: child.id,
  milestone_type: "started_solids",
  logged_at: "2026-04-12T12:00:00.000Z",
  notes: null,
  created_at: "2026-04-12T12:00:00.000Z",
};

const event: EpisodeEvent = {
  id: "event-1",
  episode_id: episode.id,
  child_id: child.id,
  event_type: "symptom",
  title: "Straining",
  notes: null,
  logged_at: symptom.logged_at,
  created_at: symptom.logged_at,
  source_kind: "symptom",
  source_id: symptom.id,
};

const sleep: SleepEntry = {
  id: "sleep-1",
  child_id: child.id,
  sleep_type: "nap",
  started_at: "2026-04-12T13:00:00.000Z",
  ended_at: "2026-04-12T13:45:00.000Z",
  notes: null,
  created_at: "2026-04-12T13:00:00.000Z",
  updated_at: "2026-04-12T13:00:00.000Z",
};

test("local ReportSourceRepository gathers active report rows and skips growth when excluded", async () => {
  const calls: string[] = [];
  const dbClient = {
    getChildren: async () => [child],
    getPoopLogsForRange: async () => {
      calls.push("poop");
      return [poop];
    },
    getDiaperLogsForRange: async () => {
      calls.push("diaper");
      return [diaper];
    },
    getFeedingLogsForRange: async () => {
      calls.push("feed");
      return [feed];
    },
    getSleepLogsForRange: async () => {
      calls.push("sleep");
      return [sleep];
    },
    getEpisodesForRange: async () => {
      calls.push("episodes");
      return [episode];
    },
    getEpisodeEventsForRange: async () => {
      calls.push("events");
      return [event];
    },
    getSymptomsForRange: async () => {
      calls.push("symptoms");
      return [symptom];
    },
    getMilestonesForRange: async () => {
      calls.push("milestones");
      return [milestone];
    },
    getGrowthLogsForRange: async () => {
      calls.push("growth");
      return [];
    },
    getLatestReportActivityDate: async () => "2026-04-12T12:00:00.000Z",
  } as unknown as LocalDbClient;

  const repositories = createLocalRepositories(dbClient);
  const source = await repositories.reportSource.getSourceData({
    childId: child.id,
    startDate: "2026-04-12",
    endDate: "2026-04-12",
    options: { ...defaultReportOptions, includeGrowth: false },
  });

  assert.deepEqual(source.logs.map((log) => log.id), [poop.id]);
  assert.deepEqual(source.diaperLogs.map((log) => log.id), [diaper.id]);
  assert.deepEqual(source.feedingLogs.map((log) => log.id), [feed.id]);
  assert.deepEqual(source.sleepLogs, []);
  assert.deepEqual(source.episodeEvents.map((log) => log.id), [event.id]);
  assert.deepEqual(source.growthLogs, []);
  assert.equal(calls.includes("growth"), false);
  assert.equal(calls.includes("sleep"), false);
  assert.equal(await repositories.reportSource.getLatestActivityDate(child.id), "2026-04-12T12:00:00.000Z");
});

test("ReportService builds report DTOs from the source repository boundary", async () => {
  const linkedPoop = { ...poop, id: "linked-poop-1", logged_at: diaper.logged_at };
  const source: ReportSourceData = {
    logs: [linkedPoop],
    diaperLogs: [diaper],
    feedingLogs: [feed],
    growthLogs: [],
    episodes: [episode],
    episodeEvents: [event],
    symptomLogs: [symptom],
    milestoneLogs: [milestone],
  };
  const service = createReportService({
    getLatestActivityDate: async () => "2026-04-12T12:00:00.000Z",
    getSourceData: async () => source,
  });

  const data = await service.generateReport({
    childId: child.id,
    startDate: "2026-04-12",
    endDate: "2026-04-12",
  });

  assert.equal(data.stats.totalPoops, 1);
  assert.equal(data.diaperStats.wet, 1);
  assert.equal(data.diaperStats.dirty, 1);
  assert.deepEqual(data.timeline.map((row) => row.eventType), [
    "Milestone",
    "Stool + diaper",
    "Feed",
    "Symptom",
    "Episode",
  ]);
});

test("EliminationRepository exposes mixed diaper operations without leaking DB helper names", async () => {
  const calls: string[] = [];
  const dbClient = {
    createDiaperLog: async (input: Pick<DiaperEntry, "child_id" | "diaper_type" | "logged_at">) => {
      calls.push(`create:${input.diaper_type}`);
      return { ...diaper, ...input, linked_poop_log_id: "poop-from-diaper" };
    },
    updateDiaperLog: async (id: string) => {
      calls.push(`update:${id}`);
    },
    deleteDiaperLog: async (entry: Pick<DiaperEntry, "id">) => {
      calls.push(`delete:${entry.id}`);
    },
  } as unknown as LocalDbClient;

  const repository = createLocalRepositories(dbClient).elimination;
  const created = await repository.recordDiaper({
    child_id: child.id,
    logged_at: "2026-04-12T10:00:00.000Z",
    diaper_type: "mixed",
  });
  await repository.updateDiaper(created.id, { diaper_type: "wet" });
  await repository.deleteDiaper(created);

  assert.equal(created.linked_poop_log_id, "poop-from-diaper");
  assert.deepEqual(calls, ["create:mixed", "update:diaper-1", "delete:diaper-1"]);
});

test("local repositories add linked current caregiver attribution to create and update flows", async () => {
  const creates: Array<{ kind: string; input: Record<string, unknown> }> = [];
  const updates: Array<{ kind: string; id: string; input: Record<string, unknown> }> = [];
  const dbClient = {
    getSetting: async (key: string) => key === CURRENT_CAREGIVER_SETTING_KEY ? caregiver.id : null,
    getCaregiversForChild: async (childId: string) => childId === child.id ? [childCaregiverProfile] : [],
    runDbTransaction: async <T>(action: () => Promise<T>) => action(),
    createPoopLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "poop", input });
      return { ...poop, ...input, id: "poop-created" };
    },
    updatePoopLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "poop", id, input });
    },
    createDiaperLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "diaper", input });
      return { ...diaper, ...input, id: "diaper-created", linked_poop_log_id: "poop-from-diaper" };
    },
    updateDiaperLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "diaper", id, input });
    },
    createFeedingLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "feed", input });
      return { ...feed, ...input, id: "feed-created" };
    },
    updateDietLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "feed", id, input });
    },
    createSleepLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "sleep", input });
      return { ...sleep, ...input, id: "sleep-created" };
    },
    updateSleepLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "sleep", id, input });
    },
    createSymptomLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "symptom", input });
      return { ...symptom, ...input, id: "symptom-created" };
    },
    updateSymptomLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "symptom", id, input });
    },
    createEpisode: async (input: Record<string, unknown>) => {
      creates.push({ kind: "episode", input });
      return { ...episode, ...input, id: "episode-created" };
    },
    updateEpisode: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "episode", id, input });
    },
    closeEpisode: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "episode-resolve", id, input });
    },
    createEpisodeEvent: async (input: Record<string, unknown>) => {
      creates.push({ kind: "episode-event", input });
      return { ...event, ...input, id: "event-created" };
    },
    deleteGeneratedSymptomEpisodeEvent: async () => {},
    createGrowthLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "growth", input });
      return { id: "growth-created", child_id: child.id, measured_at: input.measured_at, weight_kg: null, height_cm: null, head_circumference_cm: null, notes: null, created_at: "now", updated_at: "now", ...input };
    },
    updateGrowthLog: async (id: string, input: Record<string, unknown>) => {
      updates.push({ kind: "growth", id, input });
    },
    createMilestoneLog: async (input: Record<string, unknown>) => {
      creates.push({ kind: "milestone", input });
      return { ...milestone, ...input, id: "milestone-created" };
    },
  } as unknown as LocalDbClient;

  const repositories = createLocalRepositories(dbClient);

  await repositories.elimination.recordPoop({
    child_id: child.id,
    logged_at: poop.logged_at,
    stool_type: 4,
  });
  await repositories.elimination.updatePoop(poop.id, {
    child_id: child.id,
    notes: "Edited",
  });
  await repositories.elimination.recordDiaper({
    child_id: child.id,
    logged_at: diaper.logged_at,
    diaper_type: "mixed",
  });
  await repositories.elimination.updateDiaper(diaper.id, {
    child_id: child.id,
    diaper_type: "wet",
  });
  await repositories.feeding.recordFeed({
    child_id: child.id,
    logged_at: feed.logged_at,
    food_type: "breast_milk",
  });
  await repositories.feeding.updateFeed(feed.id, {
    child_id: child.id,
    notes: "Edited feed",
  });
  await repositories.sleep.recordSleep({
    child_id: child.id,
    sleep_type: "nap",
    started_at: sleep.started_at,
    ended_at: sleep.ended_at,
  });
  await repositories.sleep.updateSleep(sleep.id, {
    child_id: child.id,
    notes: "Edited sleep",
  });
  await repositories.care.recordSymptom({
    child_id: child.id,
    symptom_type: "straining",
    severity: "mild",
    logged_at: symptom.logged_at,
  });
  await repositories.care.saveSymptomWithEpisodeEvent({
    childId: child.id,
    existingSymptom: null,
    symptom: {
      child_id: child.id,
      symptom_type: "straining",
      severity: "mild",
      logged_at: symptom.logged_at,
    },
    episodeEvent: {
      episode_id: episode.id,
      event_type: "symptom",
      title: "Straining",
      logged_at: symptom.logged_at,
      source_kind: "symptom",
    },
  });
  await repositories.care.startEpisode({
    child_id: child.id,
    episode_type: "constipation",
    started_at: episode.started_at,
  });
  await repositories.care.addEpisodeEvent({
    episode_id: episode.id,
    child_id: child.id,
    event_type: "progress",
    title: "Settled",
    logged_at: event.logged_at,
  });
  await repositories.care.resolveEpisode(episode.id, {
    child_id: child.id,
    ended_at: "2026-04-12T14:00:00.000Z",
    outcome: "Resolved",
  });
  await repositories.growth.recordGrowth({
    child_id: child.id,
    measured_at: "2026-04-12T15:00:00.000Z",
    weight_kg: 5.1,
  });
  await repositories.growth.updateGrowth("growth-1", {
    child_id: child.id,
    notes: "Edited growth",
  });
  await repositories.milestones.recordMilestone({
    child_id: child.id,
    milestone_type: "started_solids",
    logged_at: milestone.logged_at,
  });

  for (const { input } of creates) {
    assert.equal(input.created_by_caregiver_id, caregiver.id);
    assert.equal(input.updated_by_caregiver_id, caregiver.id);
  }

  for (const { input } of updates) {
    assert.equal(input.updated_by_caregiver_id, caregiver.id);
    assert.equal(Object.hasOwn(input, "created_by_caregiver_id"), false);
  }

  assert.equal(creates.some((call) => call.kind === "diaper" && call.input.diaper_type === "mixed"), true);
  assert.equal(creates.some((call) => call.kind === "episode-event" && call.input.source_id === "symptom-created"), true);
});

test("local repositories leave attribution null when no linked current caregiver is available", async () => {
  const createdInputs: Record<string, unknown>[] = [];
  const createDbClient = (currentCaregiverId: string | null, linkedProfiles: ChildCaregiverProfile[]) => ({
    getSetting: async () => currentCaregiverId,
    getCaregiversForChild: async () => linkedProfiles,
    createPoopLog: async (input: Record<string, unknown>) => {
      createdInputs.push(input);
      return { ...poop, ...input };
    },
  }) as unknown as LocalDbClient;
  const unlinkedRepository = createLocalRepositories(createDbClient(caregiver.id, [])).elimination;

  await unlinkedRepository.recordPoop({
    child_id: child.id,
    logged_at: poop.logged_at,
  });

  assert.equal(createdInputs[0]?.created_by_caregiver_id, null);
  assert.equal(createdInputs[0]?.updated_by_caregiver_id, null);

  const noCurrentRepository = createLocalRepositories(createDbClient(null, [childCaregiverProfile])).elimination;
  await noCurrentRepository.recordPoop({
    child_id: child.id,
    logged_at: poop.logged_at,
  });

  assert.equal(createdInputs[1]?.created_by_caregiver_id, null);
  assert.equal(createdInputs[1]?.updated_by_caregiver_id, null);
});

test("CareRepository keeps symptom and generated episode event changes in one aggregate operation", async () => {
  const calls: string[] = [];
  const createdSymptom = { ...symptom, id: "symptom-created", episode_id: episode.id };
  const dbClient = {
    runDbTransaction: async <T>(action: () => Promise<T>) => {
      calls.push("transaction");
      return action();
    },
    createSymptomLog: async () => {
      calls.push("create-symptom");
      return createdSymptom;
    },
    createEpisodeEvent: async (input: EpisodeEvent) => {
      calls.push(`create-event:${input.source_id}`);
      return { ...event, ...input };
    },
  } as unknown as LocalDbClient;

  const repository = createLocalRepositories(dbClient).care;
  const saved = await repository.saveSymptomWithEpisodeEvent({
    childId: child.id,
    symptom: {
      child_id: child.id,
      episode_id: episode.id,
      symptom_type: "straining",
      severity: "mild",
      logged_at: symptom.logged_at,
      notes: symptom.notes,
    },
    episodeEvent: {
      episode_id: episode.id,
      event_type: "symptom",
      title: "Straining",
      notes: symptom.notes,
      logged_at: symptom.logged_at,
      source_kind: "symptom",
    },
  });

  assert.equal(saved?.id, "symptom-created");
  assert.deepEqual(calls, ["transaction", "create-symptom", "create-event:symptom-created"]);
});

test("HandoffService prepares a local summary snapshot through repositories", async () => {
  const alert: Alert = {
    id: "alert-1",
    child_id: child.id,
    alert_type: "low_wet_output",
    severity: "warning",
    title: "Watch diapers",
    message: "Wet output is lighter than usual.",
    is_dismissed: 0,
    triggered_at: "2026-04-12T12:00:00.000Z",
    related_log_id: diaper.id,
  };
  const service = createHandoffService({
    children: {
      listActiveChildren: async () => [child],
    },
    caregivers: {
      listCaregiversForChild: async () => [childCaregiverProfile],
    },
    elimination: {
      listDiaperLogs: async () => [{ ...diaper, created_by_caregiver_id: caregiver.id }],
      listPoopLogs: async () => [poop],
      getLastRealPoop: async () => poop,
    },
    feeding: {
      listFeedingLogs: async () => [feed],
    },
    sleep: {
      listSleepLogs: async () => [sleep],
    },
    care: {
      listActiveAlerts: async () => [alert],
      getActiveEpisode: async () => episode,
      listSymptoms: async () => [symptom],
      listEpisodeEvents: async () => [event],
    },
    settings: {
      getSetting: async () => caregiver.id,
    },
  } as Parameters<typeof createHandoffService>[0]);

  const snapshot = await service.getChildSummarySnapshot(child.id, {
    dayKey: "2026-04-12",
  });

  assert.equal(snapshot.todayWetDiapers, 1);
  assert.equal(snapshot.todayDirtyDiapers, 1);
  assert.equal(snapshot.todayFeeds, 1);
  assert.equal(snapshot.lastPoop?.id, poop.id);
  assert.equal(snapshot.lastSleep?.id, sleep.id);
  assert.deepEqual(snapshot.visibleAlerts.map((item) => item.id), [alert.id]);

  const handoff = await service.getHandoffSummary(child.id, {
    dayKey: "2026-04-12",
    generatedAt: "2026-04-12T14:00:00.000Z",
    parentNote: "Nana is taking over after lunch.",
  });

  assert.equal(handoff.child.name, child.name);
  assert.equal(handoff.todaySummary.wetDiaperCount, 1);
  assert.equal(handoff.lastEvents.lastPoop?.detail, "brown, Type 5, large");
  assert.equal(handoff.lastEvents.lastPoop?.attributionLabel, "Logged by Mum");
  assert.equal(handoff.lastEvents.activeEpisode?.title, "Constipation concern");
  assert.deepEqual(handoff.preparedBy, { displayName: "Mum", roleLabel: "Parent" });
  assert.equal(handoff.parentNote, "Nana is taking over after lunch.");
  assert.equal(JSON.stringify(handoff).includes("photo_path"), false);
});
