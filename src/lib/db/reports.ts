import type { FeedingEntry } from "../types";
import { getUtcIsoBoundsForLocalDateRange, parseLocalDate } from "../utils";
import { getDb } from "./connection";

export async function getReportStats(
  childId: string,
  startDate: string,
  endDate: string,
): Promise<{ totalPoops: number; totalNoPoop: number; avgPerDay: number; mostCommonType: number | null; mostCommonColor: string | null }> {
  const conn = await getDb();
  const { startUtcIso, endUtcIso } = getUtcIsoBoundsForLocalDateRange(startDate, endDate);

  const countRows = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM poop_logs WHERE child_id = ? AND deleted_at IS NULL AND is_no_poop = 0 AND logged_at >= ? AND logged_at <= ?`,
    [childId, startUtcIso, endUtcIso],
  );
  const noPoopRows = await conn.select<{ total: number }[]>(
    `SELECT COUNT(*) as total FROM poop_logs WHERE child_id = ? AND deleted_at IS NULL AND is_no_poop = 1 AND logged_at >= ? AND logged_at <= ?`,
    [childId, startUtcIso, endUtcIso],
  );

  const totalPoops = countRows[0]?.total ?? 0;
  const totalNoPoop = noPoopRows[0]?.total ?? 0;

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgPerDay = Math.round((totalPoops / daysDiff) * 10) / 10;

  const typeRows = await conn.select<{ stool_type: number; cnt: number }[]>(
    `SELECT stool_type, COUNT(*) as cnt FROM poop_logs
     WHERE child_id = ? AND deleted_at IS NULL AND is_no_poop = 0 AND stool_type IS NOT NULL AND logged_at >= ? AND logged_at <= ?
     GROUP BY stool_type ORDER BY cnt DESC LIMIT 1`,
    [childId, startUtcIso, endUtcIso],
  );

  const colorRows = await conn.select<{ color: string; cnt: number }[]>(
    `SELECT color, COUNT(*) as cnt FROM poop_logs
     WHERE child_id = ? AND deleted_at IS NULL AND is_no_poop = 0 AND color IS NOT NULL AND logged_at >= ? AND logged_at <= ?
     GROUP BY color ORDER BY cnt DESC LIMIT 1`,
    [childId, startUtcIso, endUtcIso],
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
         SELECT logged_at FROM poop_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT logged_at FROM diet_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT logged_at FROM symptom_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT logged_at FROM milestone_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT measured_at as logged_at FROM growth_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT started_at as logged_at FROM sleep_logs WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT started_at as logged_at FROM episodes WHERE child_id = ? AND deleted_at IS NULL
         UNION ALL
         SELECT logged_at FROM episode_events WHERE child_id = ? AND deleted_at IS NULL
       )`,
    [childId, childId, childId, childId, childId, childId, childId, childId],
  );

  return rows[0]?.logged_at ?? null;
}

export type { FeedingEntry };
