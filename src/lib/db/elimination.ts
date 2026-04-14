import type { ColorCount, ConsistencyPoint, DiaperEntry, DailyFrequency, PoopEntry } from "../types";
import { deletePhoto } from "../photos";
import { combineLocalDateAndTimeToUtcIso, formatLocalDateKey, generateId, nowISO } from "../utils";
import { getDb } from "./connection";

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

async function createLinkedPoopLog(input: {
  child_id: string;
  logged_at: string;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  photo_path?: string | null;
}): Promise<PoopEntry> {
  return createPoopLog(input);
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

export async function deletePoopLog(entry: Pick<PoopEntry, "id" | "photo_path"> | string): Promise<void> {
  const conn = await getDb();
  const id = typeof entry === "string" ? entry : entry.id;
  const photoPath = typeof entry === "string" ? null : entry.photo_path;

  if (photoPath) {
    try {
      await deletePhoto(photoPath);
    } catch {
      // Ignore file cleanup failures so the log row can still be removed.
    }
  }

  await conn.execute("DELETE FROM poop_logs WHERE id = ?", [id]);
}

export async function reconcileAutoNoPoopDays(childId: string): Promise<number> {
  const conn = await getDb();
  const now = nowISO();
  const todayKey = formatLocalDateKey(new Date());
  const redundantRows = await conn.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt
     FROM poop_logs
     WHERE child_id = ?
       AND is_no_poop = 1
       AND date(logged_at, 'localtime') IN (
         SELECT DISTINCT date(logged_at, 'localtime')
         FROM poop_logs
         WHERE child_id = ? AND is_no_poop = 0
       )`,
    [childId, childId],
  );
  const removedCount = redundantRows[0]?.cnt ?? 0;

  await conn.execute(
    `DELETE FROM poop_logs
     WHERE child_id = ?
       AND is_no_poop = 1
       AND date(logged_at, 'localtime') IN (
         SELECT DISTINCT date(logged_at, 'localtime')
         FROM poop_logs
         WHERE child_id = ? AND is_no_poop = 0
       )`,
    [childId, childId],
  );

  const candidateRows = await conn.select<{ day: string }[]>(
    `SELECT DISTINCT day
     FROM (
       SELECT date(logged_at, 'localtime') AS day FROM diet_logs WHERE child_id = ?
       UNION
       SELECT date(logged_at, 'localtime') AS day FROM symptom_logs WHERE child_id = ?
       UNION
       SELECT date(logged_at, 'localtime') AS day FROM milestone_logs WHERE child_id = ?
       UNION
       SELECT date(started_at, 'localtime') AS day FROM sleep_logs WHERE child_id = ?
       UNION
       SELECT date(measured_at, 'localtime') AS day FROM growth_logs WHERE child_id = ?
       UNION
       SELECT date(started_at, 'localtime') AS day FROM episodes WHERE child_id = ?
       UNION
       SELECT date(logged_at, 'localtime') AS day FROM episode_events WHERE child_id = ?
     )
     WHERE day < ?
       AND day NOT IN (
         SELECT DISTINCT date(logged_at, 'localtime')
         FROM poop_logs
         WHERE child_id = ?
       )
     ORDER BY day ASC`,
    [childId, childId, childId, childId, childId, childId, childId, todayKey, childId],
  );

  for (const row of candidateRows) {
    await conn.execute(
      `INSERT INTO poop_logs (
        id, child_id, logged_at, stool_type, color, size, is_no_poop, notes, photo_path, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, NULL, NULL, 1, NULL, NULL, ?, ?)`,
      [generateId(), childId, combineLocalDateAndTimeToUtcIso(row.day, "20:00"), now, now],
    );
  }

  return removedCount + candidateRows.length;
}

export async function createDiaperLog(input: {
  child_id: string;
  logged_at: string;
  diaper_type: DiaperEntry["diaper_type"];
  urine_color?: string | null;
  stool_type?: number | null;
  color?: string | null;
  size?: string | null;
  notes?: string | null;
  photo_path?: string | null;
}): Promise<DiaperEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  let linkedPoopLogId: string | null = null;
  if (input.diaper_type === "dirty" || input.diaper_type === "mixed") {
    const poopLog = await createLinkedPoopLog({
      child_id: input.child_id,
      logged_at: input.logged_at,
      stool_type: input.stool_type ?? null,
      color: input.color ?? null,
      size: input.size ?? null,
      notes: input.notes ?? null,
      photo_path: input.photo_path ?? null,
    });
    linkedPoopLogId = poopLog.id;
  }

  await conn.execute(
    `INSERT INTO diaper_logs (
      id, child_id, logged_at, diaper_type, urine_color, stool_type, color, size, notes,
      photo_path, linked_poop_log_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.child_id,
      input.logged_at,
      input.diaper_type,
      input.urine_color ?? null,
      input.stool_type ?? null,
      input.color ?? null,
      input.size ?? null,
      input.notes ?? null,
      input.photo_path ?? null,
      linkedPoopLogId,
      now,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    logged_at: input.logged_at,
    diaper_type: input.diaper_type,
    urine_color: (input.urine_color as DiaperEntry["urine_color"]) ?? null,
    stool_type: input.stool_type ?? null,
    color: (input.color as DiaperEntry["color"]) ?? null,
    size: (input.size as DiaperEntry["size"]) ?? null,
    notes: input.notes ?? null,
    photo_path: input.photo_path ?? null,
    linked_poop_log_id: linkedPoopLogId,
    created_at: now,
    updated_at: now,
  };
}

export async function getDiaperLogs(childId: string, limit = 100): Promise<DiaperEntry[]> {
  const conn = await getDb();
  return conn.select<DiaperEntry[]>(
    "SELECT * FROM diaper_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function getDiaperLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<DiaperEntry[]> {
  const conn = await getDb();
  return conn.select<DiaperEntry[]>(
    `SELECT * FROM diaper_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startDate, `${endDate}T23:59:59`],
  );
}

export async function getLastDiaperLog(childId: string): Promise<DiaperEntry | null> {
  const conn = await getDb();
  const rows = await conn.select<DiaperEntry[]>(
    "SELECT * FROM diaper_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function getLastWetDiaper(childId: string): Promise<DiaperEntry | null> {
  const conn = await getDb();
  const rows = await conn.select<DiaperEntry[]>(
    "SELECT * FROM diaper_logs WHERE child_id = ? AND diaper_type IN ('wet', 'mixed') ORDER BY logged_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function getLastDirtyDiaper(childId: string): Promise<DiaperEntry | null> {
  const conn = await getDb();
  const rows = await conn.select<DiaperEntry[]>(
    "SELECT * FROM diaper_logs WHERE child_id = ? AND diaper_type IN ('dirty', 'mixed') ORDER BY logged_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function updateDiaperLog(
  id: string,
  updates: {
    logged_at?: string;
    diaper_type?: DiaperEntry["diaper_type"];
    urine_color?: string | null;
    stool_type?: number | null;
    color?: string | null;
    size?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const rows = await conn.select<DiaperEntry[]>(
    "SELECT * FROM diaper_logs WHERE id = ? LIMIT 1",
    [id],
  );
  const current = rows[0];
  if (!current) return;

  const next: DiaperEntry = {
    ...current,
    logged_at: updates.logged_at ?? current.logged_at,
    diaper_type: updates.diaper_type ?? current.diaper_type,
    urine_color: updates.urine_color !== undefined ? (updates.urine_color as DiaperEntry["urine_color"]) : current.urine_color,
    stool_type: updates.stool_type !== undefined ? updates.stool_type : current.stool_type,
    color: updates.color !== undefined ? (updates.color as DiaperEntry["color"]) : current.color,
    size: updates.size !== undefined ? (updates.size as DiaperEntry["size"]) : current.size,
    notes: updates.notes !== undefined ? updates.notes : current.notes,
  };

  let linkedPoopLogId = current.linked_poop_log_id;
  const needsPoopLog = next.diaper_type === "dirty" || next.diaper_type === "mixed";

  if (needsPoopLog && linkedPoopLogId) {
    await updatePoopLog(linkedPoopLogId, {
      logged_at: next.logged_at,
      stool_type: next.stool_type,
      color: next.color,
      size: next.size,
      notes: next.notes,
    });
  } else if (needsPoopLog && !linkedPoopLogId) {
    const poopLog = await createLinkedPoopLog({
      child_id: current.child_id,
      logged_at: next.logged_at,
      stool_type: next.stool_type,
      color: next.color,
      size: next.size,
      notes: next.notes,
      photo_path: current.photo_path,
    });
    linkedPoopLogId = poopLog.id;
  } else if (!needsPoopLog && linkedPoopLogId) {
    await deletePoopLog({
      id: linkedPoopLogId,
      photo_path: current.photo_path,
    });
    linkedPoopLogId = null;
  }

  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [nowISO()];

  if (updates.logged_at !== undefined) { sets.push("logged_at = ?"); params.push(next.logged_at); }
  if (updates.diaper_type !== undefined) { sets.push("diaper_type = ?"); params.push(next.diaper_type); }
  if (updates.urine_color !== undefined) { sets.push("urine_color = ?"); params.push(next.urine_color); }
  if (updates.stool_type !== undefined) { sets.push("stool_type = ?"); params.push(next.stool_type); }
  if (updates.color !== undefined) { sets.push("color = ?"); params.push(next.color); }
  if (updates.size !== undefined) { sets.push("size = ?"); params.push(next.size); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(next.notes); }
  if (linkedPoopLogId !== current.linked_poop_log_id) { sets.push("linked_poop_log_id = ?"); params.push(linkedPoopLogId); }

  params.push(id);
  await conn.execute(`UPDATE diaper_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteDiaperLog(entry: Pick<DiaperEntry, "id" | "photo_path" | "linked_poop_log_id"> | string): Promise<void> {
  const conn = await getDb();
  const id = typeof entry === "string" ? entry : entry.id;
  let linkedPoopLogId: string | null = null;
  let photoPath: string | null = null;

  if (typeof entry === "string") {
    const rows = await conn.select<DiaperEntry[]>(
      "SELECT * FROM diaper_logs WHERE id = ? LIMIT 1",
      [entry],
    );
    linkedPoopLogId = rows[0]?.linked_poop_log_id ?? null;
    photoPath = rows[0]?.photo_path ?? null;
  } else {
    linkedPoopLogId = entry.linked_poop_log_id;
    photoPath = entry.photo_path;
  }

  if (linkedPoopLogId) {
    await deletePoopLog({
      id: linkedPoopLogId,
      photo_path: photoPath,
    });
  }

  await conn.execute("DELETE FROM diaper_logs WHERE id = ?", [id]);
}

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
