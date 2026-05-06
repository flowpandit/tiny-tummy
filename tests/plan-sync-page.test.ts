import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlanSyncPageContent } from "../src/pages/PlanSync.tsx";

afterEach(() => {
  cleanup();
});

test("PlanSyncPageContent renders Free, Lifetime Private, and Family Sync plan states", () => {
  render(React.createElement(PlanSyncPageContent));

  assert.ok(screen.getByRole("heading", { name: "Choose how Tiny Tummy works for your family" }));
  assert.ok(screen.getAllByRole("heading", { name: "Free" }).length >= 1);
  assert.ok(screen.getAllByRole("heading", { name: "Lifetime Private" }).length >= 1);
  assert.ok(screen.getAllByRole("heading", { name: "Family Sync" }).length >= 1);
  assert.ok(screen.getByText("$0"));
  assert.ok(screen.getByText("$14.99 once"));
  assert.ok(screen.getAllByText("Coming later").length >= 1);
  assert.ok(screen.getByText("Recommended"));
});

test("PlanSyncPageContent makes Lifetime the payment trigger and keeps sync unavailable", () => {
  let unlockCalls = 0;

  render(React.createElement(PlanSyncPageContent, {
    onUnlockLifetime: () => {
      unlockCalls += 1;
    },
  }));

  fireEvent.click(screen.getByRole("button", { name: "Coming later" }));
  assert.equal(unlockCalls, 0);

  fireEvent.click(screen.getByRole("button", { name: "Unlock privately" }));
  assert.equal(unlockCalls, 1);
});

test("PlanSyncPageContent explains access and privacy outcomes", () => {
  render(React.createElement(PlanSyncPageContent));

  assert.ok(screen.getByText("Free is the private preview experience. Lifetime Private unlocks the full local app. Family Sync is not available yet."));
  assert.ok(screen.getByText("No purchase needed"));
  assert.ok(screen.getByText("One-time purchase"));
  assert.ok(screen.getByText("Will be separate from Lifetime Private."));
  assert.ok(screen.getByText("Free and Lifetime Private work without an account."));
  assert.ok(screen.getByText("Lifetime Private is a one-time purchase."));
  assert.ok(screen.getByText("Family Sync is optional and coming later."));
  assert.ok(screen.getByText("Photos are not synced by default."));
  assert.ok(screen.getByText("Your local data stays on this device unless you choose to export it."));
});

test("PlanSyncPageContent disables the Lifetime CTA when already unlocked", () => {
  let unlockCalls = 0;

  render(React.createElement(PlanSyncPageContent, {
    isLifetimeUnlocked: true,
    onUnlockLifetime: () => {
      unlockCalls += 1;
    },
  }));

  const unlockedButton = screen.getByRole("button", { name: "Unlocked" });
  assert.equal(unlockedButton.hasAttribute("disabled"), true);
  fireEvent.click(unlockedButton);
  assert.equal(unlockCalls, 0);
});
