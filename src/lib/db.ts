import Database from "@tauri-apps/plugin-sql";
import type { Child, PoopEntry, Alert, DietEntry, DailyFrequency, ConsistencyPoint, ColorCount } from "./types";
import { generateId, nowISO } from "./utils";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:tinytummy.db");
  }
  return db;
}


// --- Children ---

export async function createChild(input: {
  name: string;
  date_of_birth: string;
  feeding_type: string;
  avatar_color?: string;
}): Promise<Child> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();
  const avatarColor = input.avatar_color ?? "#2563EB";

  await conn.execute(
    "INSERT INTO children (id, name, date_of_birth, feeding_type, avatar_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, input.name, input.date_of_birth, input.feeding_type, avatarColor, now, now],
  );

  return {
    id,
    name: input.name,
    date_of_birth: input.date_of_birth,
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
  updates: Partial<Pick<Child, "name" | "date_of_birth" | "feeding_type" | "avatar_color">>,
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
  await conn.execute("UPDATE children SET is_active = 0, updated_at = ? WHERE id = ?", [
    nowISO(),
    id,
  ]);
}

// --- Poop Logs ---

export async function createPoopLog(input: {
  child_id: string;
  logged_at: string;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  photo_path?: string | null;
}): Promise<PoopEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    "INSERT INTO poop_logs (id, child_id, logged_at, stool_type, color, size, is_no_poop, notes, photo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
    [
      id,
      input.child_id,
      input.logged_at,
      input.stool_type ?? null,
      input.color ?? null,
      input.size ?? null,
      input.notes ?? null,
      input.photo_path ?? null,
      now,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    logged_at: input.logged_at,
    stool_type: input.stool_type ?? null,
    color: (input.color as PoopEntry["color"]) ?? null,
    size: (input.size as PoopEntry["size"]) ?? null,
    is_no_poop: 0,
    notes: input.notes ?? null,
    photo_path: input.photo_path ?? null,
    created_at: now,
    updated_at: now,
  };
}

export async function logNoPoop(childId: string): Promise<PoopEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    "INSERT INTO poop_logs (id, child_id, logged_at, is_no_poop, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    [id, childId, now, now, now],
  );

  return {
    id,
    child_id: childId,
    logged_at: now,
    stool_type: null,
    color: null,
    size: null,
    is_no_poop: 1,
    notes: null,
    photo_path: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getPoopLogs(
  childId: string,
  limit = 100,
): Promise<PoopEntry[]> {
  const conn = await getDb();
  return conn.select<PoopEntry[]>(
    "SELECT * FROM poop_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function getLastRealPoop(childId: string): Promise<PoopEntry | null> {
  const conn = await getDb();
  const rows = await conn.select<PoopEntry[]>(
    "SELECT * FROM poop_logs WHERE child_id = ? AND is_no_poop = 0 ORDER BY logged_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function updatePoopLog(
  id: string,
  updates: {
    logged_at?: string;
    stool_type?: number | null;
    color?: string | null;
    size?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [nowISO()];

  if (updates.logged_at !== undefined) { sets.push("logged_at = ?"); params.push(updates.logged_at); }
  if (updates.stool_type !== undefined) { sets.push("stool_type = ?"); params.push(updates.stool_type); }
  if (updates.color !== undefined) { sets.push("color = ?"); params.push(updates.color); }
  if (updates.size !== undefined) { sets.push("size = ?"); params.push(updates.size); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(updates.notes); }

  params.push(id);
  await conn.execute(`UPDATE poop_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deletePoopLog(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM poop_logs WHERE id = ?", [id]);
}

// --- Alerts ---

export async function createAlert(input: {
  child_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  related_log_id?: string | null;
}): Promise<Alert> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    "INSERT INTO alerts (id, child_id, alert_type, severity, title, message, triggered_at, related_log_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, input.child_id, input.alert_type, input.severity, input.title, input.message, now, input.related_log_id ?? null],
  );

  return {
    id,
    child_id: input.child_id,
    alert_type: input.alert_type,
    severity: input.severity as Alert["severity"],
    title: input.title,
    message: input.message,
    is_dismissed: 0,
    triggered_at: now,
    related_log_id: input.related_log_id ?? null,
  };
}

export async function getActiveAlerts(childId: string): Promise<Alert[]> {
  const conn = await getDb();
  return conn.select<Alert[]>(
    "SELECT * FROM alerts WHERE child_id = ? AND is_dismissed = 0 ORDER BY triggered_at DESC",
    [childId],
  );
}

export async function dismissAlert(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("UPDATE alerts SET is_dismissed = 1 WHERE id = ?", [id]);
}

// --- Diet Logs ---

export async function createDietLog(input: {
  child_id: string;
  logged_at: string;
  food_type: string;
  food_name?: string | null;
  notes?: string | null;
}): Promise<DietEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    "INSERT INTO diet_logs (id, child_id, logged_at, food_type, food_name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, input.child_id, input.logged_at, input.food_type, input.food_name ?? null, input.notes ?? null, now],
  );

  return {
    id,
    child_id: input.child_id,
    logged_at: input.logged_at,
    food_type: input.food_type as DietEntry["food_type"],
    food_name: input.food_name ?? null,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getDietLogs(
  childId: string,
  limit = 100,
): Promise<DietEntry[]> {
  const conn = await getDb();
  return conn.select<DietEntry[]>(
    "SELECT * FROM diet_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function updateDietLog(
  id: string,
  updates: {
    logged_at?: string;
    food_type?: string;
    food_name?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.logged_at !== undefined) { sets.push("logged_at = ?"); params.push(updates.logged_at); }
  if (updates.food_type !== undefined) { sets.push("food_type = ?"); params.push(updates.food_type); }
  if (updates.food_name !== undefined) { sets.push("food_name = ?"); params.push(updates.food_name); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(updates.notes); }

  if (sets.length === 0) return;
  params.push(id);
  await conn.execute(`UPDATE diet_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteDietLog(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM diet_logs WHERE id = ?", [id]);
}

// --- Stats ---

export async function getFrequencyStats(
  childId: string,
  days: number,
): Promise<DailyFrequency[]> {
  const conn = await getDb();
  return conn.select<DailyFrequency[]>(
    `SELECT date(logged_at) as date, COUNT(*) as count
     FROM poop_logs
     WHERE child_id = ? AND is_no_poop = 0
       AND logged_at >= datetime('now', ?)
     GROUP BY date(logged_at)
     ORDER BY date ASC`,
    [childId, `-${days} days`],
  );
}

export async function getConsistencyTrend(
  childId: string,
  days: number,
): Promise<ConsistencyPoint[]> {
  const conn = await getDb();
  return conn.select<ConsistencyPoint[]>(
    `SELECT logged_at, stool_type
     FROM poop_logs
     WHERE child_id = ? AND is_no_poop = 0 AND stool_type IS NOT NULL
       AND logged_at >= datetime('now', ?)
     ORDER BY logged_at ASC`,
    [childId, `-${days} days`],
  );
}

export async function getColorDistribution(
  childId: string,
  days: number,
): Promise<ColorCount[]> {
  const conn = await getDb();
  return conn.select<ColorCount[]>(
    `SELECT color, COUNT(*) as count
     FROM poop_logs
     WHERE child_id = ? AND is_no_poop = 0 AND color IS NOT NULL
       AND logged_at >= datetime('now', ?)
     GROUP BY color
     ORDER BY count DESC`,
    [childId, `-${days} days`],
  );
}

// --- Report queries ---

export async function getPoopLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<PoopEntry[]> {
  const conn = await getDb();
  return conn.select<PoopEntry[]>(
    `SELECT * FROM poop_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startDate, endDate + "T23:59:59"],
  );
}

export async function getReportStats(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<{ totalPoops: number; totalNoPoop: number; avgPerDay: number; mostCommonType: number | null; mostCommonColor: string | null }> {
  const conn = await getDb();

  const countRows = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM poop_logs WHERE child_id = ? AND is_no_poop = 0 AND logged_at >= ? AND logged_at <= ?`,
    [childId, startDate, endDate + "T23:59:59"],
  );
  const noPoopRows = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM poop_logs WHERE child_id = ? AND is_no_poop = 1 AND logged_at >= ? AND logged_at <= ?`,
    [childId, startDate, endDate + "T23:59:59"],
  );

  const totalPoops = countRows[0]?.total ?? 0;
  const totalNoPoop = noPoopRows[0]?.total ?? 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgPerDay = Math.round((totalPoops / daysDiff) * 10) / 10;

  const typeRows = await conn.select<{ stool_type: number; cnt: number }[]>(
    `SELECT stool_type, COUNT(*) as cnt FROM poop_logs
     WHERE child_id = ? AND is_no_poop = 0 AND stool_type IS NOT NULL AND logged_at >= ? AND logged_at <= ?
     GROUP BY stool_type ORDER BY cnt DESC LIMIT 1`,
    [childId, startDate, endDate + "T23:59:59"],
  );

  const colorRows = await conn.select<{ color: string; cnt: number }[]>(
    `SELECT color, COUNT(*) as cnt FROM poop_logs
     WHERE child_id = ? AND is_no_poop = 0 AND color IS NOT NULL AND logged_at >= ? AND logged_at <= ?
     GROUP BY color ORDER BY cnt DESC LIMIT 1`,
    [childId, startDate, endDate + "T23:59:59"],
  );

  return {
    totalPoops,
    totalNoPoop,
    avgPerDay,
    mostCommonType: typeRows[0]?.stool_type ?? null,
    mostCommonColor: colorRows[0]?.color ?? null,
  };
}

// --- App Settings ---

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
