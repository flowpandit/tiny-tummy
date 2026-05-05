import test from "node:test";
import assert from "node:assert/strict";
import { createLocalRepositories, type LocalDbClient } from "../src/lib/repositories/index.ts";
import { createReportService } from "../src/lib/services/report-service.ts";
import { createHandoffService } from "../src/lib/services/handoff-service.ts";
import { defaultReportOptions, type ReportSourceData } from "../src/lib/reporting.ts";
import type {
  Alert,
  Child,
  DiaperEntry,
  Episode,
  EpisodeEvent,
  FeedingEntry,
  MilestoneEntry,
  PoopEntry,
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

test("local ReportSourceRepository gathers active report rows and skips growth when excluded", async () => {
  const calls: string[] = [];
  const dbClient = {
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
  assert.deepEqual(source.episodeEvents.map((log) => log.id), [event.id]);
  assert.deepEqual(source.growthLogs, []);
  assert.equal(calls.includes("growth"), false);
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
    elimination: {
      listDiaperLogs: async () => [diaper],
      listPoopLogs: async () => [poop],
      getLastRealPoop: async () => poop,
    },
    feeding: {
      listFeedingLogs: async () => [feed],
    },
    care: {
      listActiveAlerts: async () => [alert],
      getActiveEpisode: async () => episode,
      listSymptoms: async () => [symptom],
      listEpisodeEvents: async () => [event],
    },
  } as Parameters<typeof createHandoffService>[0]);

  const snapshot = await service.getChildSummarySnapshot(child.id, {
    dayKey: "2026-04-12",
  });

  assert.equal(snapshot.todayWetDiapers, 1);
  assert.equal(snapshot.todayDirtyDiapers, 1);
  assert.equal(snapshot.todayFeeds, 1);
  assert.equal(snapshot.lastPoop?.id, poop.id);
  assert.deepEqual(snapshot.visibleAlerts.map((item) => item.id), [alert.id]);
});
