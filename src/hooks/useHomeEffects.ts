import { useEffect } from "react";
import * as db from "../lib/db";
import { syncSmartRemindersForChildren } from "../lib/notifications";
import type { Child, Episode, EpisodeEvent, FeedingEntry, PoopEntry, SymptomEntry } from "../lib/types";

interface UseHomeEffectsInput {
  activeChild: Child | null;
  children: Child[];
  episodeEvents: EpisodeEvent[];
  feedingLogs: FeedingEntry[];
  lastRealPoop: PoopEntry | null;
  latestPoopLogId?: string;
  recentEpisodes: Episode[];
  refreshChildAlerts: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  syncChildReminders: () => Promise<void>;
  symptomLogs: SymptomEntry[];
  activeEpisode: Episode | null;
}

export function useHomeEffects({
  activeChild,
  activeEpisode,
  children,
  episodeEvents,
  feedingLogs,
  lastRealPoop,
  latestPoopLogId,
  recentEpisodes,
  refreshChildAlerts,
  refreshLogs,
  syncChildReminders,
  symptomLogs,
}: UseHomeEffectsInput) {
  const latestFeedingLogId = feedingLogs[0]?.id;
  const latestFeedingLoggedAt = feedingLogs[0]?.logged_at;
  const latestRecentEpisodeId = recentEpisodes[0]?.id;
  const latestSymptomLogId = symptomLogs[0]?.id;
  const latestEpisodeEventId = episodeEvents[0]?.id;
  const latestEpisodeEventLoggedAt = episodeEvents[0]?.logged_at;

  useEffect(() => {
    if (children.length === 0) return;
    syncSmartRemindersForChildren(children).catch(() => {
      // Reminder sync is non-critical
    });
  }, [children]);

  useEffect(() => {
    if (!activeChild) return;
    db.reconcileAutoNoPoopDays(activeChild.id).then((changes: number) => {
      if (changes > 0) {
        void refreshLogs();
      }
    }).catch(() => {
      // Auto no-poop marking is non-critical
    });
  }, [
    activeChild,
    latestPoopLogId,
    latestFeedingLogId,
    latestRecentEpisodeId,
    latestSymptomLogId,
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
