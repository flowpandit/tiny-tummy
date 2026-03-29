import { getDietEntryDisplayLabel } from "./feeding";
import { getEpisodeTypeLabel } from "./episode-constants";
import { formatDate, timeSince } from "./utils";
import type { Alert, DietEntry, Episode, EpisodeEvent, HealthStatus, PoopEntry } from "./types";

export function getStatusLabel(status: HealthStatus): string {
  if (status === "healthy") return "All looks normal";
  if (status === "caution") return "Keep an eye on it";
  if (status === "alert") return "Needs attention";
  return "Status unavailable";
}

export function getLastPoopSummary(lastPoop: PoopEntry | null): string {
  if (!lastPoop) return "No poop logged yet";
  return `${timeSince(lastPoop.logged_at)} (${formatDate(lastPoop.logged_at)})`;
}

export function getLastFeedSummary(lastFeed: DietEntry | null): string {
  if (!lastFeed) return "No feed logged yet";
  return `${getDietEntryDisplayLabel(lastFeed)} · ${timeSince(lastFeed.logged_at)}`;
}

export function buildHandoffSummary(input: {
  childName: string;
  status: HealthStatus;
  normalDescription: string;
  alerts: Alert[];
  lastPoop: PoopEntry | null;
  lastFeed: DietEntry | null;
  activeEpisode: Episode | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  todayPoops: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  handoffNote: string | null;
}): string {
  const lines = [
    `${input.childName} handoff`,
    `Status: ${getStatusLabel(input.status)}`,
    input.normalDescription ? `Range: ${input.normalDescription}` : null,
    `Last poop: ${getLastPoopSummary(input.lastPoop)}`,
    `Last feed: ${getLastFeedSummary(input.lastFeed)}`,
    `Today: ${input.todayPoops} poop${input.todayPoops !== 1 ? "s" : ""}, ${input.todayFeeds} feed${input.todayFeeds !== 1 ? "s" : ""}${input.hasNoPoopDay ? ", no-poop day marked" : ""}`,
    input.alerts.length > 0
      ? `Alerts: ${input.alerts.map((alert) => alert.title).join("; ")}`
      : "Alerts: none active",
    input.activeEpisode
      ? `Episode: ${getEpisodeTypeLabel(input.activeEpisode.episode_type)} (${input.activeEpisode.status})`
      : "Episode: none active",
    input.latestEpisodeUpdate
      ? `Latest episode update: ${input.latestEpisodeUpdate.title} · ${formatDate(input.latestEpisodeUpdate.logged_at)}`
      : null,
    input.handoffNote?.trim() ? `Caregiver note: ${input.handoffNote.trim()}` : null,
  ];

  return lines.filter(Boolean).join("\n");
}
