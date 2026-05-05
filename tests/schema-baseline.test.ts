import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const rootDir = process.cwd();
const migrationDir = join(rootDir, "src-tauri", "migrations");
const baselinePath = join(migrationDir, "001_baseline.sql");
const baselineSql = readFileSync(baselinePath, "utf8");
const hasSqlite3 = (() => {
  try {
    execFileSync("sqlite3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function getTableSql(tableName: string): string {
  const match = baselineSql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\([\\s\\S]*?\\n\\);`));
  assert.ok(match, `expected ${tableName} table in baseline schema`);
  return match[0];
}

function assertColumns(tableName: string, columns: string[]): void {
  const tableSql = getTableSql(tableName);
  for (const column of columns) {
    assert.match(tableSql, new RegExp(`\\b${column}\\b`), `expected ${tableName}.${column}`);
  }
}

test("SQLite migrations are consolidated to a single baseline file", () => {
  assert.deepEqual(
    readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort(),
    ["001_baseline.sql"],
  );
});

test("baseline preserves current feature tables", () => {
  [
    "children",
    "caregivers",
    "child_caregivers",
    "poop_logs",
    "diaper_logs",
    "diet_logs",
    "sleep_logs",
    "symptom_logs",
    "episodes",
    "episode_events",
    "growth_logs",
    "milestone_logs",
    "quick_presets",
    "alerts",
    "attachments",
    "sync_outbox",
    "app_settings",
  ].forEach(getTableSql);
});

test("syncable child-owned tables have standard local-first metadata", () => {
  const syncableTables = [
    "children",
    "caregivers",
    "child_caregivers",
    "poop_logs",
    "diaper_logs",
    "diet_logs",
    "sleep_logs",
    "symptom_logs",
    "episodes",
    "episode_events",
    "growth_logs",
    "milestone_logs",
    "quick_presets",
    "alerts",
  ];

  for (const table of syncableTables) {
    assertColumns(table, [
      "id",
      "created_at",
      "updated_at",
      "deleted_at",
      "device_id",
      "sync_status",
      "sync_version",
      "local_only",
    ]);
  }
});

test("baseline keeps local-only attachment metadata separate from log rows", () => {
  assertColumns("attachments", [
    "owner_table",
    "owner_id",
    "child_id",
    "local_path",
    "mime_type",
    "file_size",
    "local_only",
    "attachment_sync_policy",
  ]);
  assert.match(getTableSql("attachments"), /DEFAULT 'local_only'/);
  assert.match(getTableSql("poop_logs"), /\bphoto_path\b/);
  assert.match(getTableSql("diaper_logs"), /\bphoto_path\b/);
});

test("baseline includes a local-only sync outbox for future optional sync", () => {
  assertColumns("sync_outbox", [
    "entity_table",
    "entity_id",
    "child_id",
    "operation",
    "payload_json",
    "attempted_at",
    "processed_at",
    "status",
    "retry_count",
    "error_message",
    "device_id",
    "local_only",
  ]);
  assert.match(getTableSql("sync_outbox"), /DEFAULT 'pending'/);
  assert.match(baselineSql, /idx_sync_outbox_status/);
  assert.match(baselineSql, /idx_sync_outbox_entity/);
  assert.match(baselineSql, /idx_sync_outbox_processed_at/);
});


test("log tables are ready for local caregiver attribution", () => {
  [
    "poop_logs",
    "diaper_logs",
    "diet_logs",
    "sleep_logs",
    "symptom_logs",
    "episodes",
    "episode_events",
    "growth_logs",
    "milestone_logs",
  ].forEach((table) => {
    assertColumns(table, ["created_by_caregiver_id", "updated_by_caregiver_id"]);
  });
});

test("baseline stores generated timestamps as UTC ISO strings with a timezone marker", () => {
  assert.equal(baselineSql.includes("datetime('now')"), false);
  assert.match(baselineSql, /strftime\('%Y-%m-%dT%H:%M:%fZ', 'now'\)/);
});

test("fresh baseline database supports current logging and soft-delete-ready reads", { skip: !hasSqlite3 }, () => {
  const tempDir = mkdtempSync(join(tmpdir(), "tiny-tummy-schema-"));
  const dbPath = join(tempDir, "tinytummy.db");

  try {
    const output = execFileSync("sqlite3", ["-batch", "-noheader", dbPath], {
      encoding: "utf8",
      input: `${baselineSql}
PRAGMA foreign_keys = ON;

INSERT INTO children (id, name, date_of_birth, feeding_type)
VALUES ('child-1', 'Tiny', '2026-04-01', 'breast');

INSERT INTO caregivers (id, display_name, role, relationship, is_primary)
VALUES ('caregiver-1', 'Primary caregiver', 'parent', 'parent', 1);

INSERT INTO child_caregivers (id, child_id, caregiver_id, relationship_to_child, permissions)
VALUES ('child-caregiver-1', 'child-1', 'caregiver-1', 'parent', '{"logs":"write"}');

INSERT INTO poop_logs (id, child_id, logged_at, stool_type, color, size, is_no_poop, notes, photo_path, created_by_caregiver_id)
VALUES ('poop-1', 'child-1', '2026-05-03T09:00:00.000Z', 4, 'brown', 'medium', 0, 'normal', 'photos/poop-1.jpg', 'caregiver-1');

INSERT INTO poop_logs (id, child_id, logged_at, is_no_poop, deleted_at)
VALUES ('poop-deleted', 'child-1', '2026-05-03T08:00:00.000Z', 1, '2026-05-03T08:05:00.000Z');

INSERT INTO diaper_logs (id, child_id, logged_at, diaper_type, urine_color, stool_type, color, size, notes, photo_path, linked_poop_log_id)
VALUES ('diaper-1', 'child-1', '2026-05-03T09:00:00.000Z', 'mixed', 'normal', 4, 'brown', 'medium', 'mixed diaper', 'photos/diaper-1.jpg', 'poop-1');

INSERT INTO diet_logs (id, child_id, logged_at, food_type, amount_ml, duration_minutes, breast_side, bottle_content, notes)
VALUES ('feed-1', 'child-1', '2026-05-03T10:00:00.000Z', 'breast_milk', NULL, 18, 'left', NULL, 'timed feed');

INSERT INTO sleep_logs (id, child_id, sleep_type, started_at, ended_at, notes)
VALUES ('sleep-1', 'child-1', 'nap', '2026-05-03T11:00:00.000Z', '2026-05-03T12:00:00.000Z', 'nap');

INSERT INTO episodes (id, child_id, episode_type, status, started_at, summary)
VALUES ('episode-1', 'child-1', 'constipation', 'active', '2026-05-03T07:00:00.000Z', 'watching tummy');

INSERT INTO symptom_logs (id, child_id, episode_id, symptom_type, severity, temperature_c, temperature_method, logged_at, notes, created_by_caregiver_id)
VALUES ('symptom-1', 'child-1', 'episode-1', 'straining', 'mild', NULL, NULL, '2026-05-03T07:30:00.000Z', 'a little strain', 'caregiver-1');

INSERT INTO episode_events (id, episode_id, child_id, event_type, title, notes, logged_at, source_kind, source_id)
VALUES ('event-1', 'episode-1', 'child-1', 'symptom', 'Straining', 'linked symptom', '2026-05-03T07:30:00.000Z', 'symptom', 'symptom-1');

INSERT INTO growth_logs (id, child_id, measured_at, weight_kg, height_cm, head_circumference_cm, notes)
VALUES ('growth-1', 'child-1', '2026-05-03T12:30:00.000Z', 5.2, 58, 39, 'checkup');

INSERT INTO milestone_logs (id, child_id, milestone_type, logged_at, notes)
VALUES ('milestone-1', 'child-1', 'started_solids', '2026-05-03T13:00:00.000Z', 'tiny taste');

INSERT INTO quick_presets (id, child_id, kind, label, draft_json, sort_order)
VALUES ('preset-1', 'child-1', 'poop', 'Normal poop', '{}', 0);

INSERT INTO alerts (id, child_id, alert_type, severity, title, message, triggered_at, related_log_id)
VALUES ('alert-1', 'child-1', 'red_flag_color', 'warning', 'Watch color', 'Follow up', '2026-05-03T09:05:00.000Z', 'poop-1');

INSERT INTO attachments (id, owner_table, owner_id, child_id, local_path, mime_type, file_size)
VALUES ('attachment-1', 'poop_logs', 'poop-1', 'child-1', 'photos/poop-1.jpg', 'image/jpeg', 1234);

SELECT 'active_poops=' || COUNT(*) FROM poop_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'linked_diapers=' || COUNT(*) FROM diaper_logs WHERE linked_poop_log_id = 'poop-1' AND deleted_at IS NULL;
SELECT 'feeds=' || COUNT(*) FROM diet_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'sleep=' || COUNT(*) FROM sleep_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'symptoms=' || COUNT(*) FROM symptom_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'episodes=' || COUNT(*) FROM episodes WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'events=' || COUNT(*) FROM episode_events WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'growth=' || COUNT(*) FROM growth_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'milestones=' || COUNT(*) FROM milestone_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'presets=' || COUNT(*) FROM quick_presets WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'alerts=' || COUNT(*) FROM alerts WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'attachment_policy=' || attachment_sync_policy || ':' || local_only FROM attachments WHERE id = 'attachment-1';
SELECT 'child_timestamp_has_z=' || (created_at LIKE '%Z') FROM children WHERE id = 'child-1';
`,
    }).trim().split("\n");

    assert.deepEqual(output, [
      "active_poops=1",
      "linked_diapers=1",
      "feeds=1",
      "sleep=1",
      "symptoms=1",
      "episodes=1",
      "events=1",
      "growth=1",
      "milestones=1",
      "presets=1",
      "alerts=1",
      "attachment_policy=local_only:1",
      "child_timestamp_has_z=1",
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
