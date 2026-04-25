import type { Alert, GrowthEntry, MilestoneEntry, SleepEntry, SymptomEntry } from "../types";
import { generateId, getUtcIsoBoundsForLocalDateRange, nowISO } from "../utils";
import { getDb } from "./connection";

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
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<SymptomEntry[]>(
    `SELECT * FROM symptom_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startUtcIso, endUtcIso],
  );
}

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
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<GrowthEntry[]>(
    `SELECT * FROM growth_logs
     WHERE child_id = ? AND measured_at >= ? AND measured_at <= ?
     ORDER BY measured_at DESC`,
    [childId, startUtcIso, endUtcIso],
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

export async function getSleepLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<SleepEntry[]> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<SleepEntry[]>(
    `SELECT * FROM sleep_logs
     WHERE child_id = ? AND started_at >= ? AND started_at <= ?
     ORDER BY started_at DESC`,
    [childId, startUtcIso, endUtcIso],
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

export async function getMilestonesForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<MilestoneEntry[]> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<MilestoneEntry[]>(
    `SELECT * FROM milestone_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startUtcIso, endUtcIso],
  );
}

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
