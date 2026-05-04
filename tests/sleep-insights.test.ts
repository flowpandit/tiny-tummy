import test from "node:test";
import assert from "node:assert/strict";
import {
  classifySleepType,
  getClassifiedSleepLogs,
  getCompletedSleepLogs,
  getDurationMinutes,
  getLastNapDisplay,
  getSleepPrediction,
  getWakeBaseline,
} from "../src/lib/sleep-insights.ts";
import type { SleepEntry } from "../src/lib/types.ts";

const pastNap: SleepEntry = {
  id: "sleep-past",
  child_id: "child-1",
  sleep_type: "nap",
  started_at: "2026-04-10T09:00:00.000Z",
  ended_at: "2026-04-10T10:00:00.000Z",
  notes: null,
  created_at: "2026-04-10T10:00:00.000Z",
};

const olderNap: SleepEntry = {
  ...pastNap,
  id: "sleep-older",
  started_at: "2026-04-10T05:30:00.000Z",
  ended_at: "2026-04-10T06:15:00.000Z",
};

const futureNap: SleepEntry = {
  ...pastNap,
  id: "sleep-future",
  started_at: "2026-04-10T12:00:00.000Z",
  ended_at: "2026-04-10T13:00:00.000Z",
};

function createSleepLog(id: string, startedAt: string, endedAt: string): SleepEntry {
  return {
    id,
    child_id: "child-1",
    sleep_type: "nap",
    started_at: startedAt,
    ended_at: endedAt,
    notes: null,
    created_at: endedAt,
  };
}

test("getCompletedSleepLogs filters out future and invalid sleep rows", () => {
  const invalidNap: SleepEntry = {
    ...pastNap,
    id: "sleep-invalid",
    started_at: "bad-value",
  };

  const completed = getCompletedSleepLogs(
    [futureNap, pastNap, invalidNap],
    new Date("2026-04-10T12:00:00.000Z").getTime(),
  );

  assert.deepEqual(completed.map((entry) => entry.id), ["sleep-past"]);
});

test("classifySleepType uses the night start window and duration threshold", () => {
  assert.equal(classifySleepType("2026-05-01T19:00:00", "2026-05-01T22:00:00"), "night");
  assert.equal(classifySleepType("2026-05-01T17:30:00", "2026-05-01T21:00:00"), "nap");
  assert.equal(classifySleepType("2026-05-01T20:00:00", "2026-05-01T22:59:00"), "nap");
});

test("getClassifiedSleepLogs reclassifies long evening sleep as night sleep", () => {
  const logs = [
    createSleepLog("night", "2026-05-01T19:30:00", "2026-05-01T23:15:00"),
    createSleepLog("nap", "2026-05-01T13:00:00", "2026-05-01T13:45:00"),
  ];

  const classified = getClassifiedSleepLogs(logs, new Date("2026-05-02T12:00:00").getTime());

  assert.equal(classified.find((entry) => entry.id === "night")?.sleep_type, "night");
  assert.equal(classified.find((entry) => entry.id === "nap")?.sleep_type, "nap");
});

test("getClassifiedSleepLogs merges short night interruptions into one night sleep", () => {
  const logs = [
    createSleepLog("segment-2", "2026-05-01T22:45:00", "2026-05-02T02:00:00"),
    createSleepLog("segment-1", "2026-05-01T19:30:00", "2026-05-01T22:00:00"),
  ];

  const classified = getClassifiedSleepLogs(logs, new Date("2026-05-02T12:00:00").getTime());

  assert.equal(classified.length, 1);
  assert.equal(classified[0]?.sleep_type, "night");
  assert.equal(classified[0]?.started_at, "2026-05-01T19:30:00");
  assert.equal(classified[0]?.ended_at, "2026-05-02T02:00:00");
  assert.equal(getDurationMinutes(classified[0]!), 345);
  assert.deepEqual(classified[0]?.source_log_ids, ["segment-1", "segment-2"]);
});

test("sleep insights ignore future logs when picking the last nap and prediction", () => {
  const logs = [futureNap, pastNap, olderNap];
  const now = new Date("2026-04-10T12:00:00.000Z").getTime();
  const baseline = getWakeBaseline("2026-01-01");
  const realDateNow = Date.now;
  Date.now = () => now;

  try {
    const lastNap = getLastNapDisplay("2026-01-01", logs);
    const prediction = getSleepPrediction(logs, baseline);

    assert.equal(lastNap.timestamp, pastNap.ended_at);
    assert.equal(lastNap.label, "Last nap");
    assert.ok(prediction);
    assert.equal(prediction?.source, "history");
    assert.ok(prediction!.predictedAt.getTime() > new Date(pastNap.ended_at).getTime());
  } finally {
    Date.now = realDateNow;
  }
});
