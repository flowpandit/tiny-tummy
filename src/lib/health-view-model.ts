import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "./episode-constants";
import { getSymptomSeverityLabel, getSymptomTypeLabel, getTemperatureMethodLabel } from "./symptom-constants";
import type { Episode, EpisodeEvent, SymptomEntry, TemperatureUnit } from "./types";
import { formatTemperatureValue } from "./units";

const DETAIL_SEPARATOR = " \u00b7 ";
const RECENT_SYMPTOM_WINDOW_MS = 72 * 60 * 60 * 1000;

export type HealthTimelineTone = "episode" | "symptom" | "fever" | "rash" | "severe" | "update";
export type HealthInsightTone = "healthy" | "info" | "caution" | "alert";
export type HealthInsightAction = "history" | "symptom" | "episode";

export interface HealthTimelineItem {
  id: string;
  kind: "episode" | "symptom" | "episode_event";
  title: string;
  meta: string;
  detail: string | null;
  loggedAt: string;
  tone: HealthTimelineTone;
}

export interface HealthInsightModel {
  tone: HealthInsightTone;
  eyebrow: string;
  title: string;
  description: string;
  action: HealthInsightAction;
  actionLabel: string;
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
    getTemperatureMethodLabel(symptom.temperature_method),
    symptom.notes,
  ].filter(Boolean);

  return parts.join(DETAIL_SEPARATOR) || "Symptom logged";
}

function getSeverityRank(symptom: SymptomEntry): number {
  if (symptom.severity === "severe") return 3;
  if (symptom.severity === "moderate") return 2;
  return 1;
}

function getRecentSymptoms(symptomLogs: SymptomEntry[], referenceDate: Date): SymptomEntry[] {
  const referenceTime = referenceDate.getTime();

  return symptomLogs.filter((symptom) => {
    const loggedAt = new Date(symptom.logged_at).getTime();
    return Number.isFinite(loggedAt)
      && loggedAt <= referenceTime
      && referenceTime - loggedAt <= RECENT_SYMPTOM_WINDOW_MS;
  });
}

function getRepeatedRecentSymptom(recentSymptoms: SymptomEntry[]): { symptom: SymptomEntry; count: number } | null {
  const counts = new Map<SymptomEntry["symptom_type"], { symptom: SymptomEntry; count: number }>();

  for (const symptom of recentSymptoms) {
    const current = counts.get(symptom.symptom_type);
    counts.set(symptom.symptom_type, {
      symptom: current?.symptom ?? symptom,
      count: (current?.count ?? 0) + 1,
    });
  }

  return [...counts.values()]
    .filter((entry) => entry.count >= 2)
    .sort((left, right) => right.count - left.count)[0] ?? null;
}

function getHighestPrioritySymptom(recentSymptoms: SymptomEntry[]): SymptomEntry | null {
  return [...recentSymptoms]
    .sort((left, right) => {
      const severityDelta = getSeverityRank(right) - getSeverityRank(left);
      if (severityDelta !== 0) return severityDelta;
      return new Date(right.logged_at).getTime() - new Date(left.logged_at).getTime();
    })[0] ?? null;
}

function getSymptomInsightDetail(symptom: SymptomEntry, temperatureUnit: TemperatureUnit): string {
  const detail = getSymptomDisplayDetail(symptom, temperatureUnit);
  return detail === "Symptom logged" ? getSymptomSeverityLabel(symptom.severity) : `${getSymptomSeverityLabel(symptom.severity)}${DETAIL_SEPARATOR}${detail}`;
}

export function buildHealthInsight({
  symptomLogs,
  activeEpisodes,
  temperatureUnit,
  referenceDate = new Date(),
}: {
  symptomLogs: SymptomEntry[];
  activeEpisodes: Episode[];
  temperatureUnit: TemperatureUnit;
  referenceDate?: Date;
}): HealthInsightModel {
  const activeEpisode = activeEpisodes[0] ?? null;
  if (activeEpisode) {
    const linkedSymptomCount = symptomLogs.filter((symptom) => symptom.episode_id === activeEpisode.id).length;
    return {
      tone: "caution",
      eyebrow: "Active episode",
      title: `${getEpisodeTypeLabel(activeEpisode.episode_type)} is still open`,
      description: linkedSymptomCount > 0
        ? `${linkedSymptomCount} symptom ${linkedSymptomCount === 1 ? "entry is" : "entries are"} linked. Add updates as temperature, feeding, sleep, or energy changes.`
        : "Add symptom updates here so the episode has a clear timeline if you need to review it later.",
      action: "episode",
      actionLabel: "Add update",
    };
  }

  const recentSymptoms = getRecentSymptoms(symptomLogs, referenceDate);
  const prioritySymptom = getHighestPrioritySymptom(recentSymptoms);
  if (prioritySymptom?.severity === "severe") {
    return {
      tone: "alert",
      eyebrow: "Needs attention",
      title: `${getSymptomTypeLabel(prioritySymptom.symptom_type)} was marked severe`,
      description: `${getSymptomInsightDetail(prioritySymptom, temperatureUnit)}. Start an episode if this needs a running timeline, and seek medical help if you are worried or symptoms worsen.`,
      action: "episode",
      actionLabel: "Start episode",
    };
  }

  const repeatedSymptom = getRepeatedRecentSymptom(recentSymptoms);
  if (repeatedSymptom) {
    return {
      tone: "info",
      eyebrow: "Pattern forming",
      title: `${getSymptomTypeLabel(repeatedSymptom.symptom.symptom_type)} has repeated`,
      description: `${repeatedSymptom.count} logs in the last 72 hours. Keeping them together can make history and reports easier to review.`,
      action: "episode",
      actionLabel: "Start episode",
    };
  }

  const latestSymptom = symptomLogs[0] ?? null;
  if (latestSymptom) {
    return {
      tone: latestSymptom.severity === "moderate" ? "caution" : "healthy",
      eyebrow: "Latest symptom",
      title: `${getSymptomTypeLabel(latestSymptom.symptom_type)} is in the timeline`,
      description: `${getSymptomInsightDetail(latestSymptom, temperatureUnit)}. Symptoms also help report exports and poop or diaper context read more clearly.`,
      action: "history",
      actionLabel: "View history",
    };
  }

  return {
    tone: "healthy",
    eyebrow: "Health insights",
    title: "Ready when something changes",
    description: "Symptom logs build a health timeline, can be linked into episodes, and appear in reports when you need a clear summary.",
    action: "symptom",
    actionLabel: "Log symptom",
  };
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
    .filter((event) => !(event.event_type === "symptom" && (event.source_kind === "symptom" || linkedSymptomKeys.has(`${event.episode_id}:${event.logged_at}`))))
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
