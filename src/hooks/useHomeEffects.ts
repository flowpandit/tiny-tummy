import { useEffect } from "react";
import { useDbClient } from "../contexts/DatabaseContext";
import type { Child, Episode, EpisodeEvent, FeedingEntry, PoopEntry } from "../lib/types";

interface UseHomeEffectsInput {
  activeChild: Child | null;
  episodeEvents: EpisodeEvent[];
  feedingLogs: FeedingEntry[];
  lastRealPoop: PoopEntry | null;
  refreshChildAlerts: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  syncChildReminders: () => Promise<void>;
  activeEpisode: Episode | null;
}

export function useHomeEffects({
  activeChild,
  activeEpisode,
  episodeEvents,
  feedingLogs,
  lastRealPoop,
  refreshChildAlerts,
  refreshLogs,
  syncChildReminders,
}: UseHomeEffectsInput) {
  const db = useDbClient();
  const latestFeedingLogId = feedingLogs[0]?.id;
  const latestFeedingLoggedAt = feedingLogs[0]?.logged_at;
  const latestEpisodeEventId = episodeEvents[0]?.id;
  const latestEpisodeEventLoggedAt = episodeEvents[0]?.logged_at;

  useEffect(() => {
    if (!activeChild) return;

    // Delay background cleanup to let the UI finish its initial render
    const timer = setTimeout(() => {
      db.reconcileAutoNoPoopDays(activeChild.id).then((changes: number) => {
        if (changes > 0) {
          void refreshLogs();
        }
      }).catch(() => {
        // Auto no-poop marking is non-critical
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    activeChild,
    refreshLogs,
  ]);

  useEffect(() => {
    if (!activeChild) return;
    syncChildReminders().catch(() => {
      // Reminder sync is non-critical
    });
  }, [
    activeChild,
    lastRealPoop?.id,
    lastRealPoop?.logged_at,
    lastRealPoop?.color,
    latestFeedingLogId,
    latestFeedingLoggedAt,
    activeEpisode?.id,
    activeEpisode?.status,
    activeEpisode?.episode_type,
    latestEpisodeEventId,
    latestEpisodeEventLoggedAt,
    syncChildReminders,
  ]);

  useEffect(() => {
    if (!activeChild) return;

    const check = () => refreshChildAlerts();
    check();

    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeChild, refreshChildAlerts]);
}
