import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { PremiumInlineLock } from "../src/components/billing/PremiumLocks.tsx";
import { getPaywallNavigationState } from "../src/lib/paywall-navigation.ts";
import { SmartReminderRows } from "../src/components/settings/SmartReminderRows.tsx";
import { HistoryRangeSelector } from "../src/components/history/HistoryRangeSelector.tsx";

afterEach(() => {
  cleanup();
});

function LocationStateProbe() {
  const location = useLocation();
  const state = location.state as { featureId?: string; returnTo?: string } | null;

  return React.createElement("div", {}, [
    React.createElement("p", { key: "pathname", "data-testid": "pathname" }, location.pathname),
    React.createElement("p", { key: "feature-id", "data-testid": "feature-id" }, state?.featureId ?? ""),
    React.createElement("p", { key: "return-to", "data-testid": "return-to" }, state?.returnTo ?? ""),
  ]);
}

test("PremiumInlineLock routes to unlock with feature context and return path", () => {
  render(
    React.createElement(MemoryRouter, { initialEntries: ["/history"] },
      React.createElement(Routes, {},
        React.createElement(Route, {
          path: "/history",
          element: React.createElement(PremiumInlineLock, {
            featureId: "fullHistory",
            title: "Last 7 days stay free",
          }),
        }),
        React.createElement(Route, {
          path: "/unlock",
          element: React.createElement(LocationStateProbe),
        }),
      ),
    ),
  );

  fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

  assert.equal(screen.getByTestId("pathname").textContent, "/unlock");
  assert.equal(screen.getByTestId("feature-id").textContent, "fullHistory");
  assert.equal(screen.getByTestId("return-to").textContent, "/history");
});

test("Paywall navigation state accepts only app return paths and known features", () => {
  assert.deepEqual(getPaywallNavigationState({ featureId: "doctorReports", returnTo: "/report" }), {
    featureId: "doctorReports",
    returnTo: "/report",
  });
  assert.deepEqual(getPaywallNavigationState({ featureId: "unknown", returnTo: "https://example.com" }), {
    featureId: null,
    returnTo: "/",
  });
  assert.deepEqual(getPaywallNavigationState({ featureId: "multiChild", returnTo: "/unlock" }), {
    featureId: "multiChild",
    returnTo: "/",
  });
});

test("HistoryRangeSelector disables premium ranges for free basic users", () => {
  const selected: number[] = [];

  render(React.createElement(HistoryRangeSelector, {
    value: 7,
    canUseFullHistory: false,
    onChange: (value) => selected.push(value),
  }));

  fireEvent.click(screen.getByRole("button", { name: "7d" }));
  fireEvent.click(screen.getByRole("button", { name: "14d requires Premium" }));
  fireEvent.click(screen.getByRole("button", { name: "30d requires Premium" }));

  assert.deepEqual(selected, [7]);
  assert.equal(screen.getByRole("button", { name: "14d requires Premium" }).hasAttribute("disabled"), true);
  assert.equal(screen.getByRole("button", { name: "30d requires Premium" }).hasAttribute("disabled"), true);
});

test("SmartReminderRows locks smart reminder switches for free basic users", () => {
  const toggled: string[] = [];

  render(React.createElement(SmartReminderRows, {
    canUseSmartReminders: false,
    loading: false,
    smartSettings: {
      noPoop: false,
      redFlagFollowUp: true,
      episodeCheckIn: false,
    },
    onSmartToggle: (key) => toggled.push(key),
  }));

  const noPoopSwitch = screen.getByRole("switch", { name: "Toggle No-poop threshold" });
  fireEvent.click(noPoopSwitch);

  assert.equal(noPoopSwitch.hasAttribute("disabled"), true);
  assert.deepEqual(toggled, []);
  assert.ok(screen.getAllByText("Premium reminders").length >= 1);
});
