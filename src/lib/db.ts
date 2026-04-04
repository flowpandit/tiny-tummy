import Database from "@tauri-apps/plugin-sql";
import type {
  Child,
  PoopEntry,
  DiaperEntry,
  Alert,
  SymptomEntry,
  GrowthEntry,
  SleepEntry,
  MilestoneEntry,
  FeedingEntry,
  DailyFrequency,
  ConsistencyPoint,
  ColorCount,
  Episode,
  EpisodeEvent,
  QuickPresetEntry,
} from "./types";
import { combineLocalDateAndTimeToUtcIso, formatLocalDateKey, generateId, nowISO, parseLocalDate } from "./utils";
import { getBreastfeedingLastSideSettingKey, getBreastfeedingSessionSettingKey } from "./breastfeeding";
import { getCaregiverNoteSettingKey } from "./caregiver-note";
import { deleteAvatar, deletePhoto } from "./photos";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  if (!dbPromise) {
    // App startup mounts multiple providers that all touch the DB at once.
    // Share a single in-flight load so mobile does not race multiple SQLite opens.
    dbPromise = Database.load("sqlite:tinytummy.db")
      .then((conn) => {
        db = conn;
        return conn;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }

  return dbPromise;
}


// --- Children ---

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

  await deleteSetting(getCaregiverNoteSettingKey(id));
  await deleteSetting(getBreastfeedingSessionSettingKey(id));
  await deleteSetting(getBreastfeedingLastSideSettingKey(id));
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

// --- Diaper Logs ---

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

// --- Symptom Logs ---

export async function createSymptomLog(input: {
  child_id: string;
  episode_id?: string | null;
  symptom_type: string;
  severity: string;
  logged_at: string;
  notes?: string | null;
}): Promise<SymptomEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO symptom_logs (
      id, child_id, episode_id, symptom_type, severity, logged_at, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.child_id,
      input.episode_id ?? null,
      input.symptom_type,
      input.severity,
      input.logged_at,
      input.notes ?? null,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    episode_id: input.episode_id ?? null,
    symptom_type: input.symptom_type as SymptomEntry["symptom_type"],
    severity: input.severity as SymptomEntry["severity"],
    logged_at: input.logged_at,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getSymptoms(
  childId: string,
  limit = 50,
): Promise<SymptomEntry[]> {
  const conn = await getDb();
  return conn.select<SymptomEntry[]>(
    "SELECT * FROM symptom_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function getSymptomsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<SymptomEntry[]> {
  const conn = await getDb();
  return conn.select<SymptomEntry[]>(
    `SELECT * FROM symptom_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startDate, endDate + "T23:59:59"],
  );
}

// --- Growth Logs ---

export async function createGrowthLog(input: {
  child_id: string;
  measured_at: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  head_circumference_cm?: number | null;
  notes?: string | null;
}): Promise<GrowthEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO growth_logs (
      id, child_id, measured_at, weight_kg, height_cm, head_circumference_cm, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.child_id,
      input.measured_at,
      input.weight_kg ?? null,
      input.height_cm ?? null,
      input.head_circumference_cm ?? null,
      input.notes ?? null,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    measured_at: input.measured_at,
    weight_kg: input.weight_kg ?? null,
    height_cm: input.height_cm ?? null,
    head_circumference_cm: input.head_circumference_cm ?? null,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getGrowthLogs(childId: string, limit = 50): Promise<GrowthEntry[]> {
  const conn = await getDb();
  return conn.select<GrowthEntry[]>(
    "SELECT * FROM growth_logs WHERE child_id = ? ORDER BY measured_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function getGrowthLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<GrowthEntry[]> {
  const conn = await getDb();
  return conn.select<GrowthEntry[]>(
    `SELECT * FROM growth_logs
     WHERE child_id = ? AND measured_at >= ? AND measured_at <= ?
     ORDER BY measured_at DESC`,
    [childId, startDate, `${endDate}T23:59:59`],
  );
}

export async function getLatestGrowthLog(childId: string): Promise<GrowthEntry | null> {
  const conn = await getDb();
  const rows = await conn.select<GrowthEntry[]>(
    "SELECT * FROM growth_logs WHERE child_id = ? ORDER BY measured_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function updateGrowthLog(
  id: string,
  updates: {
    measured_at?: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    head_circumference_cm?: number | null;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.measured_at !== undefined) { sets.push("measured_at = ?"); params.push(updates.measured_at); }
  if (updates.weight_kg !== undefined) { sets.push("weight_kg = ?"); params.push(updates.weight_kg); }
  if (updates.height_cm !== undefined) { sets.push("height_cm = ?"); params.push(updates.height_cm); }
  if (updates.head_circumference_cm !== undefined) { sets.push("head_circumference_cm = ?"); params.push(updates.head_circumference_cm); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(updates.notes); }

  if (sets.length === 0) return;

  params.push(id);
  await conn.execute(`UPDATE growth_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteGrowthLog(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM growth_logs WHERE id = ?", [id]);
}

// --- Sleep Logs ---

export async function createSleepLog(input: {
  child_id: string;
  sleep_type: string;
  started_at: string;
  ended_at: string;
  notes?: string | null;
}): Promise<SleepEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO sleep_logs (
      id, child_id, sleep_type, started_at, ended_at, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.child_id,
      input.sleep_type,
      input.started_at,
      input.ended_at,
      input.notes ?? null,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    sleep_type: input.sleep_type as SleepEntry["sleep_type"],
    started_at: input.started_at,
    ended_at: input.ended_at,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getSleepLogs(childId: string, limit = 50): Promise<SleepEntry[]> {
  const conn = await getDb();
  return conn.select<SleepEntry[]>(
    "SELECT * FROM sleep_logs WHERE child_id = ? ORDER BY started_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function updateSleepLog(
  id: string,
  updates: {
    sleep_type?: string;
    started_at?: string;
    ended_at?: string;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.sleep_type !== undefined) { sets.push("sleep_type = ?"); params.push(updates.sleep_type); }
  if (updates.started_at !== undefined) { sets.push("started_at = ?"); params.push(updates.started_at); }
  if (updates.ended_at !== undefined) { sets.push("ended_at = ?"); params.push(updates.ended_at); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(updates.notes); }

  if (sets.length === 0) return;
  params.push(id);
  await conn.execute(`UPDATE sleep_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteSleepLog(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM sleep_logs WHERE id = ?", [id]);
}

// --- Milestone Logs ---

export async function createMilestoneLog(input: {
  child_id: string;
  milestone_type: string;
  logged_at: string;
  notes?: string | null;
}): Promise<MilestoneEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    "INSERT INTO milestone_logs (id, child_id, milestone_type, logged_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, input.child_id, input.milestone_type, input.logged_at, input.notes ?? null, now],
  );

  return {
    id,
    child_id: input.child_id,
    milestone_type: input.milestone_type as MilestoneEntry["milestone_type"],
    logged_at: input.logged_at,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getMilestoneLogs(childId: string, limit = 50): Promise<MilestoneEntry[]> {
  const conn = await getDb();
  return conn.select<MilestoneEntry[]>(
    "SELECT * FROM milestone_logs WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
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

export async function hasAlertForLog(
  childId: string,
  alertType: string,
  relatedLogId: string,
): Promise<boolean> {
  const conn = await getDb();
  const rows = await conn.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt
     FROM alerts
     WHERE child_id = ? AND alert_type = ? AND related_log_id = ?`,
    [childId, alertType, relatedLogId],
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

export async function dismissAlert(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("UPDATE alerts SET is_dismissed = 1 WHERE id = ?", [id]);
}

// --- Feeding Logs ---

export async function createFeedingLog(input: {
  child_id: string;
  logged_at: string;
  food_type: string;
  food_name?: string | null;
  amount_ml?: number | null;
  duration_minutes?: number | null;
  breast_side?: string | null;
  bottle_content?: string | null;
  reaction_notes?: string | null;
  is_constipation_support?: number;
  notes?: string | null;
}): Promise<FeedingEntry> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO diet_logs (
      id, child_id, logged_at, food_type, food_name, amount_ml, duration_minutes,
      breast_side, bottle_content, reaction_notes, is_constipation_support, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.child_id,
      input.logged_at,
      input.food_type,
      input.food_name ?? null,
      input.amount_ml ?? null,
      input.duration_minutes ?? null,
      input.breast_side ?? null,
      input.bottle_content ?? null,
      input.reaction_notes ?? null,
      input.is_constipation_support ?? 0,
      input.notes ?? null,
      now,
    ],
  );

  return {
    id,
    child_id: input.child_id,
    logged_at: input.logged_at,
    food_type: input.food_type as FeedingEntry["food_type"],
    food_name: input.food_name ?? null,
    amount_ml: input.amount_ml ?? null,
    duration_minutes: input.duration_minutes ?? null,
    breast_side: (input.breast_side as FeedingEntry["breast_side"]) ?? null,
    bottle_content: (input.bottle_content as FeedingEntry["bottle_content"]) ?? null,
    reaction_notes: input.reaction_notes ?? null,
    is_constipation_support: input.is_constipation_support ?? 0,
    notes: input.notes ?? null,
    created_at: now,
  };
}

export async function getFeedingLogs(
  childId: string,
  limit = 100,
): Promise<FeedingEntry[]> {
  const conn = await getDb();
  return conn.select<FeedingEntry[]>(
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
    amount_ml?: number | null;
    duration_minutes?: number | null;
    breast_side?: string | null;
    bottle_content?: string | null;
    reaction_notes?: string | null;
    is_constipation_support?: number;
    notes?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.logged_at !== undefined) { sets.push("logged_at = ?"); params.push(updates.logged_at); }
  if (updates.food_type !== undefined) { sets.push("food_type = ?"); params.push(updates.food_type); }
  if (updates.food_name !== undefined) { sets.push("food_name = ?"); params.push(updates.food_name); }
  if (updates.amount_ml !== undefined) { sets.push("amount_ml = ?"); params.push(updates.amount_ml); }
  if (updates.duration_minutes !== undefined) { sets.push("duration_minutes = ?"); params.push(updates.duration_minutes); }
  if (updates.breast_side !== undefined) { sets.push("breast_side = ?"); params.push(updates.breast_side); }
  if (updates.bottle_content !== undefined) { sets.push("bottle_content = ?"); params.push(updates.bottle_content); }
  if (updates.reaction_notes !== undefined) { sets.push("reaction_notes = ?"); params.push(updates.reaction_notes); }
  if (updates.is_constipation_support !== undefined) { sets.push("is_constipation_support = ?"); params.push(updates.is_constipation_support); }
  if (updates.notes !== undefined) { sets.push("notes = ?"); params.push(updates.notes); }

  if (sets.length === 0) return;
  params.push(id);
  await conn.execute(`UPDATE diet_logs SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function deleteDietLog(id: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM diet_logs WHERE id = ?", [id]);
}

// --- Episodes ---

export async function createEpisode(input: {
  child_id: string;
  episode_type: string;
  started_at: string;
  summary?: string | null;
}): Promise<Episode> {
  const conn = await getDb();
  const active = await conn.select<{ id: string }[]>(
    "SELECT id FROM episodes WHERE child_id = ? AND status = 'active' LIMIT 1",
    [input.child_id],
  );

  if (active.length > 0) {
    throw new Error("An active episode already exists");
  }

  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO episodes (
      id, child_id, episode_type, status, started_at, ended_at, summary, outcome, created_at, updated_at
    ) VALUES (?, ?, ?, 'active', ?, NULL, ?, NULL, ?, ?)`,
    [id, input.child_id, input.episode_type, input.started_at, input.summary ?? null, now, now],
  );

  return {
    id,
    child_id: input.child_id,
    episode_type: input.episode_type as Episode["episode_type"],
    status: "active",
    started_at: input.started_at,
    ended_at: null,
    summary: input.summary ?? null,
    outcome: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getActiveEpisode(childId: string): Promise<Episode | null> {
  const conn = await getDb();
  const rows = await conn.select<Episode[]>(
    "SELECT * FROM episodes WHERE child_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    [childId],
  );
  return rows[0] ?? null;
}

export async function getEpisodes(childId: string, limit = 10): Promise<Episode[]> {
  const conn = await getDb();
  return conn.select<Episode[]>(
    "SELECT * FROM episodes WHERE child_id = ? ORDER BY started_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function closeEpisode(
  id: string,
  input: { ended_at: string; outcome?: string | null },
): Promise<void> {
  const conn = await getDb();
  await conn.execute(
    "UPDATE episodes SET status = 'resolved', ended_at = ?, outcome = ?, updated_at = ? WHERE id = ?",
    [input.ended_at, input.outcome ?? null, nowISO(), id],
  );
}

export async function createEpisodeEvent(input: {
  episode_id: string;
  child_id: string;
  event_type: string;
  title: string;
  notes?: string | null;
  logged_at: string;
}): Promise<EpisodeEvent> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();

  await conn.execute(
    `INSERT INTO episode_events (
      id, episode_id, child_id, event_type, title, notes, logged_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.episode_id, input.child_id, input.event_type, input.title, input.notes ?? null, input.logged_at, now],
  );

  return {
    id,
    episode_id: input.episode_id,
    child_id: input.child_id,
    event_type: input.event_type as EpisodeEvent["event_type"],
    title: input.title,
    notes: input.notes ?? null,
    logged_at: input.logged_at,
    created_at: now,
  };
}

export async function getEpisodeEvents(episodeId: string): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  return conn.select<EpisodeEvent[]>(
    "SELECT * FROM episode_events WHERE episode_id = ? ORDER BY logged_at DESC",
    [episodeId],
  );
}

export async function getEpisodeEventsByChild(childId: string, limit = 100): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  return conn.select<EpisodeEvent[]>(
    "SELECT * FROM episode_events WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
}

export async function getEpisodesForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<Episode[]> {
  const conn = await getDb();
  return conn.select<Episode[]>(
    `SELECT * FROM episodes
     WHERE child_id = ?
       AND started_at <= ?
       AND (ended_at IS NULL OR ended_at >= ?)
     ORDER BY started_at DESC`,
    [childId, endDate + "T23:59:59", startDate],
  );
}

export async function getEpisodeEventsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  return conn.select<EpisodeEvent[]>(
    `SELECT * FROM episode_events
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startDate, endDate + "T23:59:59"],
  );
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

export async function getFeedingLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<FeedingEntry[]> {
  const conn = await getDb();
  return conn.select<FeedingEntry[]>(
    `SELECT * FROM diet_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startDate, endDate + "T23:59:59"],
  );
}

export const createDietLog = createFeedingLog;
export const getDietLogs = getFeedingLogs;
export const getDietLogsForRange = getFeedingLogsForRange;
export const updateFeedingLog = updateDietLog;
export const deleteFeedingLog = deleteDietLog;

export async function getMilestonesForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<MilestoneEntry[]> {
  const conn = await getDb();
  return conn.select<MilestoneEntry[]>(
    `SELECT * FROM milestone_logs
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

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
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

export async function getLatestReportActivityDate(childId: string): Promise<string | null> {
  const conn = await getDb();
  const rows = await conn.select<{ logged_at: string }[]>(
    `SELECT MAX(logged_at) as logged_at
     FROM (
       SELECT logged_at FROM poop_logs WHERE child_id = ?
       UNION ALL
       SELECT logged_at FROM diet_logs WHERE child_id = ?
       UNION ALL
       SELECT logged_at FROM symptom_logs WHERE child_id = ?
       UNION ALL
       SELECT logged_at FROM milestone_logs WHERE child_id = ?
       UNION ALL
       SELECT measured_at as logged_at FROM growth_logs WHERE child_id = ?
       UNION ALL
       SELECT started_at as logged_at FROM sleep_logs WHERE child_id = ?
       UNION ALL
       SELECT started_at as logged_at FROM episodes WHERE child_id = ?
       UNION ALL
       SELECT logged_at FROM episode_events WHERE child_id = ?
     )`,
    [childId, childId, childId, childId, childId, childId, childId, childId],
  );

  return rows[0]?.logged_at ?? null;
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

export async function deleteSetting(key: string): Promise<void> {
  const conn = await getDb();
  await conn.execute("DELETE FROM app_settings WHERE key = ?", [key]);
}

// --- Quick Presets ---

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
