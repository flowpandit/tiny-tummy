import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "./episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel } from "./symptom-constants";
import type { Episode, EpisodeEvent, SymptomEntry, TemperatureUnit } from "./types";
import { formatTemperatureValue } from "./units";

const DETAIL_SEPARATOR = " \u00b7 ";

export type HealthTimelineTone = "episode" | "symptom" | "fever" | "rash" | "severe" | "update";

export interface HealthTimelineItem {
  id: string;
  kind: "episode" | "symptom" | "episode_event";
  title: string;
  meta: string;
  detail: string | null;
  loggedAt: string;
  tone: HealthTimelineTone;
}

interface HealthDateTimeOptions {
  locale?: string;
  timeZone?: string;
}

export function formatHealthDateTime(value: string, options: HealthDateTimeOptions = {}): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Logged";

  const dateLabel = new Intl.DateTimeFormat(options.locale, {
    day: "numeric",
    month: "short",
    timeZone: options.timeZone,
  }).format(parsed);
  const timeLabel = new Intl.DateTimeFormat(options.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  }).format(parsed).toLowerCase().replace(/\s+/g, " ");

  return `${dateLabel} at ${timeLabel}`;
}

export function formatHealthElapsedDuration(startedAt: string, referenceDate = new Date()): string {
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return "recently";

  const elapsedMinutes = Math.max(0, Math.floor((referenceDate.getTime() - started.getTime()) / 60000));
  if (elapsedMinutes < 60) return "<1h";

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;

  const days = Math.floor(elapsedHours / 24);
  const hours = elapsedHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function formatHealthStartedLine(
  startedAt: string,
  referenceDate = new Date(),
  dateTimeOptions: HealthDateTimeOptions = {},
): string {
  return `Started ${formatHealthDateTime(startedAt, dateTimeOptions)}${DETAIL_SEPARATOR}${formatHealthElapsedDuration(startedAt, referenceDate)}`;
}

export function getSymptomDisplayDetail(symptom: SymptomEntry, temperatureUnit: TemperatureUnit): string {
  const parts = [
    symptom.temperature_c !== null ? formatTemperatureValue(symptom.temperature_c, temperatureUnit) : null,
    symptom.notes,
  ].filter(Boolean);

  return parts.join(DETAIL_SEPARATOR) || "Symptom logged";
}

function getSymptomTone(symptom: SymptomEntry): HealthTimelineTone {
  if (symptom.severity === "severe") return "severe";
  if (symptom.symptom_type === "fever") return "fever";
  if (symptom.symptom_type === "rash") return "rash";
  return "symptom";
}

function getEpisodeEventTone(event: EpisodeEvent): HealthTimelineTone {
  if (event.event_type === "temperature") return "fever";
  if (event.event_type === "symptom") return "symptom";
  return "update";
}

export function buildHealthTimeline({
  episodes,
  episodeEvents,
  symptomLogs,
  temperatureUnit,
  limit = 4,
}: {
  episodes: Episode[];
  episodeEvents: EpisodeEvent[];
  symptomLogs: SymptomEntry[];
  temperatureUnit: TemperatureUnit;
  limit?: number;
}): HealthTimelineItem[] {
  const linkedSymptomKeys = new Set(
    symptomLogs
      .filter((symptom) => symptom.episode_id)
      .map((symptom) => `${symptom.episode_id}:${symptom.logged_at}`),
  );

  const episodeItems: HealthTimelineItem[] = episodes.map((episode) => ({
    id: `episode-${episode.id}`,
    kind: "episode",
    title: `${getEpisodeTypeLabel(episode.episode_type)} started`,
    meta: formatHealthDateTime(episode.started_at),
    detail: episode.summary ?? episode.outcome,
    loggedAt: episode.started_at,
    tone: "episode",
  }));

  const symptomItems: HealthTimelineItem[] = symptomLogs.map((symptom) => ({
    id: `symptom-${symptom.id}`,
    kind: "symptom",
    title: getSymptomTypeLabel(symptom.symptom_type),
    meta: `${formatHealthDateTime(symptom.logged_at)}${DETAIL_SEPARATOR}${getSymptomSeverityLabel(symptom.severity)}`,
    detail: getSymptomDisplayDetail(symptom, temperatureUnit),
    loggedAt: symptom.logged_at,
    tone: getSymptomTone(symptom),
  }));

  const eventItems: HealthTimelineItem[] = episodeEvents
    .filter((event) => !(event.event_type === "symptom" && linkedSymptomKeys.has(`${event.episode_id}:${event.logged_at}`)))
    .map((event) => ({
      id: `episode-event-${event.id}`,
      kind: "episode_event",
      title: event.title || `${getEpisodeEventTypeLabel(event.event_type)} update`,
      meta: `${formatHealthDateTime(event.logged_at)}${DETAIL_SEPARATOR}${getEpisodeEventTypeLabel(event.event_type)}`,
      detail: event.notes,
      loggedAt: event.logged_at,
      tone: getEpisodeEventTone(event),
    }));

  return [...episodeItems, ...symptomItems, ...eventItems]
    .sort((left, right) => new Date(right.loggedAt).getTime() - new Date(left.loggedAt).getTime())
    .slice(0, limit);
}
