import test from "node:test";
import assert from "node:assert/strict";
import {
  getCompletedSleepLogs,
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
