import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSettingsAccessCopy } from "../src/lib/access-plan-copy.ts";

test("settings access copy uses Free and Lifetime Private without trial days", () => {
  const freeCopy = getSettingsAccessCopy("free");
  const lifetimeCopy = getSettingsAccessCopy("premium");
  const combined = `${freeCopy.title} ${freeCopy.detail} ${lifetimeCopy.title} ${lifetimeCopy.detail}`;

  assert.equal(freeCopy.title, "Free plan");
  assert.equal(lifetimeCopy.title, "Lifetime Private unlocked");
  assert.doesNotMatch(combined, /trial|days remaining|days left/i);
});

test("developer legacy trial controls stay dev-only and marked deprecated", () => {
  const source = readFileSync(
    new URL("../src/components/settings/SettingsSections.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /if \(!import\.meta\.env\.DEV\)/);
  assert.match(source, /Legacy trial tools only write deprecated local keys/);
  assert.match(source, /They no longer unlock Lifetime Private features/);
});
