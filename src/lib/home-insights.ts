import { diaperIncludesStool, getDiaperTypeLabel, getUrineColorLabel } from "./diaper";
import { getFeedingEntryDetailParts, getFeedingEntryPrimaryLabel } from "./feeding";
import { getFeedBaseline, getFeedPrediction } from "./feed-insights";
import { BITSS_TYPES } from "./constants";
import { formatLocalDateKey, getAgeLabelFromDob, isOnLocalDay, timeSince } from "./utils";
import { formatSleepDuration, getCompletedSleepLogs, getDurationMinutes, getSleepPrediction, getWakeBaseline } from "./sleep-insights";
import type {
  Alert,
  Child,
  ChildSex,
  DiaperEntry,
  FeedingEntry,
  PoopEntry,
  SleepEntry,
} from "./types";
import type { ChildDailySummary } from "./child-summary";

export interface HomeSleepSummary {
  totalMs: number;
  hoursValue: number;
  label: string;
  napCount: number;
}

export interface HomeStatusMessage {
  greeting: string;
  title: string;
  detail: string;
  tone: "calm" | "watch";
}

export interface HomeInsightCard {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: "poop" | "hydration" | "sleep";
}

export interface HomeRecommendationCard {
  title: string;
  detail: string;
  accent: "feed" | "hydration" | "sleep" | "general";
}

export interface HomeTimelineItem {
  id: string;
  sourceId: string;
  kind: "feed" | "diaper" | "poop";
  timeLabel: string;
  title: string;
  detail: string;
  accent: "feed" | "diaper" | "poop";
}

export interface HomeGlanceStat {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: "hydration" | "poop" | "feed" | "sleep";
}

export interface HomeAssistantModel {
  status: HomeStatusMessage;
  insights: HomeInsightCard[];
  recommendation: HomeRecommendationCard;
  timeline: HomeTimelineItem[];
  glanceStats: HomeGlanceStat[];
}

function formatClock(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) return "Good morning, Mom 👋";
  if (hour < 18) return "Good afternoon, Mom 👋";
  return "Good evening, Mom 👋";
}

function getPronoun(sex: ChildSex | null): "He" | "She" | "They" {
  if (sex === "male") return "He";
  if (sex === "female") return "She";
  return "They";
}

function formatSleepWindow(predictedAt: Date, now = Date.now()): string {
  const diffMinutes = Math.round((predictedAt.getTime() - now) / 60000);

  if (Math.abs(diffMinutes) < 15) return "Now";
  if (diffMinutes > 0) {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) return `In ~${minutes}m`;
    if (minutes === 0) return `In ~${hours}h`;
    return `In ~${hours}h ${minutes}m`;
  }

  const overdueMinutes = Math.abs(diffMinutes);
  if (overdueMinutes < 60) return `${overdueMinutes}m ago`;

  const overdueHours = Math.round(overdueMinutes / 60);
  return `${overdueHours}h ago`;
}

function getRecentPoopEntries(poopLogs: PoopEntry[], diaperLogs: DiaperEntry[], dayKey: string) {
  const directPoops = poopLogs.filter((entry) => isOnLocalDay(entry.logged_at, dayKey) && entry.is_no_poop === 0);
  const diaperPoops = diaperLogs.filter((entry) => isOnLocalDay(entry.logged_at, dayKey) && diaperIncludesStool(entry.diaper_type));
  return { directPoops, diaperPoops };
}

function getLastPoopLog(poopLogs: PoopEntry[], diaperLogs: DiaperEntry[]): { logged_at: string } | null {
  const candidates = [
    ...poopLogs.filter((entry) => entry.is_no_poop === 0).map((entry) => ({ logged_at: entry.logged_at })),
    ...diaperLogs.filter((entry) => diaperIncludesStool(entry.diaper_type)).map((entry) => ({ logged_at: entry.logged_at })),
  ].sort((left, right) => new Date(right.logged_at).getTime() - new Date(left.logged_at).getTime());

  return candidates[0] ?? null;
}

function buildStatusMessage(input: {
  child: Child;
  alerts: Alert[];
  summary: ChildDailySummary;
  feedPredictionTitle: string | null;
  sleepPredictionTitle: string | null;
}): HomeStatusMessage {
  const greeting = getGreeting();
  const childName = input.child.name;
  const hasWatchAlert = input.alerts.some((alert) => alert.severity === "warning" || alert.severity === "urgent");

  if (hasWatchAlert || input.summary.hasNoPoopDay) {
    return {
      greeting,
      title: `${childName} needs a quick check`,
      detail: "A couple of things are worth a closer look today.",
      tone: "watch",
    };
  }

  if (input.sleepPredictionTitle) {
    return {
      greeting,
      title: `${childName} is doing great`,
      detail: "Here's what's happening today.",
      tone: "calm",
    };
  }

  if (input.feedPredictionTitle) {
    return {
      greeting,
      title: `${childName} is doing great`,
      detail: "Here's what's happening today.",
      tone: "calm",
    };
  }

  return {
    greeting,
    title: `${childName} is doing great`,
    detail: "Here's what's happening today.",
    tone: "calm",
  };
}

function buildPoopInsight(summary: ChildDailySummary, poopLogs: PoopEntry[], diaperLogs: DiaperEntry[], dayKey: string): HomeInsightCard {
  const { directPoops, diaperPoops } = getRecentPoopEntries(poopLogs, diaperLogs, dayKey);
  const lastPoop = getLastPoopLog(poopLogs, diaperLogs);
  const totalTodayPoops = Math.max(summary.todayPoops, directPoops.length, diaperPoops.length);

  if (totalTodayPoops > 0 && lastPoop) {
    return {
      id: "poop",
      label: "Poop update",
      value: `${totalTodayPoops} today`,
      detail: `${timeSince(lastPoop.logged_at).replace(" ago", "")} since last`,
      accent: "poop",
    };
  }

  if (lastPoop) {
    return {
      id: "poop",
      label: "Poop update",
      value: "No poop yet",
      detail: `${timeSince(lastPoop.logged_at).replace(" ago", "")} since last`,
      accent: "poop",
    };
  }

  return {
    id: "poop",
    label: "Poop update",
    value: "No poop yet",
    detail: "Log one when it happens today.",
    accent: "poop",
  };
}

function buildHydrationInsight(summary: ChildDailySummary): HomeInsightCard {
  if (summary.todayWetDiapers > 0) {
    return {
      id: "hydration",
      label: "Hydration",
      value: "Hydration looks good",
      detail: summary.todayWetDiapers === 1 ? "1 wet diaper today" : `${summary.todayWetDiapers} wet diapers today`,
      accent: "hydration",
    };
  }

  return {
    id: "hydration",
    label: "Hydration",
    value: "No wet diaper yet",
    detail: "Keep an eye on hydration through the day.",
    accent: "hydration",
  };
}

function buildSleepInsight(child: Child, sleepLogs: SleepEntry[]): HomeInsightCard {
  const sleepPrediction = getSleepPrediction(sleepLogs, getWakeBaseline(child.date_of_birth));
  const completedSleepLogs = getCompletedSleepLogs(sleepLogs);
  const lastSleep = completedSleepLogs[0] ?? null;

  if (sleepPrediction) {
    return {
      id: "sleep",
      label: "Next sleep window",
      value: "Next sleep window",
      detail: `${formatSleepWindow(sleepPrediction.predictedAt)} • Ideal time: ${sleepPrediction.predictedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
      accent: "sleep",
    };
  }

  if (lastSleep) {
    return {
      id: "sleep",
      label: "Last sleep",
      value: formatSleepDuration(getDurationMinutes(lastSleep)),
      detail: `${formatSleepDuration(getDurationMinutes(lastSleep))} • Ended ${timeSince(lastSleep.ended_at)}`,
      accent: "sleep",
    };
  }

  return {
    id: "sleep",
    label: "Next sleep window",
    value: "No sleep yet",
    detail: "Once sleep is logged, the next window will appear here.",
    accent: "sleep",
  };
}

function buildRecommendation(input: {
  child: Child;
  summary: ChildDailySummary;
  feedLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  includeHydration: boolean;
}): HomeRecommendationCard {
  const feedPrediction = getFeedPrediction(input.feedLogs, getFeedBaseline(input.child.date_of_birth, input.child.feeding_type));
  const sleepPrediction = getSleepPrediction(input.sleepLogs, getWakeBaseline(input.child.date_of_birth));
  const pronoun = getPronoun(input.child.sex);

  if (feedPrediction && (feedPrediction.state === "due" || feedPrediction.state === "overdue")) {
    return {
      title: "Log the next feed now",
      detail: `${pronoun} usually feeds around this time.`,
      accent: "feed",
    };
  }

  if (feedPrediction) {
    return {
      title: `Log next feed ${formatSleepWindow(feedPrediction.predictedAt).toLowerCase()}`,
      detail: `${pronoun} usually feeds around this time.`,
      accent: "feed",
    };
  }

  if (sleepPrediction && (sleepPrediction.state === "due" || sleepPrediction.state === "overdue")) {
    return {
      title: "Sleep window opening soon",
      detail: "A nap may be the next helpful step.",
      accent: "sleep",
    };
  }

  if (sleepPrediction) {
    return {
      title: `Watch for the next nap ${formatSleepWindow(sleepPrediction.predictedAt).toLowerCase()}`,
      detail: "A little rest may be coming up soon.",
      accent: "sleep",
    };
  }

  if (input.includeHydration && input.summary.todayWetDiapers === 0) {
    return {
      title: "Check hydration",
      detail: "A wet diaper update will help round out today’s picture.",
      accent: "hydration",
    };
  }

  return {
    title: "Keep logging the day as it unfolds",
    detail: "Small updates here make the bigger patterns easier to spot later.",
    accent: "general",
  };
}

function buildTimeline(poops: PoopEntry[], diapers: DiaperEntry[], feedings: FeedingEntry[], dayKey: string): HomeTimelineItem[] {
  const poopItems = poops
    .filter((entry) => isOnLocalDay(entry.logged_at, dayKey) && entry.is_no_poop === 0)
    .map((entry) => ({
      id: `poop-${entry.id}`,
      logged_at: entry.logged_at,
      item: {
        id: `poop-${entry.id}`,
        sourceId: entry.id,
        kind: "poop" as const,
        timeLabel: formatClock(entry.logged_at),
        title: "Poop",
        detail: [
          entry.stool_type ? BITSS_TYPES.find((item) => item.type === entry.stool_type)?.label : null,
          entry.size ? `${entry.size[0].toUpperCase()}${entry.size.slice(1)}` : null,
        ].filter(Boolean).join(" • ") || "Logged",
        accent: "poop" as const,
      },
    }));

  const diaperItems = diapers
    .filter((entry) => isOnLocalDay(entry.logged_at, dayKey))
    .map((entry) => ({
      id: `diaper-${entry.id}`,
      logged_at: entry.logged_at,
      item: {
        id: `diaper-${entry.id}`,
        sourceId: entry.id,
        kind: "diaper" as const,
        timeLabel: formatClock(entry.logged_at),
        title: getDiaperTypeLabel(entry.diaper_type),
        detail: [getUrineColorLabel(entry.urine_color), entry.notes].filter(Boolean).join(" • ") || "Logged",
        accent: "diaper" as const,
      },
    }));

  const feedItems = feedings
    .filter((entry) => isOnLocalDay(entry.logged_at, dayKey))
    .map((entry) => ({
      id: `feed-${entry.id}`,
      logged_at: entry.logged_at,
      item: {
        id: `feed-${entry.id}`,
        sourceId: entry.id,
        kind: "feed" as const,
        timeLabel: formatClock(entry.logged_at),
        title: getFeedingEntryPrimaryLabel(entry),
        detail: getFeedingEntryDetailParts(entry).join(" • ") || "Logged",
        accent: "feed" as const,
      },
    }));

  return [...poopItems, ...diaperItems, ...feedItems]
    .sort((left, right) => new Date(left.logged_at).getTime() - new Date(right.logged_at).getTime())
    .slice(0, 4)
    .map((entry) => entry.item);
}

function buildGlanceStats(input: {
  summary: ChildDailySummary;
  sleepLogs: SleepEntry[];
  poopLogs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  dayKey: string;
}): HomeGlanceStat[] {
  const { directPoops, diaperPoops } = getRecentPoopEntries(input.poopLogs, input.diaperLogs, input.dayKey);
  const totalPoops = Math.max(input.summary.todayPoops, directPoops.length, diaperPoops.length);

  return [
    {
      id: "wet-diapers",
      label: "Wet diapers",
      value: String(input.summary.todayWetDiapers),
      detail: input.summary.todayWetDiapers > 0 ? "Good" : "None yet",
      accent: "hydration",
    },
    {
      id: "poops",
      label: "Poops",
      value: String(totalPoops),
      detail: totalPoops > 0 ? "Today" : "None yet",
      accent: "poop",
    },
    {
      id: "feeds",
      label: "Feeds",
      value: String(input.summary.todayFeeds),
      detail: input.summary.todayFeeds > 0 ? "Today" : "None yet",
      accent: "feed",
    },
    {
      id: "naps",
      label: "Naps",
      value: String(getCompletedSleepLogs(input.sleepLogs).filter((entry) => isOnLocalDay(entry.started_at, input.dayKey) && entry.sleep_type === "nap").length),
      detail: "Today",
      accent: "sleep",
    },
  ];
}

export function buildHomeAssistantModel(input: {
  child: Child;
  summary: ChildDailySummary;
  poopLogs: PoopEntry[];
  diaperLogs: DiaperEntry[];
  feedingLogs: FeedingEntry[];
  sleepLogs: SleepEntry[];
  alerts: Alert[];
  includeHydration?: boolean;
  now?: Date;
}): HomeAssistantModel {
  const dayKey = formatLocalDateKey(input.now ?? new Date());
  const includeHydration = input.includeHydration ?? true;
  const feedPrediction = getFeedPrediction(input.feedingLogs, getFeedBaseline(input.child.date_of_birth, input.child.feeding_type));
  const sleepPrediction = getSleepPrediction(input.sleepLogs, getWakeBaseline(input.child.date_of_birth));
  const status = buildStatusMessage({
    child: input.child,
    alerts: input.alerts,
    summary: input.summary,
    feedPredictionTitle: feedPrediction && (feedPrediction.state === "due" || feedPrediction.state === "overdue")
      ? `${input.child.name} may be ready to feed soon`
      : null,
    sleepPredictionTitle: sleepPrediction && (sleepPrediction.state === "due" || sleepPrediction.state === "overdue")
      ? `${input.child.name}'s sleep window is opening`
      : null,
  });

  return {
    status,
    insights: [
      buildPoopInsight(input.summary, input.poopLogs, input.diaperLogs, dayKey),
      includeHydration ? buildHydrationInsight(input.summary) : null,
      buildSleepInsight(input.child, input.sleepLogs),
    ].filter((insight): insight is HomeInsightCard => insight !== null),
    recommendation: buildRecommendation({
      child: input.child,
      summary: input.summary,
      feedLogs: input.feedingLogs,
      sleepLogs: input.sleepLogs,
      includeHydration,
    }),
    timeline: buildTimeline(input.poopLogs, input.diaperLogs, input.feedingLogs, dayKey),
    glanceStats: buildGlanceStats({
      summary: input.summary,
      sleepLogs: input.sleepLogs,
      poopLogs: input.poopLogs,
      diaperLogs: input.diaperLogs,
      dayKey,
    }),
  };
}

export function buildHomeSleepSummary(sleepLogs: SleepEntry[], now = Date.now()): HomeSleepSummary {
  const totalMs = sleepLogs
    .filter((entry) => now - new Date(entry.started_at).getTime() < 24 * 60 * 60 * 1000)
    .reduce((sum, entry) => {
      const end = entry.ended_at ? new Date(entry.ended_at).getTime() : now;
      const start = new Date(entry.started_at).getTime();
      return sum + Math.max(0, end - start);
    }, 0);

  const napCount = sleepLogs.filter((entry) => entry.sleep_type === "nap").length;
  const wholeHours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.round((totalMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    totalMs,
    hoursValue: totalMs / (1000 * 60 * 60),
    label: totalMs > 0 ? `${wholeHours}h ${minutes}m` : "0h",
    napCount,
  };
}

export function getHomeHeaderAgeLabel(dateOfBirth: string): string {
  return getAgeLabelFromDob(dateOfBirth);
}
