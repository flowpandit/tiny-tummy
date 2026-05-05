import type { ChildCaregiver, Caregiver } from "../types";
import { generateId, nowISO } from "../utils";
import type { CaregiverDraft, ChildCaregiverProfile } from "../caregivers";
import { getDb } from "./connection";
import { executeMutation, softDeleteById, softDeleteWhere, withTransaction } from "./mutations";
import { enqueueOutboxChangeWithConn, enqueueOutboxChangesWithConn } from "./sync-outbox";
import type { SyncOutboxChangeInput } from "../sync-outbox";

type DbConnection = Awaited<ReturnType<typeof getDb>>;

function changedFields(updates: Record<string, unknown>): string[] {
  return Object.entries(updates)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .sort();
}

async function getChildCaregiverLinkChangesForCaregiver(
  conn: DbConnection,
  caregiverId: string,
): Promise<SyncOutboxChangeInput[]> {
  const rows = await conn.select<Array<{ id: string; child_id: string; local_only?: number | null }>>(
    "SELECT id, child_id, local_only FROM child_caregivers WHERE caregiver_id = ? AND deleted_at IS NULL",
    [caregiverId],
  );

  return rows.map((row) => ({
    entity: "child_caregiver",
    entityId: row.id,
    childId: row.child_id,
    operation: "unlink",
    localOnly: row.local_only,
    payload: { caregiver_id: caregiverId },
  }));
}

async function getAttachmentDeleteChanges(
  conn: DbConnection,
  whereClause: string,
  params: unknown[],
): Promise<SyncOutboxChangeInput[]> {
  const rows = await conn.select<Array<{
    id: string;
    child_id: string | null;
    owner_table: string;
    owner_id: string;
    mime_type: string | null;
    file_size: number | null;
    attachment_sync_policy: string | null;
    local_only?: number | null;
  }>>(
    `SELECT id, child_id, owner_table, owner_id, mime_type, file_size, attachment_sync_policy, local_only
     FROM attachments WHERE ${whereClause} AND deleted_at IS NULL`,
    params,
  );

  return rows.map((row) => ({
    entity: "attachment",
    entityId: row.id,
    childId: row.child_id,
    operation: "delete",
    localOnly: row.local_only ?? 1,
    payload: {
      owner_table: row.owner_table,
      owner_id: row.owner_id,
      mime_type: row.mime_type,
      file_size: row.file_size,
      attachment_sync_policy: row.attachment_sync_policy,
    },
  }));
}

export async function getCaregiver(id: string): Promise<Caregiver | null> {
  const conn = await getDb();
  const rows = await conn.select<Caregiver[]>(
    "SELECT * FROM caregivers WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return rows[0] ?? null;
}

export async function getCaregivers(): Promise<Caregiver[]> {
  const conn = await getDb();
  return conn.select<Caregiver[]>(
    `SELECT * FROM caregivers
     WHERE deleted_at IS NULL
     ORDER BY is_primary DESC, display_name COLLATE NOCASE ASC, created_at ASC`,
  );
}

export async function getCaregiversForChild(childId: string): Promise<ChildCaregiverProfile[]> {
  const conn = await getDb();
  return conn.select<ChildCaregiverProfile[]>(
    `SELECT
       caregivers.*,
       child_caregivers.id AS child_caregiver_id,
       child_caregivers.child_id AS child_id,
       child_caregivers.relationship_to_child AS relationship_to_child,
       child_caregivers.permissions AS permissions,
       child_caregivers.created_at AS link_created_at,
       child_caregivers.updated_at AS link_updated_at
     FROM child_caregivers
     INNER JOIN caregivers ON caregivers.id = child_caregivers.caregiver_id
     WHERE child_caregivers.child_id = ?
       AND child_caregivers.deleted_at IS NULL
       AND caregivers.deleted_at IS NULL
     ORDER BY caregivers.is_primary DESC, caregivers.display_name COLLATE NOCASE ASC, child_caregivers.created_at ASC`,
    [childId],
  );
}

export async function createCaregiver(input: CaregiverDraft): Promise<Caregiver> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  const caregiver: Caregiver = {
    id,
    display_name: input.display_name,
    role: input.role,
    relationship: input.relationship,
    email: input.email,
    phone: input.phone,
    avatar_color: input.avatar_color,
    is_primary: input.is_primary,
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
      `INSERT INTO caregivers (
        id, display_name, role, relationship, email, phone, avatar_color, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.display_name,
        input.role,
        input.relationship,
        input.email,
        input.phone,
        input.avatar_color,
        input.is_primary,
        now,
        now,
      ],
    );
    await enqueueOutboxChangeWithConn(conn, {
      entity: "caregiver",
      entityId: id,
      operation: "create",
      payload: { role: input.role, is_primary: input.is_primary },
    }, now);
  });

  return caregiver;
}

export async function updateCaregiver(
  id: string,
  updates: Partial<CaregiverDraft>,
): Promise<void> {
  const conn = await getDb();
  const fields = changedFields(updates);
  if (fields.length === 0) return;

  const rows = await conn.select<Array<{ local_only?: number | null }>>(
    "SELECT local_only FROM caregivers WHERE id = ? AND deleted_at IS NULL LIMIT 1",
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
    await executeMutation(conn, `UPDATE caregivers SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, params);
    await enqueueOutboxChangeWithConn(conn, {
      entity: "caregiver",
      entityId: id,
      operation: "update",
      localOnly: row.local_only,
      payload: { changed_fields: fields },
    }, now);
  });
}

async function getActiveChildCaregiverLink(
  conn: Awaited<ReturnType<typeof getDb>>,
  childId: string,
  caregiverId: string,
): Promise<ChildCaregiver | null> {
  const rows = await conn.select<ChildCaregiver[]>(
    `SELECT * FROM child_caregivers
     WHERE child_id = ? AND caregiver_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [childId, caregiverId],
  );
  return rows[0] ?? null;
}

async function getDeletedChildCaregiverLink(
  conn: Awaited<ReturnType<typeof getDb>>,
  childId: string,
  caregiverId: string,
): Promise<ChildCaregiver | null> {
  const rows = await conn.select<ChildCaregiver[]>(
    `SELECT * FROM child_caregivers
     WHERE child_id = ? AND caregiver_id = ? AND deleted_at IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [childId, caregiverId],
  );
  return rows[0] ?? null;
}

export async function linkCaregiverToChild(input: {
  childId: string;
  caregiverId: string;
  relationshipToChild?: string | null;
  permissions?: string | null;
}): Promise<ChildCaregiver> {
  const conn = await getDb();
  const now = nowISO();
  const existing = await getActiveChildCaregiverLink(conn, input.childId, input.caregiverId);
  if (existing) {
    const relationshipToChild = input.relationshipToChild ?? null;
    const permissions = input.permissions ?? null;

    if (existing.relationship_to_child !== relationshipToChild || existing.permissions !== permissions) {
      await withTransaction(conn, async () => {
        await executeMutation(
          conn,
          `UPDATE child_caregivers
           SET relationship_to_child = ?, permissions = ?, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
           WHERE id = ?`,
          [relationshipToChild, permissions, now, existing.id],
        );
        await enqueueOutboxChangeWithConn(conn, {
          entity: "child_caregiver",
          entityId: existing.id,
          childId: existing.child_id,
          operation: "update",
          localOnly: existing.local_only,
          payload: { changed_fields: ["permissions", "relationship_to_child"], caregiver_id: existing.caregiver_id },
        }, now);
      });

      return {
        ...existing,
        relationship_to_child: relationshipToChild,
        permissions,
        updated_at: now,
        sync_status: "local",
        sync_version: (existing.sync_version ?? 1) + 1,
      };
    }

    return existing;
  }

  const deleted = await getDeletedChildCaregiverLink(conn, input.childId, input.caregiverId);
  if (deleted) {
    await withTransaction(conn, async () => {
      await executeMutation(
        conn,
        `UPDATE child_caregivers
         SET relationship_to_child = ?, permissions = ?, deleted_at = NULL, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
         WHERE id = ?`,
        [input.relationshipToChild ?? null, input.permissions ?? null, now, deleted.id],
      );
      await enqueueOutboxChangeWithConn(conn, {
        entity: "child_caregiver",
        entityId: deleted.id,
        childId: deleted.child_id,
        operation: "link",
        localOnly: deleted.local_only,
        payload: { caregiver_id: deleted.caregiver_id },
      }, now);
    });

    return {
      ...deleted,
      relationship_to_child: input.relationshipToChild ?? null,
      permissions: input.permissions ?? null,
      deleted_at: null,
      updated_at: now,
      sync_status: "local",
      sync_version: (deleted.sync_version ?? 1) + 1,
    };
  }

  const id = generateId();
  const link: ChildCaregiver = {
    id,
    child_id: input.childId,
    caregiver_id: input.caregiverId,
    relationship_to_child: input.relationshipToChild ?? null,
    permissions: input.permissions ?? null,
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
      `INSERT INTO child_caregivers (
        id, child_id, caregiver_id, relationship_to_child, permissions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.childId, input.caregiverId, input.relationshipToChild ?? null, input.permissions ?? null, now, now],
    );
    await enqueueOutboxChangeWithConn(conn, {
      entity: "child_caregiver",
      entityId: id,
      childId: input.childId,
      operation: "link",
      payload: { caregiver_id: input.caregiverId },
    }, now);
  });

  return link;
}

export async function setPrimaryCaregiver(id: string | null): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    const currentPrimaryRows = await conn.select<Array<{ id: string; local_only?: number | null }>>(
      "SELECT id, local_only FROM caregivers WHERE deleted_at IS NULL AND is_primary = 1",
    );
    await executeMutation(
      conn,
      `UPDATE caregivers
       SET is_primary = 0, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
       WHERE deleted_at IS NULL AND is_primary = 1`,
      [now],
    );
    await enqueueOutboxChangesWithConn(conn, currentPrimaryRows.map((row) => ({
      entity: "caregiver",
      entityId: row.id,
      operation: "update" as const,
      localOnly: row.local_only,
      payload: { changed_fields: ["is_primary"] },
    })), now);

    if (!id) return;

    const targetRows = await conn.select<Array<{ local_only?: number | null }>>(
      "SELECT local_only FROM caregivers WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id],
    );
    await executeMutation(
      conn,
      `UPDATE caregivers
       SET is_primary = 1, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`,
      [now, id],
    );
    await enqueueOutboxChangeWithConn(conn, {
      entity: "caregiver",
      entityId: id,
      operation: "update",
      localOnly: targetRows[0]?.local_only,
      payload: { changed_fields: ["is_primary"] },
    }, now);
  });
}

export async function deleteCaregiver(id: string): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    const caregiverRows = await conn.select<Array<{ local_only?: number | null }>>(
      "SELECT local_only FROM caregivers WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id],
    );
    const linkChanges = await getChildCaregiverLinkChangesForCaregiver(conn, id);

    await softDeleteWhere(conn, "child_caregivers", "caregiver_id = ?", [id], now);
    await softDeleteById(conn, "caregivers", id, now);
    await enqueueOutboxChangesWithConn(conn, [
      ...linkChanges,
      {
        entity: "caregiver",
        entityId: id,
        operation: "delete",
        localOnly: caregiverRows[0]?.local_only,
      },
    ], now);
  });
}

export async function deleteChildCaregiverLink(id: string): Promise<void> {
  const conn = await getDb();
  await withTransaction(conn, async () => {
    const now = nowISO();
    const rows = await conn.select<Array<{ child_id: string; caregiver_id: string; local_only?: number | null }>>(
      "SELECT child_id, caregiver_id, local_only FROM child_caregivers WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id],
    );
    await softDeleteById(conn, "child_caregivers", id, now);
    if (rows[0]) {
      await enqueueOutboxChangeWithConn(conn, {
        entity: "child_caregiver",
        entityId: id,
        childId: rows[0].child_id,
        operation: "unlink",
        localOnly: rows[0].local_only,
        payload: { caregiver_id: rows[0].caregiver_id },
      }, now);
    }
  });
}

export async function deleteAttachmentMetadata(id: string): Promise<void> {
  const conn = await getDb();
  await withTransaction(conn, async () => {
    const now = nowISO();
    const changes = await getAttachmentDeleteChanges(conn, "id = ?", [id]);
    await softDeleteById(conn, "attachments", id, now);
    await enqueueOutboxChangesWithConn(conn, changes, now);
  });
}

export async function deleteAttachmentMetadataForOwner(ownerTable: string, ownerId: string): Promise<void> {
  const conn = await getDb();
  await withTransaction(conn, async () => {
    const now = nowISO();
    const changes = await getAttachmentDeleteChanges(conn, "owner_table = ? AND owner_id = ?", [ownerTable, ownerId]);
    await softDeleteWhere(conn, "attachments", "owner_table = ? AND owner_id = ?", [ownerTable, ownerId], now);
    await enqueueOutboxChangesWithConn(conn, changes, now);
  });
}
