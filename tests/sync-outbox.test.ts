import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setDbConnectionForTests } from "../src/lib/db/connection.ts";
import {
  clearProcessedBefore,
  createCaregiver,
  createDiaperLog,
  createEpisode,
  createPoopLog,
  deleteChildCaregiverLink,
  deletePoopLog,
  enqueueChange,
  enqueueChanges,
  linkCaregiverToChild,
  listPendingChanges,
  markFailed,
  markIgnored,
  markProcessed,
  markProcessing,
  summarizeOutbox,
  updatePoopLog,
  type SyncOutboxRow,
} from "../src/lib/db.ts";
import { createLocalRepositories } from "../src/lib/repositories/index.ts";

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
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, params: unknown[] = []): string {
  let index = 0;
  return sql.replace(/\?/g, () => sqlQuote(params[index++]));
}

function statement(sql: string): string {
  return sql.trim().replace(/;+\s*$/, "");
}

class TestSqliteDb {
  readonly tempDir = mkdtempSync(join(tmpdir(), "tiny-tummy-outbox-"));
  readonly dbPath = join(this.tempDir, "tinytummy.db");
  transactionStatements: string[] | null = null;
  failWhen: ((query: string, bindValues: unknown[]) => boolean) | null = null;

  constructor() {
    execFileSync("sqlite3", ["-batch", "-bail", this.dbPath], {
      encoding: "utf8",
      input: `${baselineSql}\nPRAGMA foreign_keys = ON;`,
    });
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    const normalized = statement(query);
    const upper = normalized.toUpperCase();

    if (upper === "BEGIN IMMEDIATE") {
      this.transactionStatements = [];
      return {};
    }

    if (upper === "ROLLBACK") {
      this.transactionStatements = null;
      return {};
    }

    if (upper === "COMMIT") {
      const statements = this.transactionStatements ?? [];
      this.transactionStatements = null;
      this.runSql(`PRAGMA foreign_keys = ON;\nBEGIN IMMEDIATE;\n${statements.join(";\n")};\nCOMMIT;`);
      return {};
    }

    if (this.failWhen?.(query, bindValues)) {
      throw new Error("Injected sqlite failure");
    }

    const bound = statement(bindSql(query, bindValues));
    if (this.transactionStatements) {
      this.transactionStatements.push(bound);
      return {};
    }

    this.runSql(`PRAGMA foreign_keys = ON;\n${bound};`);
    return {};
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    const output = execFileSync("sqlite3", ["-json", this.dbPath], {
      encoding: "utf8",
      input: `${bindSql(query, bindValues)};`,
    }).trim();
    return JSON.parse(output || "[]") as T;
  }

  runSql(sql: string): string {
    return execFileSync("sqlite3", ["-batch", "-bail", this.dbPath], {
      encoding: "utf8",
      input: sql,
    });
  }

  cleanup(): void {
    rmSync(this.tempDir, { recursive: true, force: true });
  }
}

async function withTestDb(action: (db: TestSqliteDb) => Promise<void>): Promise<void> {
  const db = new TestSqliteDb();
  setDbConnectionForTests(db as never);

  try {
    await action(db);
  } finally {
    setDbConnectionForTests(null);
    db.cleanup();
  }
}

async function seedChild(db: TestSqliteDb, id = "child-1"): Promise<void> {
  await db.execute(
    "INSERT INTO children (id, name, date_of_birth, feeding_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, "Tiny", "2026-04-01", "mixed", "2026-05-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z"],
  );
}

async function allOutboxRows(db: TestSqliteDb): Promise<SyncOutboxRow[]> {
  return db.select<SyncOutboxRow[]>("SELECT * FROM sync_outbox ORDER BY created_at ASC, rowid ASC");
}

test("poop log create, update, and soft delete enqueue outbox operations without photo paths", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);

    const poop = await createPoopLog({
      child_id: "child-1",
      logged_at: "2026-05-05T08:00:00.000Z",
      stool_type: 4,
      color: "brown",
      size: "medium",
      photo_path: "private/photos/poop.jpg",
    });
    await updatePoopLog(poop.id, { child_id: "child-1", notes: "Edited" });
    await deletePoopLog(poop.id);

    const outbox = await allOutboxRows(db);
    assert.deepEqual(outbox.map((row) => `${row.entity_table}:${row.operation}`), [
      "poop_logs:create",
      "poop_logs:update",
      "poop_logs:delete",
    ]);
    assert.equal(outbox.some((row) => row.payload_json?.includes("private/photos")), false);
    assert.equal(outbox.some((row) => row.payload_json?.includes("photo_path")), false);

    const rows = await db.select<Array<{ deleted_at: string | null; sync_status: string; sync_version: number }>>(
      "SELECT deleted_at, sync_status, sync_version FROM poop_logs WHERE id = ?",
      [poop.id],
    );
    assert.equal(rows[0]?.deleted_at !== null, true);
    assert.equal(rows[0]?.sync_status, "local");
    assert.equal(rows[0]?.sync_version, 3);
  });
});

test("mixed diaper creation enqueues linked poop and diaper changes transactionally", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);

    const diaper = await createDiaperLog({
      child_id: "child-1",
      logged_at: "2026-05-05T09:00:00.000Z",
      diaper_type: "mixed",
      stool_type: 5,
      color: "yellow",
      size: "large",
      photo_path: "private/photos/diaper.jpg",
    });

    const outbox = await allOutboxRows(db);
    assert.deepEqual(outbox.map((row) => `${row.entity_table}:${row.operation}`), [
      "poop_logs:create",
      "diaper_logs:create",
    ]);
    assert.equal(outbox.every((row) => row.status === "pending"), true);
    assert.equal(outbox.some((row) => row.payload_json?.includes("private/photos")), false);
    assert.ok(diaper.linked_poop_log_id);

    const linkedRows = await db.select<Array<{ poops: number; diapers: number }>>(
      `SELECT
        (SELECT COUNT(*) FROM poop_logs WHERE id = ?) AS poops,
        (SELECT COUNT(*) FROM diaper_logs WHERE linked_poop_log_id = ?) AS diapers`,
      [diaper.linked_poop_log_id, diaper.linked_poop_log_id],
    );
    assert.deepEqual(linkedRows[0], { poops: 1, diapers: 1 });
  });
});

test("mixed diaper creation rolls back entity and outbox rows when an outbox insert fails", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);
    db.failWhen = (query, bindValues) => query.includes("INSERT INTO sync_outbox") && bindValues[1] === "diaper_logs";

    await assert.rejects(
      createDiaperLog({
        child_id: "child-1",
        logged_at: "2026-05-05T09:00:00.000Z",
        diaper_type: "dirty",
        stool_type: 4,
      }),
      /Injected sqlite failure/,
    );

    const counts = await db.select<Array<{ poops: number; diapers: number; outbox: number }>>(
      `SELECT
        (SELECT COUNT(*) FROM poop_logs) AS poops,
        (SELECT COUNT(*) FROM diaper_logs) AS diapers,
        (SELECT COUNT(*) FROM sync_outbox) AS outbox`,
    );
    assert.deepEqual(counts[0], { poops: 0, diapers: 0, outbox: 0 });
  });
});

test("caregiver create, link, and unlink enqueue caregiver outbox operations", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);

    const caregiver = await createCaregiver({
      display_name: "Nana",
      role: "family",
      relationship: "grandparent",
      email: null,
      phone: null,
      avatar_color: "#7c3aed",
      is_primary: 0,
    });
    const link = await linkCaregiverToChild({
      childId: "child-1",
      caregiverId: caregiver.id,
      relationshipToChild: "grandparent",
    });
    await deleteChildCaregiverLink(link.id);

    const outbox = await allOutboxRows(db);
    assert.deepEqual(outbox.map((row) => `${row.entity_table}:${row.operation}`), [
      "caregivers:create",
      "child_caregivers:link",
      "child_caregivers:unlink",
    ]);
  });
});

test("saving a symptom with a generated episode event enqueues both changes", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);
    const episode = await createEpisode({
      child_id: "child-1",
      episode_type: "constipation",
      started_at: "2026-05-05T07:00:00.000Z",
    });
    await db.execute("DELETE FROM sync_outbox");

    const repositories = createLocalRepositories();
    const symptom = await repositories.care.saveSymptomWithEpisodeEvent({
      childId: "child-1",
      symptom: {
        child_id: "child-1",
        episode_id: episode.id,
        symptom_type: "straining",
        severity: "mild",
        logged_at: "2026-05-05T07:30:00.000Z",
      },
      episodeEvent: {
        episode_id: episode.id,
        event_type: "symptom",
        title: "Straining",
        logged_at: "2026-05-05T07:30:00.000Z",
        source_kind: "symptom",
      },
    });

    assert.ok(symptom?.id);
    const outbox = await allOutboxRows(db);
    assert.deepEqual(outbox.map((row) => `${row.entity_table}:${row.operation}`), [
      "symptom_logs:create",
      "episode_events:create",
    ]);
    assert.equal(outbox[1]?.payload_json?.includes(symptom.id), true);
  });
});

test("outbox listing, status transitions, failure, ignore, summary, and clearing work locally", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async (db) => {
    await seedChild(db);
    await enqueueChanges([
      { entity: "poop_log", entityId: "poop-1", childId: "child-1", operation: "create" },
      { entity: "diaper_log", entityId: "diaper-1", childId: "child-1", operation: "update" },
      { entity: "caregiver", entityId: "caregiver-1", operation: "create" },
    ]);

    const pendingForChild = await listPendingChanges({ childId: "child-1", limit: 10 });
    assert.deepEqual(pendingForChild.map((row) => row.entity_table), ["poop_logs", "diaper_logs"]);

    await markProcessing([pendingForChild[0].id]);
    await markProcessed([pendingForChild[0].id]);
    await markFailed(pendingForChild[1].id, new Error("offline"));

    const caregiverRow = (await listPendingChanges({ entity: "caregiver" }))[0];
    await markIgnored(caregiverRow.id, "local-only test");

    const summary = await summarizeOutbox();
    assert.equal(summary.processed, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.ignored, 1);

    await clearProcessedBefore("9999-01-01T00:00:00.000Z");
    const rows = await allOutboxRows(db);
    assert.deepEqual(rows.map((row) => row.status).sort(), ["failed", "ignored"]);
  });
});

test("outbox bookkeeping does not use network APIs", { skip: !hasSqlite3 }, async () => {
  await withTestDb(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network should not be used");
    }) as typeof fetch;

    try {
      await enqueueChange({
        entity: "poop_log",
        entityId: "poop-offline",
        childId: "child-1",
        operation: "create",
        payload: {
          photo_path: "private/photos/should-not-appear.jpg",
          safe: true,
        },
      });
      const pending = await listPendingChanges();
      assert.equal(pending.length, 1);
      assert.equal(pending[0].payload_json?.includes("photo_path"), false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

