import { getFeedingEntryDisplayLabel } from "./feeding";
import { getEpisodeTypeLabel } from "./episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "./symptom-constants";
import { formatDate, timeSince } from "./utils";
import type { Alert, Episode, EpisodeEvent, FeedingEntry, HealthStatus, PoopEntry, SymptomEntry, UnitSystem } from "./types";

export function getStatusLabel(status: HealthStatus): string {
  if (status === "healthy") return "All looks normal";
  if (status === "caution") return "Keep an eye on it";
  if (status === "alert") return "Needs attention";
  return "Status unavailable";
}

export function deriveHandoffOverview(input: {
  baseStatus: HealthStatus;
  baseDescription: string;
  alerts: Alert[];
  activeEpisode: Episode | null;
  latestEpisodeUpdate: EpisodeEvent | null;
  recentSymptoms: SymptomEntry[];
}): { status: HealthStatus; description: string } {
  const highestPriorityAlert = input.alerts.find((alert) => alert.severity === "urgent")
    ?? input.alerts.find((alert) => alert.severity === "warning")
    ?? input.alerts.find((alert) => alert.severity === "info");

  if (highestPriorityAlert) {
    return {
      status: highestPriorityAlert.severity === "urgent" ? "alert" : "caution",
      description: highestPriorityAlert.message?.trim()
        ? `${highestPriorityAlert.title}: ${highestPriorityAlert.message.trim()}`
        : highestPriorityAlert.title,
    };
  }

  const severeSymptom = input.recentSymptoms.find((symptom) => symptom.severity === "severe");
  if (severeSymptom) {
    return {
      status: "alert",
      description: severeSymptom.notes?.trim()
        ? severeSymptom.notes.trim()
        : `Recent symptom: ${getSymptomTypeLabel(severeSymptom.symptom_type)} (${getSymptomSeverityLabel(severeSymptom.severity).toLowerCase()}).`,
    };
  }

  if (input.activeEpisode) {
    const episodeSummary = input.activeEpisode.summary?.trim();
    const latestUpdate = input.latestEpisodeUpdate
      ? ` Latest update: ${input.latestEpisodeUpdate.title}.`
      : "";

    return {
      status: "caution",
      description: episodeSummary
        ? episodeSummary
        : `${getEpisodeTypeLabel(input.activeEpisode.episode_type)} episode is active.${latestUpdate}`,
    };
  }

  const recentSymptom = input.recentSymptoms[0];
  if (recentSymptom) {
    return {
      status: recentSymptom.severity === "severe" ? "alert" : "caution",
      description: recentSymptom.notes?.trim()
        ? recentSymptom.notes.trim()
        : `Recent symptom: ${getSymptomTypeLabel(recentSymptom.symptom_type)} (${getSymptomSeverityLabel(recentSymptom.severity).toLowerCase()}).`,
    };
  }

  return {
    status: input.baseStatus,
    description: input.baseDescription,
  };
}

export function getLastPoopSummary(lastPoop: PoopEntry | null): string {
  if (!lastPoop) return "No poop logged yet";
  return `${timeSince(lastPoop.logged_at)} (${formatDate(lastPoop.logged_at)})`;
}

export function getLastFeedSummary(lastFeed: FeedingEntry | null, unitSystem: UnitSystem = "metric"): string {
  if (!lastFeed) return "No feed logged yet";
  return `${getFeedingEntryDisplayLabel(lastFeed, unitSystem)} · ${timeSince(lastFeed.logged_at)}`;
}

export function buildHandoffSummary(input: {
  childName: string;
  status: HealthStatus;
  statusDescription: string;
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
  unitSystem?: UnitSystem;
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
    input.statusDescription
      ? `${input.status === "healthy" ? "Expected range" : "Focus"}: ${input.statusDescription}`
      : null,
    "",
    `Last poop: ${getLastPoopSummary(input.lastPoop)}`,
    `Last feed: ${getLastFeedSummary(input.lastFeed, input.unitSystem ?? "metric")}`,
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
