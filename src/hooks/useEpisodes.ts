import { useState, useEffect, useCallback, useRef } from "react";
import type { Episode, EpisodeEvent } from "../lib/types";
import { useDbClient } from "../contexts/DatabaseContext";

export function useEpisodes(childId: string | null) {
  const db = useDbClient();
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [events, setEvents] = useState<EpisodeEvent[]>([]);
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!childId) {
      setActiveEpisode(null);
      setEvents([]);
      setRecentEpisodes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let [active, recent] = await Promise.all([
        db.getActiveEpisode(childId),
        db.getEpisodes(childId, 6),
      ]);

      if (active && (active.episode_type as string) === "solids_transition") {
        const milestoneLogs = await db.getMilestoneLogs(childId, 20);
        const hasStartedSolids = milestoneLogs.some((log) => log.milestone_type === "started_solids");

        if (!hasStartedSolids) {
          await db.createMilestoneLog({
            child_id: childId,
            milestone_type: "started_solids",
            logged_at: active.started_at,
            notes: active.summary ?? active.outcome ?? null,
          });
        }

        await db.updateChild(childId, { feeding_type: "mixed" });
        await db.closeEpisode(active.id, {
          ended_at: new Date().toISOString(),
          outcome: active.outcome ?? "Moved to milestones",
        });

        [active, recent] = await Promise.all([
          db.getActiveEpisode(childId),
          db.getEpisodes(childId, 6),
        ]);
      }

      if (requestId !== requestIdRef.current) return;
      setActiveEpisode(active);
      setRecentEpisodes(recent);

      if (active) {
        const episodeEvents = await db.getEpisodeEvents(active.id);
        if (requestId !== requestIdRef.current) return;
        setEvents(episodeEvents);
      } else {
        setEvents([]);
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setActiveEpisode(null);
      setEvents([]);
      setRecentEpisodes([]);
    }

    if (requestId === requestIdRef.current) {
      setIsLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    setActiveEpisode(null);
    setEvents([]);
    setRecentEpisodes([]);
    setIsLoading(Boolean(childId));
    void refresh();
  }, [childId, refresh]);

  return { activeEpisode, events, recentEpisodes, isLoading, refresh };
}
