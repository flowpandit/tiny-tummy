import type { ChildCaregiver, Caregiver } from "../types";
import { generateId, nowISO } from "../utils";
import type { CaregiverDraft, ChildCaregiverProfile } from "../caregivers";
import { getDb } from "./connection";
import { executeMutation, softDeleteById, softDeleteWhere, withTransaction } from "./mutations";

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

  return {
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
}

export async function updateCaregiver(
  id: string,
  updates: Partial<CaregiverDraft>,
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = ["updated_at = ?", "sync_status = 'local'", "sync_version = sync_version + 1"];
  const params: unknown[] = [nowISO()];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  params.push(id);
  await executeMutation(conn, `UPDATE caregivers SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, params);
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
      await executeMutation(
        conn,
        `UPDATE child_caregivers
         SET relationship_to_child = ?, permissions = ?, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
         WHERE id = ?`,
        [relationshipToChild, permissions, now, existing.id],
      );

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
    await executeMutation(
      conn,
      `UPDATE child_caregivers
       SET relationship_to_child = ?, permissions = ?, deleted_at = NULL, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
       WHERE id = ?`,
      [input.relationshipToChild ?? null, input.permissions ?? null, now, deleted.id],
    );

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
  await executeMutation(
    conn,
    `INSERT INTO child_caregivers (
      id, child_id, caregiver_id, relationship_to_child, permissions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.childId, input.caregiverId, input.relationshipToChild ?? null, input.permissions ?? null, now, now],
  );

  return {
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
}

export async function setPrimaryCaregiver(id: string | null): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    await executeMutation(
      conn,
      `UPDATE caregivers
       SET is_primary = 0, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
       WHERE deleted_at IS NULL AND is_primary = 1`,
      [now],
    );

    if (!id) return;

    await executeMutation(
      conn,
      `UPDATE caregivers
       SET is_primary = 1, updated_at = ?, sync_status = 'local', sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`,
      [now, id],
    );
  });
}

export async function deleteCaregiver(id: string): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    await softDeleteWhere(conn, "child_caregivers", "caregiver_id = ?", [id], now);
    await softDeleteById(conn, "caregivers", id, now);
  });
}

export async function deleteChildCaregiverLink(id: string): Promise<void> {
  const conn = await getDb();
  await softDeleteById(conn, "child_caregivers", id);
}

export async function deleteAttachmentMetadata(id: string): Promise<void> {
  const conn = await getDb();
  await softDeleteById(conn, "attachments", id);
}

export async function deleteAttachmentMetadataForOwner(ownerTable: string, ownerId: string): Promise<void> {
  const conn = await getDb();
  await softDeleteWhere(conn, "attachments", "owner_table = ? AND owner_id = ?", [ownerTable, ownerId]);
}
