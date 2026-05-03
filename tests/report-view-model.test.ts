import test from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_OPTION_TOGGLES,
  buildReportPatientSummary,
  getDefaultReportDateRange,
  getReportDateRangeFromLatestActivity,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableData,
} from "../src/lib/report-view-model.ts";
import { formatLocalDateKey } from "../src/lib/utils.ts";
import type { Child } from "../src/lib/types.ts";

test("exposes the expected report option toggles", () => {
  assert.deepEqual(
    REPORT_OPTION_TOGGLES.map((toggle) => toggle.key),
    [
      "includeFeeds",
      "includeSymptoms",
      "includeMilestones",
      "includeEpisodes",
      "includeEpisodeSummary",
      "includeGrowth",
      "includeNotes",
    ],
  );
});

test("builds the default report date range from the provided reference date", () => {
  const range = getDefaultReportDateRange(new Date("2026-04-14T10:30:00"));
  assert.deepEqual(range, {
    today: "2026-04-14",
    thirtyDaysAgo: "2026-03-15",
  });
});

test("derives the report range from the latest activity day", () => {
  assert.deepEqual(
    getReportDateRangeFromLatestActivity("2026-04-14T09:45:00"),
    {
      startDate: "2026-03-16",
      endDate: "2026-04-14",
    },
  );
  assert.equal(getReportDateRangeFromLatestActivity(null), null);
});

test("detects whether report data has exportable clinical content", () => {
  assert.equal(hasReportableData(null), false);
  assert.equal(hasReportableData({
    logs: [],
    feedingLogs: [],
    growthLogs: [],
    symptomLogs: [],
    milestoneLogs: [],
    episodeGroups: [],
    timeline: [],
  } as never), false);
  assert.equal(hasReportableData({
    logs: [],
    feedingLogs: [{ id: "feed-1" }],
    growthLogs: [],
    symptomLogs: [],
    milestoneLogs: [],
    episodeGroups: [],
    timeline: [],
  } as never), true);
  assert.equal(hasReportableData({
    logs: [],
    feedingLogs: [],
    growthLogs: [],
    symptomLogs: [],
    milestoneLogs: [],
    episodeGroups: [],
    timeline: [{ id: "event-1" }],
  } as never), true);
});

test("uses platform-specific save labels and help text", () => {
  assert.equal(getReportSaveLabel(true), "Save PDF to Downloads");
  assert.equal(getReportSaveLabel(false), "Save PDF");
  assert.match(getReportSaveHelpText(true), /Downloads folder/);
  assert.match(getReportSaveHelpText(false), /choose where to save/i);
});

test("builds a patient summary with child identity and selected range", () => {
  const todayDob = formatLocalDateKey(new Date());
  const child: Child = {
    id: "child-1",
    name: "Mila",
    date_of_birth: todayDob,
    sex: "female",
    feeding_type: "mixed",
    avatar_color: "#fff2e2",
    is_active: 1,
    created_at: "2026-04-14T00:00:00",
    updated_at: "2026-04-14T00:00:00",
  };

  const summary = buildReportPatientSummary(child, "2026-03-16", "2026-04-14");
  assert.equal(summary.title, "Mila");
  assert.match(summary.subtitle, /^0 days old · 2026-03-16 to 2026-04-14$/);
  assert.match(summary.detail, /executive summary, clinical context, and a chronological appendix/i);
});
