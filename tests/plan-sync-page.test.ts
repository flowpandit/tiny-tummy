import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import "./test-dom.ts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlanSyncPageContent } from "../src/pages/PlanSync.tsx";

afterEach(() => {
  cleanup();
});

test("PlanSyncPageContent renders Free, Lifetime Private, and Family Sync pricing", () => {
  render(React.createElement(PlanSyncPageContent));

  assert.ok(screen.getByRole("heading", { name: "Choose how Tiny Tummy works for your family" }));
  assert.ok(screen.getAllByRole("heading", { name: "Free" }).length >= 1);
  assert.ok(screen.getAllByRole("heading", { name: "Lifetime Private" }).length >= 1);
  assert.ok(screen.getAllByRole("heading", { name: "Family Sync" }).length >= 1);
  assert.ok(screen.getByText("$0"));
  assert.ok(screen.getByText("$14.99 once"));
  assert.ok(screen.getByText("$2.99/mo or $24.99/yr"));
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

test("PlanSyncPageContent explains cancellation and privacy outcomes", () => {
  render(React.createElement(PlanSyncPageContent));

  assert.ok(screen.getByText("Returns to Free limits if cancelled. Local data stays on device."));
  assert.ok(screen.getByText("Keeps Lifetime if cancelled. Only sync turns off."));
  assert.ok(screen.getByText("Tiny Tummy works privately without Family Sync."));
  assert.ok(screen.getByText("Family Sync is optional."));
  assert.ok(screen.getByText("Photos are not synced by default."));
  assert.ok(screen.getByText("If you cancel Family Sync, your local data stays on your device."));
  assert.ok(screen.getByText("If you already own Lifetime Private, cancelling Family Sync does not remove your Lifetime features."));
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
