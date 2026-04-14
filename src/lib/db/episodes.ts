import type { Episode, EpisodeEvent } from "../types";
import { generateId, nowISO } from "../utils";
import { getDb } from "./connection";

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
