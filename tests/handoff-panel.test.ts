import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, render, screen } from "@testing-library/react";
import { CaregiverHandoffPanel } from "../src/components/handoff/CaregiverHandoffPanel.tsx";
import { buildHandoffSummary } from "../src/lib/handoff-summary.ts";
import type { Child, FeedingEntry, PoopEntry } from "../src/lib/types.ts";

afterEach(() => {
  cleanup();
});

const child: Child = {
  id: "child-1",
  name: "Maya",
  date_of_birth: "2026-01-15",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#d45aa3",
  is_active: 1,
  created_at: "2026-01-15T00:00:00",
  updated_at: "2026-01-15T00:00:00",
};

const poop: PoopEntry = {
  id: "poop-1",
  child_id: child.id,
  logged_at: "2026-05-04T12:20:00",
  stool_type: 6,
  color: "red",
  size: "medium",
  is_no_poop: 0,
  notes: null,
  photo_path: null,
  created_at: "2026-05-04T12:20:00",
  updated_at: "2026-05-04T12:20:00",
  created_by_caregiver_id: "caregiver-mum",
};

const feed: FeedingEntry = {
  id: "feed-1",
  child_id: child.id,
  logged_at: "2026-05-04T14:43:00",
  food_type: "bottle",
  food_name: null,
  amount_ml: 120,
  duration_minutes: null,
  breast_side: null,
  bottle_content: "breast_milk",
  reaction_notes: null,
  is_constipation_support: 0,
  notes: null,
  created_at: "2026-05-04T14:43:00",
  updated_at: "2026-05-04T14:43:00",
  created_by_caregiver_id: "caregiver-dad",
};

function renderPanel(summary = buildHandoffSummary({
  child,
  dayKey: "2026-05-04",
  generatedAt: "2026-05-04T15:50:00",
  poopLogs: [poop],
  diaperLogs: [],
  feedingLogs: [feed],
  sleepLogs: [],
  alerts: [],
  activeEpisode: null,
  episodeEvents: [],
  symptomLogs: [],
  linkedCaregivers: [
    { id: "caregiver-mum", display_name: "Mum", deleted_at: null },
    { id: "caregiver-dad", display_name: "Dad", deleted_at: null },
  ],
  now: new Date("2026-05-04T15:50:00"),
})) {
  return render(React.createElement(CaregiverHandoffPanel, {
    summary,
    parentNote: "",
    canUseNativeShare: false,
    isCopying: false,
    isSharing: false,
    isGeneratingPdf: false,
    onParentNoteChange: () => {},
    onCopy: () => {},
    onShare: () => {},
    onGeneratePdf: () => {},
    onRefresh: () => {},
  }));
}

test("CaregiverHandoffPanel renders compact timeline attribution labels", () => {
  renderPanel();

  assert.ok(screen.getByText("Logged by Mum"));
  assert.ok(screen.getByText("Logged by Dad"));
  assert.ok(screen.getByText("Poop"));
  assert.equal(screen.getAllByText(/Bottle: Breast milk/).length >= 1, true);
});

test("CaregiverHandoffPanel keeps sparse handoff states readable without attribution", () => {
  const summary = buildHandoffSummary({
    child,
    dayKey: "2026-05-04",
    generatedAt: "2026-05-04T15:50:00",
    poopLogs: [],
    diaperLogs: [],
    feedingLogs: [],
    sleepLogs: [],
    alerts: [],
    activeEpisode: null,
    episodeEvents: [],
    symptomLogs: [],
    now: new Date("2026-05-04T15:50:00"),
  });

  renderPanel(summary);

  assert.ok(screen.getByText("No events logged yet."));
  assert.ok(screen.getAllByText("No log yet").length >= 1);
  assert.equal(screen.queryByText(/Logged by|Updated by/), null);
});
