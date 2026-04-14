import test from "node:test";
import assert from "node:assert/strict";
import { getRelativeDayLabel } from "../src/lib/date-labels.ts";
import { formatLocalDateKey } from "../src/lib/utils.ts";

test("labels today and yesterday relative to the local day", () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  assert.equal(getRelativeDayLabel(formatLocalDateKey(now)), "Today");
  assert.equal(getRelativeDayLabel(formatLocalDateKey(yesterday)), "Yesterday");
});

test("labels older recent days as N days ago", () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  assert.equal(getRelativeDayLabel(formatLocalDateKey(threeDaysAgo)), "3 days ago");
});

test("falls back to a calendar label for future dates", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  assert.equal(
    getRelativeDayLabel(formatLocalDateKey(tomorrow)),
    tomorrow.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  );
});
