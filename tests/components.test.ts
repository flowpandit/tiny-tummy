import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CompactChildNav } from "../src/components/layout/CompactChildNav.tsx";
import { LoggingFieldGroup, LoggingFormHeader, LoggingPresetNotice } from "../src/components/logging/logging-form-primitives.tsx";
import { NormalRangeIntro } from "../src/components/onboarding/NormalRangeIntro.tsx";
import { SleepRecentHistorySection } from "../src/components/sleep/SleepRecentHistorySection.tsx";
import { MilestoneRecentActivitySection } from "../src/components/milestones/MilestoneRecentActivitySection.tsx";
import type { Child } from "../src/lib/types.ts";

afterEach(() => {
  cleanup();
});

const activeChild: Child = {
  id: "child-1",
  name: "Mila",
  date_of_birth: "2026-01-01",
  sex: "female",
  feeding_type: "mixed",
  avatar_color: "#f6b26b",
  is_active: 1,
  created_at: "2026-04-14T00:00:00",
  updated_at: "2026-04-14T00:00:00",
};

const otherChild: Child = {
  ...activeChild,
  id: "child-2",
  name: "Noah",
};

const recentSleepLog = {
  id: "sleep-1",
  child_id: "child-1",
  sleep_type: "nap" as const,
  started_at: "2026-04-17T09:15:00",
  ended_at: "2026-04-17T10:00:00",
  notes: null,
  created_at: "2026-04-17T10:00:00",
};

const recentMilestone = {
  id: "milestone-1",
  child_id: "child-1",
  milestone_type: "started_solids" as const,
  logged_at: "2026-04-17T11:30:00",
  notes: "Tried mashed avocado for the first time.",
  created_at: "2026-04-17T11:30:00",
};

function renderAvatar(child: Child) {
  return React.createElement("span", { "data-testid": `avatar-${child.id}` }, child.name.charAt(0));
}

test("logging form primitives render their shared labels and messaging", () => {
  render(React.createElement("div", {}, [
    React.createElement(LoggingFormHeader, { key: "header", title: "Log poop", isNight: false }),
    React.createElement(LoggingFieldGroup, {
      key: "group",
      label: "When",
      isNight: false,
      children: React.createElement("input", { "aria-label": "Mock field" }),
    }),
    React.createElement(LoggingPresetNotice, {
      key: "notice",
      isNight: false,
      description: "Uses the saved diaper preset.",
    }),
  ]));

  assert.ok(screen.getByText("Log poop"));
  assert.ok(screen.getByText("When"));
  assert.ok(screen.getByLabelText("Mock field"));
  assert.ok(screen.getByText("Quick preset"));
  assert.ok(screen.getByText("Uses the saved diaper preset."));
});

test("CompactChildNav supports child switching and optional back navigation", () => {
  const calls: string[] = [];

  render(React.createElement(CompactChildNav, {
    activeChild,
    otherChildren: [otherChild],
    onSelectChild: (childId: string) => {
      calls.push(childId);
    },
    showBackButton: true,
    onBack: () => {
      calls.push("back");
    },
    renderAvatar,
    trailing: React.createElement("button", { type: "button", "aria-label": "Notifications" }, "Alerts"),
  }));

  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch to Noah" }));

  assert.ok(screen.getByText("Mila"));
  assert.ok(screen.getByRole("button", { name: "Notifications" }));
  assert.equal(screen.queryByText("5.2 kg"), null);
  assert.deepEqual(calls, ["back", "child-2"]);
});

test("NormalRangeIntro loads the normal-range copy and finishes onboarding", async () => {
  const calls: string[] = [];

  render(
    React.createElement(MemoryRouter, {},
      React.createElement(NormalRangeIntro, {
        child: activeChild,
        onFinish: async () => {
          calls.push("finish");
        },
        getChildStatusAction: async () => ["ok", "Around this age, bowel rhythm can vary a lot."],
        navigateAction: (to: string) => {
          calls.push(`navigate:${to}`);
        },
      }),
    ),
  );

  await waitFor(() => {
    assert.ok(screen.getByText("Around this age, bowel rhythm can vary a lot."));
  });

  fireEvent.click(screen.getByRole("button", { name: "Start Tracking" }));

  await waitFor(() => {
    assert.deepEqual(calls, ["finish", "navigate:/"]);
  });
});

test("SleepRecentHistorySection renders recent logs and forwards edit clicks", () => {
  const edited: string[] = [];

  render(
    React.createElement(MemoryRouter, {},
      React.createElement(SleepRecentHistorySection, {
        logs: [recentSleepLog],
        onEdit: (entry) => {
          edited.push(entry.id);
        },
      }),
    ),
  );

  assert.ok(screen.getByText("Recent history"));
  assert.ok(screen.getByText(/Nap, 45m/));
  fireEvent.click(screen.getByRole("button", { name: /Nap, 45m/i }));
  assert.deepEqual(edited, ["sleep-1"]);
});

test("MilestoneRecentActivitySection renders activity cards and empty add action", () => {
  const addCalls: string[] = [];

  const { rerender } = render(
    React.createElement(MemoryRouter, {},
      React.createElement(MilestoneRecentActivitySection, {
        logs: [recentMilestone],
        isLoading: false,
        onAddMilestone: () => {
          addCalls.push("add");
        },
      }),
    ),
  );

  assert.ok(screen.getByText("Recent activity"));
  assert.ok(screen.getByText("Started solids"));
  assert.ok(screen.getByText("Tried mashed avocado for the first time."));

  rerender(
    React.createElement(MemoryRouter, {},
      React.createElement(MilestoneRecentActivitySection, {
        logs: [],
        isLoading: false,
        onAddMilestone: () => {
          addCalls.push("add");
        },
      }),
    ),
  );

  fireEvent.click(screen.getByRole("button", { name: "Add first milestone" }));
  assert.deepEqual(addCalls, ["add"]);
});
