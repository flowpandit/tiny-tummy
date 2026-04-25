import type { FeedingEntry } from "../types";
import { generateId, getUtcIsoBoundsForLocalDateRange, nowISO } from "../utils";
import { getDb } from "./connection";

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

export async function getFeedingLogsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<FeedingEntry[]> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<FeedingEntry[]>(
    `SELECT * FROM diet_logs
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startUtcIso, endUtcIso],
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

export const createDietLog = createFeedingLog;
export const getDietLogs = getFeedingLogs;
export const getDietLogsForRange = getFeedingLogsForRange;
export const updateFeedingLog = updateDietLog;
export const deleteFeedingLog = deleteDietLog;
