import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSleepGlanceStats,
  buildSleepPatternPreviewSegments,
  buildSleepTimelineItems,
  buildSleepWeekPreviewBars,
  formatElapsedSince,
  getSleepRecentHistoryDayLabel,
  getSleepRecentHistorySummary,
  getWakeWindowProgress,
} from "../src/lib/sleep-view-model.ts";
import {
  formatMilestoneStamp,
  getMilestoneActivityNote,
  getMilestoneBadgeViewModel,
  getMilestoneEmptyExamples,
  getMilestoneJourneyCopy,
} from "../src/lib/milestone-view-model.ts";
import { formatLocalDateKey } from "../src/lib/utils.ts";
import type { MilestoneEntry, SleepEntry } from "../src/lib/types.ts";

const napLog: SleepEntry = {
  id: "sleep-1",
  child_id: "child-1",
  sleep_type: "nap",
  started_at: "2026-04-17T09:15:00",
  ended_at: "2026-04-17T10:00:00",
  notes: null,
  created_at: "2026-04-17T10:00:00",
};

const nightLog: SleepEntry = {
  ...napLog,
  id: "sleep-2",
  sleep_type: "night",
  started_at: "2026-04-16T19:30:00",
  ended_at: "2026-04-16T21:00:00",
};

const solidsMilestone: MilestoneEntry = {
  id: "milestone-1",
  child_id: "child-1",
  milestone_type: "started_solids",
  logged_at: "2026-04-17T11:30:00",
  notes: "Tried mashed avocado for the first time.",
  created_at: "2026-04-17T11:30:00",
};

test("buildSleepPatternPreviewSegments sorts logs and shapes preview positions", () => {
  const segments = buildSleepPatternPreviewSegments([napLog, nightLog]);

  assert.equal(segments[0]?.id, "sleep-2");
  assert.equal(segments[1]?.id, "sleep-1");
  assert.equal(segments[0]?.left, `${((19 * 60 + 30) / 1440) * 100}%`);
  assert.equal(segments[0]?.color, "var(--color-info)");
  assert.equal(segments[1]?.color, "var(--color-cta)");
});

test("buildSleepWeekPreviewBars scales weekly bars with zero-state fallback", () => {
  const bars = buildSleepWeekPreviewBars([
    { date: "2026-04-14", count: 0, weekdayLabel: "MON" },
    { date: "2026-04-15", count: 2, weekdayLabel: "TUE" },
    { date: "2026-04-16", count: 4, weekdayLabel: "WED" },
  ]);

  assert.equal(bars[0]?.height, "4px");
  assert.equal(bars[0]?.opacity, 0.3);
  assert.equal(bars[2]?.height, "32px");
  assert.equal(bars[2]?.weekdayLabel, "WED");
});

test("sleep recent history labels today, yesterday, and older days", () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const older = new Date(today);
  older.setDate(today.getDate() - 5);

  assert.equal(getSleepRecentHistoryDayLabel(`${formatLocalDateKey(today)}T09:00:00`), "Today");
  assert.equal(getSleepRecentHistoryDayLabel(`${formatLocalDateKey(yesterday)}T09:00:00`), "Yesterday");
  assert.match(getSleepRecentHistoryDayLabel(`${formatLocalDateKey(older)}T09:00:00`), /^[A-Z][a-z]{2} \d{1,2}$/);
});

test("sleep recent history summary uses parent-facing duration text", () => {
  assert.equal(getSleepRecentHistorySummary(nightLog), "Night, 1h 30m");
  assert.equal(getSleepRecentHistorySummary(napLog), "Nap, 45m");
});

test("sleep timeline view model turns sleep logs into wake and sleep events", () => {
  const timeline = buildSleepTimelineItems([napLog], "2026-04-17");

  assert.deepEqual(
    timeline.map((item) => [item.title, item.detail]),
    [
      ["Wake", "Awake again"],
      ["Nap", "45m"],
    ],
  );
});

test("sleep glance stats summarize today without changing prediction logic", () => {
  const stats = buildSleepGlanceStats({
    todayLogs: [napLog],
    completedLogs: [napLog, nightLog],
    dayKey: "2026-04-17",
  });

  assert.deepEqual(
    stats.map((stat) => [stat.id, stat.value, stat.detail]),
    [
      ["total-sleep", "45m", "Today"],
      ["naps", "1", "Today"],
      ["longest-nap", "45m", "Today"],
      ["night-sleep", "1h 30m", "Last night"],
    ],
  );
});

test("sleep assistant timing helpers format elapsed time and wake-window progress", () => {
  assert.equal(
    formatElapsedSince("2026-04-17T10:00:00", new Date("2026-04-17T12:40:00").getTime()),
    "2h 40m ago",
  );

  assert.deepEqual(
    getWakeWindowProgress(2, {
      label: "Early infant wake window",
      lowerHours: 1,
      upperHours: 2,
      description: "Usually short.",
    }),
    {
      thumbPercent: 80,
      fillPercent: 80,
      optimalStartPercent: 40,
      optimalEndPercent: 80,
    },
  );
});

test("milestone badge view model maps milestone types to display tones", () => {
  assert.deepEqual(getMilestoneBadgeViewModel(solidsMilestone), {
    label: "Nutrition",
    variant: "healthy",
    dotColor: "var(--color-healthy)",
  });
});

test("milestone journey copy uses latest milestone type and empty fallback", () => {
  assert.equal(
    getMilestoneJourneyCopy([solidsMilestone]),
    "Keeping track of moments like started solids helps later changes feel less confusing.",
  );
  assert.match(getMilestoneJourneyCopy([]), /calm record/i);
});

test("milestone activity note prefers notes and falls back to milestone description", () => {
  assert.equal(getMilestoneActivityNote(solidsMilestone), "Tried mashed avocado for the first time.");

  const withoutNotes: MilestoneEntry = {
    ...solidsMilestone,
    milestone_type: "illness",
    notes: null,
  };

  assert.match(getMilestoneActivityNote(withoutNotes), /Capture sickness periods/i);
});

test("milestone stamp formats logged timestamps for display", () => {
  assert.match(formatMilestoneStamp("2026-04-17T11:30:00"), /^Apr 17, 11:30/);
});

test("milestone empty examples remain concrete and parent-facing", () => {
  const examples = getMilestoneEmptyExamples();

  assert.equal(examples.length, 3);
  assert.ok(examples.some((example) => example.includes("Started solids")));
});
