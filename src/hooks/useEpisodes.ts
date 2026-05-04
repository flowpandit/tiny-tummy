import { useState, useEffect, useCallback, useRef } from "react";
import type { Episode, EpisodeEvent } from "../lib/types";
import { useDbClient } from "../contexts/DatabaseContext";

export function useEpisodes(childId: string | null) {
  const db = useDbClient();
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeEpisodes, setActiveEpisodes] = useState<Episode[]>([]);
  const [events, setEvents] = useState<EpisodeEvent[]>([]);
  const [activeEpisodeEventsById, setActiveEpisodeEventsById] = useState<Record<string, EpisodeEvent[]>>({});
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setActiveEpisode(null);
      setActiveEpisodes([]);
      setEvents([]);
      setActiveEpisodeEventsById({});
      setRecentEpisodes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let [activeRows, recent] = await Promise.all([
        db.getActiveEpisodes(childId),
        db.getEpisodes(childId, 6),
      ]);
      let active = activeRows[0] ?? null;

      for (const episode of activeRows.filter((row) => (row.episode_type as string) === "solids_transition")) {
        const milestoneLogs = await db.getMilestoneLogs(childId, 20);
        const hasStartedSolids = milestoneLogs.some((log) => log.milestone_type === "started_solids");

        if (!hasStartedSolids) {
          await db.createMilestoneLog({
            child_id: childId,
            milestone_type: "started_solids",
            logged_at: episode.started_at,
            notes: episode.summary ?? episode.outcome ?? null,
          });
        }

        await db.updateChild(childId, { feeding_type: "mixed" });
        await db.closeEpisode(episode.id, {
          ended_at: new Date().toISOString(),
          outcome: episode.outcome ?? "Moved to milestones",
        });

        [activeRows, recent] = await Promise.all([
          db.getActiveEpisodes(childId),
          db.getEpisodes(childId, 6),
        ]);
        active = activeRows[0] ?? null;
      }

      if (requestId !== requestIdRef.current) return;
      setActiveEpisode(active);
      setActiveEpisodes(activeRows);
      setRecentEpisodes(recent);

      if (activeRows.length > 0) {
        const episodeEventEntries = await Promise.all(
          activeRows.map(async (episode) => [episode.id, await db.getEpisodeEvents(episode.id)] as const),
        );
        const episodeEventsById = Object.fromEntries(episodeEventEntries);
        if (requestId !== requestIdRef.current) return;
        setActiveEpisodeEventsById(episodeEventsById);
        setEvents(active ? episodeEventsById[active.id] ?? [] : []);
      } else {
        setEvents([]);
        setActiveEpisodeEventsById({});
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setActiveEpisode(null);
      setActiveEpisodes([]);
      setEvents([]);
      setActiveEpisodeEventsById({});
      setRecentEpisodes([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setActiveEpisode(null);
    setActiveEpisodes([]);
    setEvents([]);
    setActiveEpisodeEventsById({});
    setRecentEpisodes([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { activeEpisode, activeEpisodes, events, activeEpisodeEventsById, recentEpisodes, isLoading, refresh };
}
