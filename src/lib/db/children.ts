import type { Child } from "../types";
import { getBreastfeedingLastSideSettingKey, getBreastfeedingSessionSettingKey } from "../breastfeeding";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";
import { executeMutation, softDeleteById, softDeleteChildScopedRows, withTransaction } from "./mutations";
import { enqueueOutboxChangeWithConn, enqueueOutboxChangesWithConn } from "./sync-outbox";
import type { SyncOutboxChangeInput, SyncOutboxEntityType } from "../sync-outbox";

type ChildScopedOutboxDeleteTable = {
  table: string;
  entity: SyncOutboxEntityType;
};

const CHILD_SCOPED_OUTBOX_DELETE_TABLES: readonly ChildScopedOutboxDeleteTable[] = [
  { table: "child_caregivers", entity: "child_caregiver" },
  { table: "poop_logs", entity: "poop_log" },
  { table: "diaper_logs", entity: "diaper_log" },
  { table: "diet_logs", entity: "diet_log" },
  { table: "sleep_logs", entity: "sleep_log" },
  { table: "symptom_logs", entity: "symptom_log" },
  { table: "episodes", entity: "episode" },
  { table: "episode_events", entity: "episode_event" },
  { table: "growth_logs", entity: "growth_log" },
  { table: "milestone_logs", entity: "milestone_log" },
  { table: "quick_presets", entity: "quick_preset" },
  { table: "attachments", entity: "attachment" },
];

type DbConnection = Awaited<ReturnType<typeof getDb>>;

function changedFields(updates: Record<string, unknown>): string[] {
  return Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .sort();
}

async function getChildScopedDeleteChanges(
  conn: DbConnection,
  childId: string,
): Promise<SyncOutboxChangeInput[]> {
  const changes: SyncOutboxChangeInput[] = [];

  for (const { table, entity } of CHILD_SCOPED_OUTBOX_DELETE_TABLES) {
    const rows = await conn.select<Array<{ id: string; local_only?: number | null }>>(
      `SELECT id, local_only FROM ${table} WHERE child_id = ? AND deleted_at IS NULL`,
      [childId],
    );

    for (const row of rows) {
      changes.push({
        entity,
        entityId: row.id,
        childId,
        operation: "delete",
        localOnly: row.local_only,
      });
    }
  }

  return changes;
}

export async function createChild(input: {
  name: string;
  date_of_birth: string;
  sex?: Child["sex"];
  feeding_type: string;
  avatar_color?: string;
}): Promise<Child> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();
  const avatarColor = input.avatar_color ?? "#2563EB";

  const child: Child = {
    id,
    name: input.name,
    date_of_birth: input.date_of_birth,
    sex: input.sex ?? null,
    feeding_type: input.feeding_type as Child["feeding_type"],
    avatar_color: avatarColor,
    is_active: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    device_id: null,
    sync_status: "local",
    sync_version: 1,
    local_only: 0,
  };

  await withTransaction(conn, async () => {
    await executeMutation(
      conn,
      "INSERT INTO children (id, name, date_of_birth, sex, feeding_type, avatar_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, input.name, input.date_of_birth, input.sex ?? null, input.feeding_type, avatarColor, now, now],
    );
    await enqueueOutboxChangeWithConn(conn, {
      entity: "child",
      entityId: id,
      childId: id,
      operation: "create",
    }, now);
  });

  return child;
}

export async function getChildren(): Promise<Child[]> {
  const conn = await getDb();
  return conn.select<Child[]>(
    "SELECT * FROM children WHERE is_active = 1 AND deleted_at IS NULL ORDER BY created_at ASC",
  );
}

export async function updateChild(
  id: string,
  updates: Partial<Pick<Child, "name" | "date_of_birth" | "sex" | "feeding_type" | "avatar_color">>,
): Promise<void> {
  const conn = await getDb();
  const fields = changedFields(updates);
  if (fields.length === 0) return;

  const rows = await conn.select<Array<{ local_only?: number | null }>>(
    "SELECT local_only FROM children WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [id],
  );
  const row = rows[0];
  if (!row) return;

  const now = nowISO();
  const sets: string[] = ["updated_at = ?", "sync_status = 'local'", "sync_version = sync_version + 1"];
  const params: unknown[] = [now];

  for (const key of fields) {
    sets.push(`${key} = ?`);
    params.push(updates[key as keyof typeof updates]);
  }
  params.push(id);
  await withTransaction(conn, async () => {
    await executeMutation(conn, `UPDATE children SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, params);
    await enqueueOutboxChangeWithConn(conn, {
      entity: "child",
      entityId: id,
      childId: id,
      operation: "update",
      localOnly: row.local_only,
      payload: { changed_fields: fields },
    }, now);
  });
}

export async function deleteChild(id: string): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    const childRows = await conn.select<Array<{ local_only?: number | null }>>(
      "SELECT local_only FROM children WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id],
    );
    const childScopedChanges = await getChildScopedDeleteChanges(conn, id);

    await softDeleteChildScopedRows(conn, id, now);
    await softDeleteById(conn, "children", id, now, { includeChildDeactivation: true });
    await enqueueOutboxChangesWithConn(conn, [
      ...childScopedChanges,
      {
        entity: "child",
        entityId: id,
        childId: id,
        operation: "delete",
        localOnly: childRows[0]?.local_only,
      },
    ], now);
    await executeMutation(
      conn,
      "DELETE FROM app_settings WHERE key IN (?, ?)",
      [getBreastfeedingSessionSettingKey(id), getBreastfeedingLastSideSettingKey(id)],
    );
  });
}
