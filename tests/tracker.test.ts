import test from "node:test";
import assert from "node:assert/strict";
import {
  DAYS_IN_WEEK,
  formatHoursCompact,
  formatHoursLong,
  formatWeekLabel,
  getEarliestLoggedDate,
  getMaxWeekOffset,
  getWeekRange,
  startOfDay,
} from "../src/lib/tracker.ts";

test("uses a seven-day week constant", () => {
  assert.equal(DAYS_IN_WEEK, 7);
});

test("formats week labels within one month and across months", () => {
  assert.equal(
    formatWeekLabel(new Date("2026-04-08T00:00:00"), new Date("2026-04-14T00:00:00")),
    "Apr 8 - 14",
  );
  assert.equal(
    formatWeekLabel(new Date("2026-03-29T00:00:00"), new Date("2026-04-04T00:00:00")),
    "Mar 29 - Apr 4",
  );
});

test("formats hours in long and compact variants", () => {
  assert.equal(formatHoursLong(1.2), "1 hour");
  assert.equal(formatHoursLong(26), "1.1 days");
  assert.equal(formatHoursCompact(5.4), "5h");
  assert.equal(formatHoursCompact(30), "1.3d");
});

test("finds the earliest logged date using the last item in chronological order", () => {
  const earliest = getEarliestLoggedDate(
    [
      { at: "2026-04-14T09:00:00" },
      { at: "2026-04-13T09:00:00" },
      { at: "2026-04-10T09:00:00" },
    ],
    (entry) => entry.at,
  );

  assert.deepEqual(earliest, startOfDay(new Date("2026-04-10T09:00:00")));
  assert.equal(getEarliestLoggedDate([], (entry: { at: string }) => entry.at), null);
});

test("computes the max week offset from the earliest log", () => {
  const earliest = new Date("2026-03-20T15:00:00");
  assert.equal(getMaxWeekOffset(earliest, new Date("2026-04-14T10:00:00")), 3);
  assert.equal(getMaxWeekOffset(null, new Date("2026-04-14T10:00:00")), 0);
});

test("returns the expected seven-day week range for an offset", () => {
  const range = getWeekRange(1, new Date("2026-04-14T10:00:00"));
  assert.deepEqual(range, {
    startDate: new Date("2026-04-01T00:00:00"),
    endDate: new Date("2026-04-07T00:00:00"),
  });
});
