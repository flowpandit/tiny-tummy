import type { QuickPresetEntry } from "../types";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";

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
  await conn.execute(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM app_settings WHERE key = ?", [key]);
}

export async function getQuickPresets(
  childId: string,
  kind: QuickPresetEntry["kind"],
): Promise<QuickPresetEntry[]> {
  const conn = await getDb();
  return conn.select<QuickPresetEntry[]>(
    `SELECT * FROM quick_presets
     WHERE child_id = ? AND kind = ? AND is_enabled = 1
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
  await conn.execute("DELETE FROM quick_presets WHERE child_id = ? AND kind = ?", [childId, kind]);

  const now = nowISO();
  for (const preset of presets) {
    await conn.execute(
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
}
