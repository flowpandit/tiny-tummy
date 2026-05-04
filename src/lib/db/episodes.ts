import type { Episode, EpisodeEvent } from "../types";
import { generateId, getUtcIsoBoundsForLocalDateRange, nowISO } from "../utils";
import { getDb } from "./connection";

type CreateEpisodeEventInput = {
  episode_id: string;
  child_id: string;
  event_type: string;
  title: string;
  notes?: string | null;
  logged_at: string;
  source_kind?: string | null;
  source_id?: string | null;
};

type EpisodeEventInsertPlan = {
  sql: string;
  params: unknown[];
  storedSourceKind: string | null;
  storedSourceId: string | null;
};

let canStoreEpisodeEventSourceColumnsCache: boolean | null = null;

async function canStoreEpisodeEventSourceColumns(conn: Awaited<ReturnType<typeof getDb>>): Promise<boolean> {
  if (canStoreEpisodeEventSourceColumnsCache !== null) {
    return canStoreEpisodeEventSourceColumnsCache;
  }

  const columns = await conn.select<Array<{ name: string }>>("PRAGMA table_info(episode_events)");
  const columnNames = new Set(columns.map((column) => column.name));
  canStoreEpisodeEventSourceColumnsCache = columnNames.has("source_kind") && columnNames.has("source_id");
  return canStoreEpisodeEventSourceColumnsCache;
}

function normalizeEpisodeEvent(row: EpisodeEvent): EpisodeEvent {
  return {
    ...row,
    source_kind: row.source_kind ?? null,
    source_id: row.source_id ?? null,
  };
}

export function buildEpisodeEventInsertPlan(
  input: CreateEpisodeEventInput,
  id: string,
  now: string,
  canStoreSourceColumns: boolean,
): EpisodeEventInsertPlan {
  const baseParams = [
    id,
    input.episode_id,
    input.child_id,
    input.event_type,
    input.title,
    input.notes ?? null,
    input.logged_at,
    now,
  ];

  if (!canStoreSourceColumns) {
    return {
      sql: `INSERT INTO episode_events (
        id, episode_id, child_id, event_type, title, notes, logged_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: baseParams,
      storedSourceKind: null,
      storedSourceId: null,
    };
  }

  const storedSourceKind = input.source_kind ?? null;
  const storedSourceId = input.source_id ?? null;

  return {
    sql: `INSERT INTO episode_events (
      id, episode_id, child_id, event_type, title, notes, logged_at, created_at, source_kind, source_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [...baseParams, storedSourceKind, storedSourceId],
    storedSourceKind,
    storedSourceId,
  };
}

export async function createEpisode(input: {
  child_id: string;
  episode_type: string;
  started_at: string;
  summary?: string | null;
}): Promise<Episode> {
  const conn = await getDb();
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

export async function getActiveEpisodes(childId: string): Promise<Episode[]> {
  const conn = await getDb();
  return conn.select<Episode[]>(
    "SELECT * FROM episodes WHERE child_id = ? AND status = 'active' ORDER BY started_at DESC",
    [childId],
  );
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

export async function updateEpisode(
  id: string,
  updates: {
    started_at?: string;
    summary?: string | null;
  },
): Promise<void> {
  const conn = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.started_at !== undefined) { sets.push("started_at = ?"); params.push(updates.started_at); }
  if (updates.summary !== undefined) { sets.push("summary = ?"); params.push(updates.summary); }

  if (sets.length === 0) return;

  sets.push("updated_at = ?");
  params.push(nowISO(), id);
  await conn.execute(`UPDATE episodes SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function createEpisodeEvent(input: CreateEpisodeEventInput): Promise<EpisodeEvent> {
  const conn = await getDb();
  const id = generateId();
  const now = nowISO();
  const canStoreSourceColumns = await canStoreEpisodeEventSourceColumns(conn);
  const insertPlan = buildEpisodeEventInsertPlan(input, id, now, canStoreSourceColumns);

  await conn.execute(insertPlan.sql, insertPlan.params);

  return {
    id,
    episode_id: input.episode_id,
    child_id: input.child_id,
    event_type: input.event_type as EpisodeEvent["event_type"],
    title: input.title,
    notes: input.notes ?? null,
    logged_at: input.logged_at,
    created_at: now,
    source_kind: insertPlan.storedSourceKind,
    source_id: insertPlan.storedSourceId,
  };
}

export async function deleteGeneratedSymptomEpisodeEvent(input: {
  symptomId: string;
  episodeId?: string | null;
  loggedAt?: string | null;
}): Promise<void> {
  const conn = await getDb();
  const canStoreSourceColumns = await canStoreEpisodeEventSourceColumns(conn);

  if (!canStoreSourceColumns) {
    if (!input.episodeId || !input.loggedAt) return;

    await conn.execute(
      "DELETE FROM episode_events WHERE event_type = 'symptom' AND episode_id = ? AND logged_at = ?",
      [input.episodeId, input.loggedAt],
    );
    return;
  }

  const params: unknown[] = ["symptom", input.symptomId];
  let fallback = "";

  if (input.episodeId && input.loggedAt) {
    fallback = " OR (source_kind IS NULL AND source_id IS NULL AND event_type = 'symptom' AND episode_id = ? AND logged_at = ?)";
    params.push(input.episodeId, input.loggedAt);
  }

  await conn.execute(
    `DELETE FROM episode_events WHERE (source_kind = ? AND source_id = ?)${fallback}`,
    params,
  );
}

export async function getEpisodeEvents(episodeId: string): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  const rows = await conn.select<EpisodeEvent[]>(
    "SELECT * FROM episode_events WHERE episode_id = ? ORDER BY logged_at DESC",
    [episodeId],
  );
  return rows.map(normalizeEpisodeEvent);
}

export async function getEpisodeEventsByChild(childId: string, limit = 100): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  const rows = await conn.select<EpisodeEvent[]>(
    "SELECT * FROM episode_events WHERE child_id = ? ORDER BY logged_at DESC LIMIT ?",
    [childId, limit],
  );
  return rows.map(normalizeEpisodeEvent);
}

export async function getEpisodesForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<Episode[]> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  return conn.select<Episode[]>(
    `SELECT * FROM episodes
     WHERE child_id = ?
       AND started_at <= ?
       AND (ended_at IS NULL OR ended_at >= ?)
     ORDER BY started_at DESC`,
    [childId, endUtcIso, startUtcIso],
  );
}

export async function getEpisodeEventsForRange(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<EpisodeEvent[]> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);
  const rows = await conn.select<EpisodeEvent[]>(
    `SELECT * FROM episode_events
     WHERE child_id = ? AND logged_at >= ? AND logged_at <= ?
     ORDER BY logged_at DESC`,
    [childId, startUtcIso, endUtcIso],
  );
  return rows.map(normalizeEpisodeEvent);
}
