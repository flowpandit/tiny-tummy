import type { QuickPresetEntry } from "../types";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";
import { executeMutation, softDeleteWhere, withTransaction } from "./mutations";

export async function getSetting(key: string): Promise<string | null> {
  const conn = await getDb();
  const rows = await conn.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = await getDb();
  await executeMutation(
    conn,
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const conn = await getDb();
  await executeMutation(conn, "DELETE FROM app_settings WHERE key = ?", [key]);
}

export async function getQuickPresets(
  childId: string,
  kind: QuickPresetEntry["kind"],
): Promise<QuickPresetEntry[]> {
  const conn = await getDb();
  return conn.select<QuickPresetEntry[]>(
    `SELECT * FROM quick_presets
     WHERE child_id = ? AND kind = ? AND is_enabled = 1 AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [childId, kind],
  );
}

export async function replaceQuickPresets(
  childId: string,
  kind: QuickPresetEntry["kind"],
  presets: Array<{
    label: string;
    description?: string | null;
    draft_json: string;
    sort_order: number;
  }>,
): Promise<void> {
  const conn = await getDb();
  await withTransaction(conn, async () => {
    const now = nowISO();
    await softDeleteWhere(conn, "quick_presets", "child_id = ? AND kind = ?", [childId, kind], now);

    for (const preset of presets) {
      await executeMutation(
        conn,
        `INSERT INTO quick_presets (
          id, child_id, kind, label, description, draft_json, sort_order, is_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          generateId(),
          childId,
          kind,
          preset.label,
          preset.description ?? null,
          preset.draft_json,
          preset.sort_order,
          now,
          now,
        ],
      );
    }
  });
}
