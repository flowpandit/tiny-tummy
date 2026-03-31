import { getFeedingEntryDisplayLabel } from "./feeding";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "./symptom-constants";
import { formatDate, timeSince } from "./utils";
import type { Alert, Episode, EpisodeEvent, FeedingEntry, HealthStatus, PoopEntry, SymptomEntry } from "./types";

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

export function getLastFeedSummary(lastFeed: FeedingEntry | null): string {
  if (!lastFeed) return "No feed logged yet";
  return `${getFeedingEntryDisplayLabel(lastFeed)} · ${timeSince(lastFeed.logged_at)}`;
}

export function buildHandoffSummary(input: {
  childName: string;
  status: HealthStatus;
  normalDescription: string;
  alerts: Alert[];
  lastPoop: PoopEntry | null;
  lastFeed: FeedingEntry | null;
  activeEpisode: Episode | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  recentSymptoms: SymptomEntry[];
  todayPoops: number;
  todayFeeds: number;
  hasNoPoopDay: boolean;
  handoffNote: string | null;
}): string {
  const alertLine = input.alerts.length > 0
    ? input.alerts.map((alert) => alert.title).join("; ")
    : "No active alerts";
  const episodeLine = input.activeEpisode
    ? `${getEpisodeTypeLabel(input.activeEpisode.episode_type)} still active`
    : "No active episode";
  const symptomLine = input.recentSymptoms.length > 0
    ? input.recentSymptoms
        .slice(0, 2)
        .map((symptom) => `${getSymptomTypeLabel(symptom.symptom_type)} (${getSymptomSeverityLabel(symptom.severity).toLowerCase()})`)
        .join("; ")
    : "No recent symptoms logged";

  const lines = [
    `${input.childName} handoff update`,
    "",
    `Right now: ${getStatusLabel(input.status)}`,
    input.normalDescription ? `Expected range: ${input.normalDescription}` : null,
    "",
    `Last poop: ${getLastPoopSummary(input.lastPoop)}`,
    `Last feed: ${getLastFeedSummary(input.lastFeed)}`,
    `Today so far: ${input.todayPoops} poop${input.todayPoops !== 1 ? "s" : ""}, ${input.todayFeeds} feed${input.todayFeeds !== 1 ? "s" : ""}${input.hasNoPoopDay ? ", no-poop day marked" : ""}`,
    "",
    `Current concern: ${alertLine}`,
    `Episode: ${episodeLine}`,
    `Recent symptoms: ${symptomLine}`,
    input.latestEpisodeUpdate
      ? `Latest episode update: ${input.latestEpisodeUpdate.title} · ${formatDate(input.latestEpisodeUpdate.logged_at)}`
      : null,
    input.handoffNote?.trim() ? "" : null,
    input.handoffNote?.trim() ? `Next caregiver note: ${input.handoffNote.trim()}` : null,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}
