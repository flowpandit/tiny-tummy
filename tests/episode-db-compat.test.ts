import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { buildEpisodeEventInsertPlan } from "../src/lib/db/episodes";

const rootDir = process.cwd();

test("episode event inserts omit source columns when the local table has not migrated yet", () => {
  const input = {
    episode_id: "episode-1",
    child_id: "child-1",
    event_type: "progress",
    title: "Doing better",
    notes: "More comfortable after nap",
    logged_at: "2026-05-03T10:00:00.000Z",
    source_kind: "symptom",
    source_id: "symptom-1",
  };

  const plan = buildEpisodeEventInsertPlan(input, "event-1", "2026-05-03T10:01:00.000Z", false);

  assert.equal(plan.params.length, 8);
  assert.equal(plan.storedSourceKind, null);
  assert.equal(plan.storedSourceId, null);
  assert.equal(plan.sql.includes("source_kind"), false);
  assert.equal(plan.sql.includes("source_id"), false);
});

test("episode event inserts include source columns after migration 12 is available", () => {
  const input = {
    episode_id: "episode-1",
    child_id: "child-1",
    event_type: "symptom",
    title: "Fever",
    notes: null,
    logged_at: "2026-05-03T10:00:00.000Z",
    source_kind: "symptom",
    source_id: "symptom-1",
  };

  const plan = buildEpisodeEventInsertPlan(input, "event-1", "2026-05-03T10:01:00.000Z", true);

  assert.equal(plan.params.length, 10);
  assert.equal(plan.storedSourceKind, "symptom");
  assert.equal(plan.storedSourceId, "symptom-1");
  assert.equal(plan.sql.includes("source_kind"), true);
  assert.equal(plan.sql.includes("source_id"), true);
});

test("every Tauri SQL migration file is registered", () => {
  const migrationDir = join(rootDir, "src-tauri", "migrations");
  const libRs = readFileSync(join(rootDir, "src-tauri", "src", "lib.rs"), "utf8");
  const migrationFiles = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const version = Number(file.slice(0, 3));
    assert.match(libRs, new RegExp(`version:\\s*${version},`), `migration ${version} is registered`);
    assert.equal(libRs.includes(`include_str!("../migrations/${basename(file)}")`), true);
  }
});
