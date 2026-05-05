import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSoftDeleteSql,
  CHILD_SCOPED_SOFT_DELETE_TABLES,
  executeMutation,
  withTransaction,
  type SoftDeleteTable,
} from "../src/lib/db/mutations.ts";

const rootDir = process.cwd();
const baselineSql = readFileSync(join(rootDir, "src-tauri", "migrations", "001_baseline.sql"), "utf8");
const hasSqlite3 = (() => {
  try {
    execFileSync("sqlite3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function sqlQuote(value: unknown): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, params: unknown[]): string {
  let index = 0;
  return sql.replace(/\?/g, () => sqlQuote(params[index++]));
}

function softDeleteStatement(
  table: SoftDeleteTable,
  whereClause: string,
  whereParams: unknown[],
  deletedAt: string,
  options?: { includeChildDeactivation?: boolean },
): string {
  return `${bindSql(buildSoftDeleteSql(table, whereClause, options), [deletedAt, deletedAt, ...whereParams])};`;
}

function runSql(dbPath: string, sql: string): string[] {
  return execFileSync("sqlite3", ["-batch", "-noheader", dbPath], {
    encoding: "utf8",
    input: sql,
  }).trim().split("\n").filter(Boolean);
}

function createTempDb(): { dbPath: string; cleanup: () => void } {
  const tempDir = mkdtempSync(join(tmpdir(), "tiny-tummy-soft-delete-"));
  return {
    dbPath: join(tempDir, "tinytummy.db"),
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}

test("soft delete SQL hides poop and diaper logs while preserving sync metadata", { skip: !hasSqlite3 }, () => {
  const { dbPath, cleanup } = createTempDb();
  const deletedAt = "2026-05-05T10:00:00.000Z";

  try {
    const output = runSql(dbPath, `${baselineSql}
PRAGMA foreign_keys = ON;

INSERT INTO children (id, name, date_of_birth, feeding_type)
VALUES ('child-1', 'Tiny', '2026-04-01', 'mixed');

INSERT INTO poop_logs (id, child_id, logged_at, stool_type, color, size, is_no_poop, updated_at)
VALUES ('poop-delete', 'child-1', '2026-05-05T08:00:00.000Z', 4, 'brown', 'medium', 0, '2026-05-05T08:01:00.000Z');

INSERT INTO diaper_logs (id, child_id, logged_at, diaper_type, stool_type, color, size, linked_poop_log_id, updated_at)
VALUES ('diaper-delete', 'child-1', '2026-05-05T08:00:00.000Z', 'mixed', 4, 'brown', 'medium', 'poop-delete', '2026-05-05T08:01:00.000Z');

${softDeleteStatement("poop_logs", "id = ?", ["poop-delete"], deletedAt)}
${softDeleteStatement("diaper_logs", "id = ?", ["diaper-delete"], deletedAt)}

SELECT 'active_poops=' || COUNT(*) FROM poop_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'active_diapers=' || COUNT(*) FROM diaper_logs WHERE child_id = 'child-1' AND deleted_at IS NULL;
SELECT 'poop_preserved=' || COUNT(*) FROM poop_logs
  WHERE id = 'poop-delete' AND deleted_at = '${deletedAt}' AND updated_at = '${deletedAt}' AND sync_version = 2 AND sync_status = 'local';
SELECT 'diaper_preserved=' || COUNT(*) FROM diaper_logs
  WHERE id = 'diaper-delete' AND deleted_at = '${deletedAt}' AND updated_at = '${deletedAt}' AND sync_version = 2 AND sync_status = 'local';
SELECT 'report_source_deleted=' || (
  SELECT COUNT(*) FROM (
    SELECT id FROM poop_logs WHERE child_id = 'child-1' AND deleted_at IS NULL AND logged_at >= '2026-05-05T00:00:00.000Z'
    UNION ALL
    SELECT id FROM diaper_logs WHERE child_id = 'child-1' AND deleted_at IS NULL AND logged_at >= '2026-05-05T00:00:00.000Z'
  )
);
SELECT 'history_today_deleted=' || (
  SELECT COUNT(*) FROM (
    SELECT id FROM poop_logs WHERE child_id = 'child-1' AND deleted_at IS NULL
    UNION ALL
    SELECT id FROM diaper_logs WHERE child_id = 'child-1' AND deleted_at IS NULL
  )
);
SELECT 'export_preserved=' || (
  (SELECT COUNT(*) FROM poop_logs WHERE id = 'poop-delete') +
  (SELECT COUNT(*) FROM diaper_logs WHERE id = 'diaper-delete')
);
`);

    assert.deepEqual(output, [
      "active_poops=0",
      "active_diapers=0",
      "poop_preserved=1",
      "diaper_preserved=1",
      "report_source_deleted=0",
      "history_today_deleted=0",
      "export_preserved=2",
    ]);
  } finally {
    cleanup();
  }
});

test("child deletion soft deletes child-scoped rows instead of cascading hard deletes", { skip: !hasSqlite3 }, () => {
  const { dbPath, cleanup } = createTempDb();
  const deletedAt = "2026-05-05T11:00:00.000Z";
  const childScopedSoftDeletes = CHILD_SCOPED_SOFT_DELETE_TABLES
    .map((table) => softDeleteStatement(table, "child_id = ?", ["child-delete"], deletedAt))
    .join("\n");

  try {
    const output = runSql(dbPath, `${baselineSql}
PRAGMA foreign_keys = ON;

INSERT INTO children (id, name, date_of_birth, feeding_type)
VALUES ('child-delete', 'Tiny', '2026-04-01', 'mixed');
INSERT INTO caregivers (id, display_name, role, relationship, is_primary)
VALUES ('caregiver-1', 'Primary', 'parent', 'parent', 1);
INSERT INTO child_caregivers (id, child_id, caregiver_id, relationship_to_child, permissions)
VALUES ('child-caregiver-1', 'child-delete', 'caregiver-1', 'parent', '{}');
INSERT INTO poop_logs (id, child_id, logged_at, is_no_poop)
VALUES ('poop-child', 'child-delete', '2026-05-05T08:00:00.000Z', 0);
INSERT INTO diaper_logs (id, child_id, logged_at, diaper_type, linked_poop_log_id)
VALUES ('diaper-child', 'child-delete', '2026-05-05T08:00:00.000Z', 'dirty', 'poop-child');
INSERT INTO diet_logs (id, child_id, logged_at, food_type)
VALUES ('feed-child', 'child-delete', '2026-05-05T09:00:00.000Z', 'breast_milk');
INSERT INTO sleep_logs (id, child_id, sleep_type, started_at, ended_at)
VALUES ('sleep-child', 'child-delete', 'nap', '2026-05-05T10:00:00.000Z', '2026-05-05T11:00:00.000Z');
INSERT INTO episodes (id, child_id, episode_type, status, started_at)
VALUES ('episode-child', 'child-delete', 'constipation', 'active', '2026-05-05T07:00:00.000Z');
INSERT INTO symptom_logs (id, child_id, episode_id, symptom_type, severity, logged_at)
VALUES ('symptom-child', 'child-delete', 'episode-child', 'straining', 'mild', '2026-05-05T07:30:00.000Z');
INSERT INTO episode_events (id, episode_id, child_id, event_type, title, logged_at)
VALUES ('event-child', 'episode-child', 'child-delete', 'symptom', 'Straining', '2026-05-05T07:30:00.000Z');
INSERT INTO growth_logs (id, child_id, measured_at)
VALUES ('growth-child', 'child-delete', '2026-05-05T12:00:00.000Z');
INSERT INTO milestone_logs (id, child_id, milestone_type, logged_at)
VALUES ('milestone-child', 'child-delete', 'started_solids', '2026-05-05T13:00:00.000Z');
INSERT INTO quick_presets (id, child_id, kind, label, draft_json)
VALUES ('preset-child', 'child-delete', 'poop', 'Usual', '{}');
INSERT INTO alerts (id, child_id, alert_type, severity, title, message, triggered_at, related_log_id)
VALUES ('alert-child', 'child-delete', 'red_flag_color', 'warning', 'Watch', 'Follow up', '2026-05-05T08:05:00.000Z', 'poop-child');
INSERT INTO attachments (id, owner_table, owner_id, child_id, local_path, mime_type, file_size)
VALUES ('attachment-child', 'poop_logs', 'poop-child', 'child-delete', 'photos/poop-child.jpg', 'image/jpeg', 1234);

${childScopedSoftDeletes}
${softDeleteStatement("children", "id = ?", ["child-delete"], deletedAt, { includeChildDeactivation: true })}

SELECT 'active_child_scope=' || (
  (SELECT COUNT(*) FROM children WHERE id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM child_caregivers WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM poop_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM diaper_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM diet_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM sleep_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM symptom_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM episodes WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM episode_events WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM growth_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM milestone_logs WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM quick_presets WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM alerts WHERE child_id = 'child-delete' AND deleted_at IS NULL) +
  (SELECT COUNT(*) FROM attachments WHERE child_id = 'child-delete' AND deleted_at IS NULL)
);
SELECT 'deleted_child_scope=' || (
  (SELECT COUNT(*) FROM children WHERE id = 'child-delete' AND deleted_at = '${deletedAt}' AND is_active = 0) +
  (SELECT COUNT(*) FROM child_caregivers WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM poop_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM diaper_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM diet_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM sleep_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM symptom_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM episodes WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM episode_events WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM growth_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM milestone_logs WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM quick_presets WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM alerts WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}') +
  (SELECT COUNT(*) FROM attachments WHERE child_id = 'child-delete' AND deleted_at = '${deletedAt}')
);
SELECT 'sync_versions_incremented=' || (
  (SELECT COUNT(*) FROM children WHERE id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM child_caregivers WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM poop_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM diaper_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM diet_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM sleep_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM symptom_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM episodes WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM episode_events WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM growth_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM milestone_logs WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM quick_presets WHERE child_id = 'child-delete' AND sync_version = 2) +
  (SELECT COUNT(*) FROM alerts WHERE child_id = 'child-delete' AND sync_version = 2)
);
`);

    assert.deepEqual(output, [
      "active_child_scope=0",
      "deleted_child_scope=14",
      "sync_versions_incremented=13",
    ]);
  } finally {
    cleanup();
  }
});

test("mixed diaper linked poop creation is atomic at the SQLite transaction boundary", { skip: !hasSqlite3 }, () => {
  const { dbPath, cleanup } = createTempDb();

  try {
    runSql(dbPath, `${baselineSql}
PRAGMA foreign_keys = ON;
INSERT INTO children (id, name, date_of_birth, feeding_type)
VALUES ('child-1', 'Tiny', '2026-04-01', 'mixed');
`);

    assert.throws(() => {
      execFileSync("sqlite3", ["-batch", "-bail", dbPath], {
        encoding: "utf8",
        input: `PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO poop_logs (id, child_id, logged_at, is_no_poop)
VALUES ('poop-mixed', 'child-1', '2026-05-05T08:00:00.000Z', 0);
INSERT INTO diaper_logs (id, child_id, logged_at, diaper_type, linked_poop_log_id)
VALUES ('diaper-mixed', 'missing-child', '2026-05-05T08:00:00.000Z', 'mixed', 'poop-mixed');
COMMIT;
`,
        stdio: ["pipe", "pipe", "ignore"],
      });
    });

    assert.deepEqual(runSql(dbPath, `
SELECT 'poops=' || COUNT(*) FROM poop_logs WHERE id = 'poop-mixed';
SELECT 'diapers=' || COUNT(*) FROM diaper_logs WHERE id = 'diaper-mixed';
`), ["poops=0", "diapers=0"]);
  } finally {
    cleanup();
  }
});

test("dirty diaper linked poop creation is atomic at the SQLite transaction boundary", { skip: !hasSqlite3 }, () => {
  const { dbPath, cleanup } = createTempDb();

  try {
    runSql(dbPath, `${baselineSql}
PRAGMA foreign_keys = ON;
INSERT INTO children (id, name, date_of_birth, feeding_type)
VALUES ('child-1', 'Tiny', '2026-04-01', 'mixed');
`);

    assert.throws(() => {
      execFileSync("sqlite3", ["-batch", "-bail", dbPath], {
        encoding: "utf8",
        input: `PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
INSERT INTO poop_logs (id, child_id, logged_at, is_no_poop)
VALUES ('poop-dirty', 'child-1', '2026-05-05T08:00:00.000Z', 0);
INSERT INTO diaper_logs (id, child_id, logged_at, diaper_type, linked_poop_log_id)
VALUES ('diaper-dirty', 'missing-child', '2026-05-05T08:00:00.000Z', 'dirty', 'poop-dirty');
COMMIT;
`,
        stdio: ["pipe", "pipe", "ignore"],
      });
    });

    assert.deepEqual(runSql(dbPath, `
SELECT 'poops=' || COUNT(*) FROM poop_logs WHERE id = 'poop-dirty';
SELECT 'diapers=' || COUNT(*) FROM diaper_logs WHERE id = 'diaper-dirty';
`), ["poops=0", "diapers=0"]);
  } finally {
    cleanup();
  }
});

test("withTransaction commits successful multi-row work and rolls back failures", async () => {
  const successfulStatements: string[] = [];
  await withTransaction({
    execute: async (query) => {
      successfulStatements.push(query);
    },
  }, async () => {
    await executeMutation({ execute: async () => {} }, "insert poop");
    await executeMutation({ execute: async () => {} }, "insert diaper");
  });

  assert.deepEqual(successfulStatements, [
    "BEGIN IMMEDIATE",
    "insert poop",
    "insert diaper",
    "COMMIT",
  ]);

  const failedStatements: string[] = [];
  await assert.rejects(
    withTransaction({
      execute: async (query) => {
        failedStatements.push(query);
        if (query === "insert diaper") {
          throw new Error("diaper insert failed");
        }
      },
    }, async () => {
      await executeMutation({ execute: async () => {} }, "insert poop");
      await executeMutation({ execute: async () => {} }, "insert diaper");
    }),
    /diaper insert failed/,
  );

  assert.deepEqual(failedStatements, [
    "BEGIN IMMEDIATE",
    "insert poop",
    "insert diaper",
    "ROLLBACK",
  ]);
});
