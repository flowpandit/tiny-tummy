import { useState, useEffect, useCallback, useRef } from "react";
import type { Episode, EpisodeEvent } from "../lib/types";
import * as db from "../lib/db";

export function useEpisodes(childId: string | null) {
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
      const [active, recent] = await Promise.all([
        db.getActiveEpisode(childId),
        db.getEpisodes(childId, 6),
      ]);

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
