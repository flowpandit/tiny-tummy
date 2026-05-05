import type { Child } from "../types";
import { getBreastfeedingLastSideSettingKey, getBreastfeedingSessionSettingKey } from "../breastfeeding";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";
import { executeMutation, softDeleteById, softDeleteChildScopedRows, withTransaction } from "./mutations";

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

  await executeMutation(
    conn,
    "INSERT INTO children (id, name, date_of_birth, sex, feeding_type, avatar_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, input.name, input.date_of_birth, input.sex ?? null, input.feeding_type, avatarColor, now, now],
  );

  return {
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
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [nowISO()];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  await executeMutation(conn, `UPDATE children SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`, params);
}

export async function deleteChild(id: string): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    await softDeleteChildScopedRows(conn, id, now);
    await softDeleteById(conn, "children", id, now, { includeChildDeactivation: true });
    await executeMutation(
      conn,
      "DELETE FROM app_settings WHERE key IN (?, ?)",
      [getBreastfeedingSessionSettingKey(id), getBreastfeedingLastSideSettingKey(id)],
    );
  });
}
