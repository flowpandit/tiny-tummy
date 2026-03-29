import { useState, useEffect, useCallback } from "react";
import type { Episode, EpisodeEvent } from "../lib/types";
import * as db from "../lib/db";

export function useEpisodes(childId: string | null) {
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [events, setEvents] = useState<EpisodeEvent[]>([]);
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!childId) {
      setActiveEpisode(null);
      setEvents([]);
      setRecentEpisodes([]);
      return;
    }

    setIsLoading(true);
    try {
      const [active, recent] = await Promise.all([
        db.getActiveEpisode(childId),
        db.getEpisodes(childId, 6),
      ]);

      setActiveEpisode(active);
      setRecentEpisodes(recent);

      if (active) {
        const episodeEvents = await db.getEpisodeEvents(active.id);
        setEvents(episodeEvents);
      } else {
        setEvents([]);
      }
    } catch {
      setActiveEpisode(null);
      setEvents([]);
      setRecentEpisodes([]);
    }
    setIsLoading(false);
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activeEpisode, events, recentEpisodes, isLoading, refresh };
}
