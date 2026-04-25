import type { Child } from "../types";
import { getBreastfeedingLastSideSettingKey, getBreastfeedingSessionSettingKey } from "../breastfeeding";
import { deleteAvatar, deletePhoto } from "../photos";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";
import { deleteSetting } from "./settings";

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

  await conn.execute(
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
  };
}

export async function getChildren(): Promise<Child[]> {
  const conn = await getDb();
  return conn.select<Child[]>(
    "SELECT * FROM children WHERE is_active = 1 ORDER BY created_at ASC",
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
  await conn.execute(`UPDATE children SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteChild(id: string): Promise<void> {
  const conn = await getDb();

  const poopPhotoRows = await conn.select<{ photo_path: string | null }[]>(
    "SELECT photo_path FROM poop_logs WHERE child_id = ? AND photo_path IS NOT NULL",
    [id],
  );
  const diaperPhotoRows = await conn.select<{ photo_path: string | null }[]>(
    "SELECT photo_path FROM diaper_logs WHERE child_id = ? AND photo_path IS NOT NULL",
    [id],
  );

  for (const row of [...poopPhotoRows, ...diaperPhotoRows]) {
    if (!row.photo_path) continue;
    try {
      await deletePhoto(row.photo_path);
    } catch {
      // Best-effort cleanup before removing DB rows.
    }
  }

  try {
    await deleteAvatar(id);
  } catch {
    // Best-effort cleanup before removing DB rows.
  }

  await conn.execute("DELETE FROM alerts WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM symptom_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM episode_events WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM episodes WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM growth_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM sleep_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM milestone_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM quick_presets WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM diet_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM diaper_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM poop_logs WHERE child_id = ?", [id]);
  await conn.execute("DELETE FROM children WHERE id = ?", [id]);

  await deleteSetting(getBreastfeedingSessionSettingKey(id));
  await deleteSetting(getBreastfeedingLastSideSettingKey(id));
}
