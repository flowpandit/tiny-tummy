import type {
  ListPendingSyncOutboxOptions,
  SyncOutboxChangeInput,
  SyncOutboxRow,
  SyncOutboxStatus,
  SyncOutboxSummary,
} from "../sync-outbox";
import {
  getSyncOutboxEntityTable,
  getSyncOutboxLocalOnlyValue,
} from "../sync-outbox";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";
import { executeMutation, type DbExecutor, withTransaction } from "./mutations";

export type SyncOutboxDbExecutor = DbExecutor & {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
};

const EMPTY_SUMMARY: SyncOutboxSummary = {
  total: 0,
  pending: 0,
  processing: 0,
  processed: 0,
  failed: 0,
  ignored: 0,
};

const OMITTED_PAYLOAD_KEYS = new Set([
  "photo_path",
  "local_path",
  "file_path",
  "file_bytes",
  "bytes",
  "base64",
]);

function sanitizeOutboxPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeOutboxPayload);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (OMITTED_PAYLOAD_KEYS.has(key)) continue;
    sanitized[key] = sanitizeOutboxPayload(nestedValue);
  }

  return sanitized;
}

function serializeOutboxPayload(payload: SyncOutboxChangeInput["payload"]): string | null {
  if (!payload) return null;
  return JSON.stringify(sanitizeOutboxPayload(payload));
}

function placeholders(ids: string[]): string {
  return ids.map(() => "?").join(", ");
}

async function updateOutboxRows(
  conn: SyncOutboxDbExecutor,
  ids: string[],
  setSql: string,
  values: unknown[],
): Promise<void> {
  if (ids.length === 0) return;
  await executeMutation(
    conn,
    `UPDATE sync_outbox SET ${setSql} WHERE id IN (${placeholders(ids)})`,
    [...values, ...ids],
  );
}

// Local infrastructure only: this records future sync work without sending data anywhere.
export async function enqueueOutboxChangeWithConn(
  conn: DbExecutor,
  change: SyncOutboxChangeInput,
  timestamp = nowISO(),
): Promise<SyncOutboxRow> {
  const id = generateId();
  const row: SyncOutboxRow = {
    id,
    entity_table: getSyncOutboxEntityTable(change.entity),
    entity_id: change.entityId,
    child_id: change.childId ?? null,
    operation: change.operation,
    payload_json: serializeOutboxPayload(change.payload),
    created_at: timestamp,
    updated_at: timestamp,
    attempted_at: null,
    processed_at: null,
    status: "pending",
    retry_count: 0,
    error_message: null,
    device_id: change.deviceId ?? null,
    local_only: getSyncOutboxLocalOnlyValue(change.localOnly),
  };

  await executeMutation(
    conn,
    `INSERT INTO sync_outbox (
      id, entity_table, entity_id, child_id, operation, payload_json, created_at, updated_at,
      attempted_at, processed_at, status, retry_count, error_message, device_id, local_only
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', 0, NULL, ?, ?)`,
    [
      row.id,
      row.entity_table,
      row.entity_id,
      row.child_id,
      row.operation,
      row.payload_json,
      row.created_at,
      row.updated_at,
      row.device_id,
      row.local_only,
    ],
  );

  return row;
}

export async function enqueueOutboxChangesWithConn(
  conn: DbExecutor,
  changes: SyncOutboxChangeInput[],
  timestamp = nowISO(),
): Promise<SyncOutboxRow[]> {
  const rows: SyncOutboxRow[] = [];
  for (const change of changes) {
    rows.push(await enqueueOutboxChangeWithConn(conn, change, timestamp));
  }
  return rows;
}

export async function enqueueChange(change: SyncOutboxChangeInput): Promise<SyncOutboxRow> {
  const conn = await getDb();
  return enqueueOutboxChangeWithConn(conn, change);
}

export async function enqueueChanges(changes: SyncOutboxChangeInput[]): Promise<SyncOutboxRow[]> {
  const conn = await getDb();
  return withTransaction(conn, () => enqueueOutboxChangesWithConn(conn, changes));
}

export async function listPendingChanges(options: ListPendingSyncOutboxOptions = {}): Promise<SyncOutboxRow[]> {
  const conn = await getDb();
  const clauses = ["status = 'pending'"];
  const params: unknown[] = [];

  if (options.childId) {
    clauses.push("child_id = ?");
    params.push(options.childId);
  }

  if (options.entity) {
    clauses.push("entity_table = ?");
    params.push(getSyncOutboxEntityTable(options.entity));
  }

  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  params.push(limit);

  return conn.select<SyncOutboxRow[]>(
    `SELECT * FROM sync_outbox
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at ASC
     LIMIT ?`,
    params,
  );
}

export async function markProcessing(ids: string[]): Promise<void> {
  const conn = await getDb();
  const now = nowISO();
  await updateOutboxRows(
    conn,
    ids,
    "status = 'processing', attempted_at = ?, updated_at = ?",
    [now, now],
  );
}

export async function markProcessed(ids: string[]): Promise<void> {
  const conn = await getDb();
  const now = nowISO();
  await updateOutboxRows(
    conn,
    ids,
    "status = 'processed', processed_at = ?, updated_at = ?, error_message = NULL",
    [now, now],
  );
}

export async function markFailed(id: string, error: string | Error): Promise<void> {
  const conn = await getDb();
  const now = nowISO();
  await executeMutation(
    conn,
    `UPDATE sync_outbox
     SET status = 'failed', attempted_at = ?, updated_at = ?, retry_count = retry_count + 1, error_message = ?
     WHERE id = ?`,
    [now, now, error instanceof Error ? error.message : error, id],
  );
}

export async function markIgnored(id: string, reason: string): Promise<void> {
  const conn = await getDb();
  const now = nowISO();
  await executeMutation(
    conn,
    `UPDATE sync_outbox
     SET status = 'ignored', updated_at = ?, error_message = ?
     WHERE id = ?`,
    [now, reason, id],
  );
}

export async function clearProcessedBefore(date: string): Promise<void> {
  const conn = await getDb();
  await executeMutation(
    conn,
    "DELETE FROM sync_outbox WHERE status = 'processed' AND processed_at IS NOT NULL AND processed_at < ?",
    [date],
  );
}

export async function summarizeOutbox(): Promise<SyncOutboxSummary> {
  const conn = await getDb();
  const rows = await conn.select<Array<{ status: SyncOutboxStatus; count: number }>>(
    "SELECT status, COUNT(*) AS count FROM sync_outbox GROUP BY status",
  );
  const summary = { ...EMPTY_SUMMARY };

  for (const row of rows) {
    summary[row.status] = Number(row.count);
    summary.total += Number(row.count);
  }

  return summary;
}

export const SyncOutboxService = {
  enqueueChange,
  enqueueChanges,
  listPendingChanges,
  markProcessing,
  markProcessed,
  markFailed,
  markIgnored,
  clearProcessedBefore,
  summarizeOutbox,
};

