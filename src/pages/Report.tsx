import { useState, useRef } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useChildContext } from "../contexts/ChildContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageIntro } from "../components/ui/page-intro";
import { DatePicker } from "../components/ui/date-picker";
import { Badge } from "../components/ui/badge";
import { getAgeLabelFromDob, formatDate } from "../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { getDietEntryDisplayLabel, getDietEntrySecondaryText } from "../lib/feeding";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getMilestoneTypeLabel } from "../lib/milestone-constants";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { loadPhotoDataUrl } from "../lib/photos";
import * as db from "../lib/db";
import { useToast } from "../components/ui/toast";
import type { DietEntry, Episode, EpisodeEvent, MilestoneEntry, PoopEntry, SymptomEntry } from "../lib/types";

interface EpisodeReportGroup {
  episode: Episode;
  events: EpisodeEvent[];
}

interface ReportHighlight {
  tone: "alert" | "caution" | "info";
  title: string;
  detail: string;
}

interface ReportOptions {
  includeFeeds: boolean;
  includeEpisodes: boolean;
  includeEpisodeSummary: boolean;
  includeSymptoms: boolean;
  includeMilestones: boolean;
  includeNotes: boolean;
  includeCaregiverNote: boolean;
  includePhotos: boolean;
}

interface ReportData {
  logs: PoopEntry[];
  dietLogs: DietEntry[];
  episodeGroups: EpisodeReportGroup[];
  activeEpisodeGroup: EpisodeReportGroup | null;
  symptomLogs: SymptomEntry[];
  milestoneLogs: MilestoneEntry[];
  caregiverNote: string | null;
  photoUrls: Record<string, string>;
  highlights: ReportHighlight[];
  stats: {
    totalPoops: number;
    totalNoPoop: number;
    avgPerDay: number;
    mostCommonType: number | null;
    mostCommonColor: string | null;
  };
}

export function Report() {
  const { activeChild } = useChildContext();
  const reportRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ReportOptions>({
    includeFeeds: true,
    includeEpisodes: true,
    includeEpisodeSummary: true,
    includeSymptoms: true,
    includeMilestones: true,
    includeNotes: true,
    includeCaregiverNote: true,
    includePhotos: true,
  });

  if (!activeChild) return null;
  const child = activeChild;

  const typeLabel = (type: number) =>
    BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
  const colorLabel = (color: string) =>
    STOOL_COLORS.find((c) => c.value === color)?.label ?? color;

  function getLongestNoPoopStreak(logs: PoopEntry[]): number {
    const dates = [...new Set(
      logs
        .filter((log) => log.is_no_poop === 1)
        .map((log) => log.logged_at.split("T")[0]),
    )].sort();

    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let index = 1; index < dates.length; index += 1) {
      const previous = new Date(`${dates[index - 1]}T00:00:00`);
      const next = new Date(`${dates[index]}T00:00:00`);
      const dayDiff = (next.getTime() - previous.getTime()) / 86400000;

      if (dayDiff === 1) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return longest;
  }

  function buildHighlights(data: {
    logs: PoopEntry[];
    dietLogs: DietEntry[];
    episodeGroups: EpisodeReportGroup[];
    symptomLogs: SymptomEntry[];
    milestoneLogs: MilestoneEntry[];
  }): ReportHighlight[] {
    const highlights: ReportHighlight[] = [];
    const redFlagLogs = data.logs.filter((log) => {
      const colorInfo = log.color ? STOOL_COLORS.find((item) => item.value === log.color) : null;
      return log.is_no_poop === 0 && colorInfo?.isRedFlag;
    });
    const hardStoolCount = data.logs.filter((log) => (log.stool_type ?? 99) <= 2).length;
    const looseStoolCount = data.logs.filter((log) => (log.stool_type ?? 0) >= 6).length;
    const longestNoPoopStreak = getLongestNoPoopStreak(data.logs);
    const activeEpisode = data.episodeGroups.find((group) => group.episode.status === "active");
    const severeSymptoms = data.symptomLogs.filter((log) => log.severity === "severe");
    const strainingCount = data.symptomLogs.filter((log) => log.symptom_type === "straining").length;
    const latestMilestone = data.milestoneLogs[0] ?? null;

    if (redFlagLogs.length > 0) {
      const lastRedFlag = redFlagLogs[0];
      highlights.push({
        tone: "alert",
        title: "Red-flag stool logged",
        detail: `${colorLabel(lastRedFlag.color ?? "")} stool appears in this period and should be reviewed in context.`,
      });
    }

    if (longestNoPoopStreak >= 2) {
      highlights.push({
        tone: "caution",
        title: "No-poop streak recorded",
        detail: `Longest marked no-poop streak was ${longestNoPoopStreak} day${longestNoPoopStreak !== 1 ? "s" : ""}.`,
      });
    }

    if (hardStoolCount >= 2) {
      highlights.push({
        tone: "caution",
        title: "Hard stool pattern",
        detail: `${hardStoolCount} stool entr${hardStoolCount === 1 ? "y" : "ies"} were Type 1-2 during this period.`,
      });
    }

    if (looseStoolCount >= 2) {
      highlights.push({
        tone: "alert",
        title: "Loose stool pattern",
        detail: `${looseStoolCount} stool entr${looseStoolCount === 1 ? "y" : "ies"} were Type 6-7 during this period.`,
      });
    }

    if (activeEpisode) {
      highlights.push({
        tone: "info",
        title: "Active episode in progress",
        detail: `${getEpisodeTypeLabel(activeEpisode.episode.episode_type)} is still active with ${activeEpisode.events.length} update${activeEpisode.events.length !== 1 ? "s" : ""}.`,
      });
    } else if (data.episodeGroups.length > 0) {
      highlights.push({
        tone: "info",
        title: "Episode history recorded",
        detail: `${data.episodeGroups.length} episode${data.episodeGroups.length !== 1 ? "s" : ""} captured in this date range.`,
      });
    }

    if (severeSymptoms.length > 0) {
      highlights.push({
        tone: "alert",
        title: "Severe symptom logged",
        detail: `${getSymptomTypeLabel(severeSymptoms[0].symptom_type)} was marked severe during this period.`,
      });
    } else if (strainingCount >= 2) {
      highlights.push({
        tone: "caution",
        title: "Repeated straining logged",
        detail: `${strainingCount} straining symptom entr${strainingCount === 1 ? "y" : "ies"} were recorded in this period.`,
      });
    }

    if (latestMilestone && highlights.length < 4) {
      highlights.push({
        tone: "info",
        title: "Recent context milestone logged",
        detail: `${getMilestoneTypeLabel(latestMilestone.milestone_type)} was recorded on ${formatDate(latestMilestone.logged_at)}.`,
      });
    }

    if (highlights.length === 0) {
      highlights.push({
        tone: "info",
        title: "No major changes highlighted",
        detail: "This period does not include red-flag colors, marked no-poop streaks, severe symptoms, or episode activity.",
      });
    }

    return highlights.slice(0, 4);
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    const [logs, dietLogs, episodes, episodeEvents, symptomLogs, milestoneLogs, caregiverNote, stats] = await Promise.all([
      db.getPoopLogsForRange(activeChild.id, startDate, endDate),
      db.getDietLogsForRange(activeChild.id, startDate, endDate),
      db.getEpisodesForRange(activeChild.id, startDate, endDate),
      db.getEpisodeEventsForRange(activeChild.id, startDate, endDate),
      db.getSymptomsForRange(activeChild.id, startDate, endDate),
      db.getMilestonesForRange(activeChild.id, startDate, endDate),
      db.getSetting(`handoff_note:${activeChild.id}`),
      db.getReportStats(activeChild.id, startDate, endDate),
    ]);

    const episodeGroups: EpisodeReportGroup[] = episodes.map((episode) => ({
      episode,
      events: episodeEvents.filter((event) => event.episode_id === episode.id),
    }));
    const activeEpisodeGroup = episodeGroups.find((group) => group.episode.status === "active") ?? null;
    const photoUrls = Object.fromEntries(
      (await Promise.all(
        logs
          .filter((log) => log.photo_path)
          .map(async (log) => {
            try {
              return [log.id, await loadPhotoDataUrl(log.photo_path!)] as const;
            } catch {
              return null;
            }
          }),
      )).filter((entry): entry is readonly [string, string] => entry !== null),
    );

    const highlights = buildHighlights({ logs, dietLogs, episodeGroups, symptomLogs, milestoneLogs });

    setReportData({
      logs,
      dietLogs,
      episodeGroups,
      activeEpisodeGroup,
      symptomLogs,
      milestoneLogs,
      caregiverNote,
      photoUrls,
      highlights,
      stats,
    });
    setIsGenerating(false);
  };

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildPrintableHtml(data: ReportData): string {
    const logEntries = data.logs.filter((log) => !log.is_no_poop || log.is_no_poop === 1);
    const entriesHtml = data.logs.length === 0
      ? '<p class="empty">No entries in this date range.</p>'
      : logEntries.map((log) => {
          const colorInfo = log.color ? STOOL_COLORS.find((c) => c.value === log.color) : null;
          const dotColor = log.is_no_poop
            ? "#98a2b3"
            : colorInfo?.hex ?? "#98a2b3";
          const label = log.is_no_poop
            ? "No poop"
            : log.stool_type
              ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
              : "Logged";
          return `
            <tr>
              <td class="date">${escapeHtml(formatDate(log.logged_at))}</td>
              <td class="entry">
                <span class="dot" style="background:${dotColor}"></span>
                ${escapeHtml(label)}
                ${options.includeNotes && log.notes ? `<div class="subtle note">${escapeHtml(log.notes)}</div>` : ""}
              </td>
              <td class="size">${escapeHtml(log.size ?? "—")}</td>
            </tr>
          `;
        }).join("");

    const feedEntriesHtml = data.dietLogs.length === 0
      ? '<p class="empty">No feeds or meals in this date range.</p>'
      : data.dietLogs.map((log) => `
          <tr>
            <td class="date">${escapeHtml(formatDate(log.logged_at))}</td>
            <td class="entry">${escapeHtml(getDietEntryDisplayLabel(log))}</td>
            <td class="size">${escapeHtml(options.includeNotes ? (getDietEntrySecondaryText(log) ?? "—") : "—")}</td>
          </tr>
        `).join("");

    const episodeEntriesHtml = data.episodeGroups.length === 0
      ? '<p class="empty">No episodes in this date range.</p>'
      : data.episodeGroups.map(({ episode, events }) => `
          <div class="episode">
            <p class="episode-title">${escapeHtml(getEpisodeTypeLabel(episode.episode_type))} · ${escapeHtml(episode.status === "active" ? "Active" : "Resolved")}</p>
            <p class="subtle">${escapeHtml(formatDate(episode.started_at))}${episode.ended_at ? ` to ${escapeHtml(formatDate(episode.ended_at))}` : ""}</p>
            ${options.includeNotes && episode.summary ? `<p class="episode-copy">${escapeHtml(episode.summary)}</p>` : ""}
            ${options.includeNotes && episode.outcome ? `<p class="episode-copy"><strong>Outcome:</strong> ${escapeHtml(episode.outcome)}</p>` : ""}
            ${events.length > 0 ? `
              <ul class="episode-list">
                ${events.map((event) => `
                  <li>
                    <strong>${escapeHtml(event.title)}</strong>
                    <span class="subtle"> · ${escapeHtml(getEpisodeEventTypeLabel(event.event_type))} · ${escapeHtml(formatDate(event.logged_at))}</span>
                    ${options.includeNotes && event.notes ? `<div class="subtle">${escapeHtml(event.notes)}</div>` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : ""}
          </div>
        `).join("");

    const symptomEntriesHtml = data.symptomLogs.length === 0
      ? '<p class="empty">No symptoms in this date range.</p>'
      : data.symptomLogs.map((log) => `
          <tr>
            <td class="date">${escapeHtml(formatDate(log.logged_at))}</td>
            <td class="entry">
              ${escapeHtml(getSymptomTypeLabel(log.symptom_type))}
              <div class="subtle note">${escapeHtml(getSymptomSeverityLabel(log.severity))}</div>
              ${options.includeNotes && log.notes ? `<div class="subtle note">${escapeHtml(log.notes)}</div>` : ""}
            </td>
            <td class="size">${escapeHtml(log.episode_id ? "Episode-linked" : "Standalone")}</td>
          </tr>
        `).join("");

    const milestoneEntriesHtml = data.milestoneLogs.length === 0
      ? '<p class="empty">No milestones in this date range.</p>'
      : data.milestoneLogs.map((log) => `
          <tr>
            <td class="date">${escapeHtml(formatDate(log.logged_at))}</td>
            <td class="entry">
              ${escapeHtml(getMilestoneTypeLabel(log.milestone_type))}
              ${options.includeNotes && log.notes ? `<div class="subtle note">${escapeHtml(log.notes)}</div>` : ""}
            </td>
            <td class="size">Context</td>
          </tr>
        `).join("");

    const photoEntriesHtml = data.logs.filter((log) => log.photo_path && data.photoUrls[log.id]).length === 0
      ? '<p class="empty">No photos in this date range.</p>'
      : data.logs
          .filter((log) => log.photo_path && data.photoUrls[log.id])
          .map((log) => `
            <div class="photo-card">
              <img class="photo-thumb" src="${data.photoUrls[log.id]}" alt="Stool log photo" />
              <div class="photo-copy">
                <p><strong>${escapeHtml(formatDate(log.logged_at))}</strong></p>
                <p class="subtle">${escapeHtml(
                  log.is_no_poop
                    ? "No poop day"
                    : log.stool_type
                      ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
                      : "Logged stool",
                )}</p>
                ${log.color ? `<p class="subtle">Color: ${escapeHtml(colorLabel(log.color))}</p>` : ""}
                ${options.includeNotes && log.notes ? `<p class="subtle note">${escapeHtml(log.notes)}</p>` : ""}
              </div>
            </div>
          `).join("");

    const highlightsHtml = data.highlights.map((highlight) => `
      <div class="highlight highlight-${highlight.tone}">
        <strong>${escapeHtml(highlight.title)}</strong>
        <p class="subtle" style="margin-top:6px;">${escapeHtml(highlight.detail)}</p>
      </div>
    `).join("");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tiny Tummy Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #fff8f1;
        --surface: #ffffff;
        --ink: #2b3956;
        --ink-soft: #647392;
        --line: rgba(112, 88, 69, 0.14);
        --coral: #ff8b69;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: var(--bg);
      }
      .report {
        max-width: 760px;
        margin: 0 auto;
      }
      .card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 20px;
        margin-bottom: 16px;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 32px; margin-bottom: 10px; }
      .subtle { color: var(--ink-soft); }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .stat {
        padding: 14px;
        border-radius: 16px;
        background: #fff8f1;
        border: 1px solid var(--line);
        text-align: center;
      }
      .stat strong {
        display: block;
        font-size: 24px;
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
      }
      td {
        padding: 10px 0;
        border-bottom: 1px solid var(--line);
        vertical-align: middle;
      }
      tr:last-child td { border-bottom: 0; }
      .date, .size {
        color: var(--ink-soft);
        white-space: nowrap;
      }
      .entry {
        width: 100%;
        padding-left: 8px;
      }
      .dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 999px;
        margin-right: 8px;
        vertical-align: middle;
      }
      .empty {
        color: var(--ink-soft);
        text-align: center;
        padding: 18px 0 4px;
      }
      .note {
        margin-top: 4px;
      }
      .highlight-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }
      .highlight {
        border-radius: 16px;
        padding: 14px;
        border: 1px solid var(--line);
        background: #fff8f1;
      }
      .highlight-alert {
        background: #fff2ef;
      }
      .highlight-caution {
        background: #fff7ea;
      }
      .highlight-info {
        background: #f4f9ff;
      }
      .episode + .episode {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .photo-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
        background: #fff8f1;
      }
      .photo-thumb {
        display: block;
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
      }
      .photo-copy {
        padding: 12px;
      }
      .episode-title {
        font-size: 16px;
        font-weight: 600;
      }
      .episode-copy {
        margin-top: 8px;
        line-height: 1.5;
      }
      .episode-list {
        margin: 10px 0 0;
        padding-left: 18px;
      }
      .episode-list li + li {
        margin-top: 8px;
      }
      .footer {
        margin-top: 10px;
        color: var(--ink-soft);
        font-size: 12px;
        text-align: center;
      }
      @media print {
        body { background: white; padding: 0; }
        .card { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <section class="card">
        <h1>${escapeHtml(child.name)} Report</h1>
        <p class="subtle">${escapeHtml(getAgeLabelFromDob(child.date_of_birth))} · ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</p>
        <p class="subtle" style="margin-top:8px;">Generated by Tiny Tummy on ${escapeHtml(new Date().toLocaleDateString())}</p>
      </section>

      <section class="card">
        <h2>Summary</h2>
        <div class="grid">
          <div class="stat">
            <strong>${data.stats.totalPoops}</strong>
            <span class="subtle">Total poops</span>
          </div>
          <div class="stat">
            <strong>${data.stats.avgPerDay}</strong>
            <span class="subtle">Avg per day</span>
          </div>
          <div class="stat">
            <strong>${escapeHtml(data.stats.mostCommonType ? typeLabel(data.stats.mostCommonType) : "—")}</strong>
            <span class="subtle">Most common type</span>
          </div>
          <div class="stat">
            <strong>${escapeHtml(data.stats.mostCommonColor ? colorLabel(data.stats.mostCommonColor) : "—")}</strong>
            <span class="subtle">Most common color</span>
          </div>
        </div>
        ${data.stats.totalNoPoop > 0 ? `<p class="subtle" style="margin-top:12px;text-align:center;">${data.stats.totalNoPoop} no-poop day${data.stats.totalNoPoop > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.dietLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.dietLogs.length} feed${data.dietLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.symptomLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.symptomLogs.length} symptom${data.symptomLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.episodeGroups.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.episodeGroups.length} episode${data.episodeGroups.length > 1 ? "s" : ""} captured</p>` : ""}
        ${data.milestoneLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.milestoneLogs.length} milestone${data.milestoneLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        <div class="highlight-list">
          ${highlightsHtml}
        </div>
      </section>

      ${options.includeCaregiverNote && data.caregiverNote ? `
        <section class="card">
          <h2>Caregiver Note</h2>
          <p class="episode-copy">${escapeHtml(data.caregiverNote)}</p>
        </section>
      ` : ""}

      ${options.includeEpisodeSummary && data.activeEpisodeGroup ? `
        <section class="card">
          <h2>Active Episode Summary</h2>
          <p class="episode-title">${escapeHtml(getEpisodeTypeLabel(data.activeEpisodeGroup.episode.episode_type))}</p>
          <p class="subtle" style="margin-top:6px;">Started ${escapeHtml(formatDate(data.activeEpisodeGroup.episode.started_at))}</p>
          ${data.activeEpisodeGroup.episode.summary ? `<p class="episode-copy">${escapeHtml(data.activeEpisodeGroup.episode.summary)}</p>` : ""}
          ${data.activeEpisodeGroup.events[0] ? `<p class="episode-copy"><strong>Latest update:</strong> ${escapeHtml(data.activeEpisodeGroup.events[0].title)} · ${escapeHtml(formatDate(data.activeEpisodeGroup.events[0].logged_at))}</p>` : ""}
          ${data.activeEpisodeGroup.episode.outcome ? `<p class="episode-copy"><strong>Outcome:</strong> ${escapeHtml(data.activeEpisodeGroup.episode.outcome)}</p>` : ""}
        </section>
      ` : ""}

      <section class="card">
        <h2>Log Entries (${data.logs.length})</h2>
        ${data.logs.length === 0 ? entriesHtml : `<table><tbody>${entriesHtml}</tbody></table>`}
      </section>

      ${options.includeFeeds ? `
        <section class="card">
          <h2>Feeds & Meals (${data.dietLogs.length})</h2>
          ${data.dietLogs.length === 0 ? feedEntriesHtml : `<table><tbody>${feedEntriesHtml}</tbody></table>`}
        </section>
      ` : ""}

      ${options.includeSymptoms ? `
        <section class="card">
          <h2>Symptoms (${data.symptomLogs.length})</h2>
          ${data.symptomLogs.length === 0 ? symptomEntriesHtml : `<table><tbody>${symptomEntriesHtml}</tbody></table>`}
        </section>
      ` : ""}

      ${options.includeMilestones ? `
        <section class="card">
          <h2>Milestones (${data.milestoneLogs.length})</h2>
          ${data.milestoneLogs.length === 0 ? milestoneEntriesHtml : `<table><tbody>${milestoneEntriesHtml}</tbody></table>`}
        </section>
      ` : ""}

      ${options.includePhotos ? `
        <section class="card">
          <h2>Photos</h2>
          ${data.logs.filter((log) => log.photo_path && data.photoUrls[log.id]).length === 0 ? photoEntriesHtml : `<div class="photo-grid">${photoEntriesHtml}</div>`}
        </section>
      ` : ""}

      ${options.includeEpisodes ? `
        <section class="card">
          <h2>Episodes (${data.episodeGroups.length})</h2>
          ${episodeEntriesHtml}
        </section>
      ` : ""}

      <p class="footer">Open your browser or system share/print menu to save this as PDF.</p>
    </main>
  </body>
</html>`;
  }

  const handlePrint = async () => {
    if (!reportData) return;

    const currentPlatform = platform();
    const isMobile = currentPlatform === "android" || currentPlatform === "ios";

    if (!isMobile) {
      window.print();
      return;
    }

    try {
      const fileName = `tiny-tummy-report-${startDate}-to-${endDate}.html`;
      const targetPath = await save({
        defaultPath: fileName,
        filters: [
          {
            name: "HTML report",
            extensions: ["html", "text/html"],
          },
        ],
      });

      if (!targetPath) {
        return;
      }

      await writeTextFile(targetPath, buildPrintableHtml(reportData));
      showSuccess("Report saved successfully.");
    } catch {
      showError("Could not save the report export. Please try again.");
    }
  };

  return (
    <div className="px-4 py-5">
      <PageIntro
        eyebrow="Share"
        title="Report"
        description="Generate a poop and feeding summary to share with your doctor."
      />

      {/* Date range picker */}
      <Card className="mb-5">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                From
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                max={endDate}
                label="Start date"
                dismissOnDocumentClick
                overlayOffsetY={48}
                usePortal
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                To
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                min={startDate}
                max={today}
                label="End date"
                dismissOnDocumentClick
                overlayOffsetY={48}
                usePortal
              />
            </div>
          </div>
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Include in report</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "includeFeeds", label: "Feeds" },
                { key: "includePhotos", label: "Photos" },
                { key: "includeSymptoms", label: "Symptoms" },
                { key: "includeMilestones", label: "Milestones" },
                { key: "includeEpisodes", label: "Episodes" },
                { key: "includeEpisodeSummary", label: "Active episode" },
                { key: "includeNotes", label: "Notes" },
                { key: "includeCaregiverNote", label: "Caregiver note" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setOptions((current) => ({
                      ...current,
                      [item.key]: !current[item.key as keyof ReportOptions],
                    }))
                  }
                  className={`px-3 py-2 rounded-[var(--radius-full)] text-xs font-semibold border transition-colors ${
                    options[item.key as keyof ReportOptions]
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Report content */}
      {reportData && (
        <div ref={reportRef}>
          {/* Header */}
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: activeChild.avatar_color }}
                >
                  {activeChild.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-[var(--font-display)] font-semibold text-[var(--color-text)]">
                    {activeChild.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {getAgeLabelFromDob(activeChild.date_of_birth)} · {startDate} to {endDate}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-muted)]">
                Generated by Tiny Tummy · {new Date().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          {/* Stats summary */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">
                    {reportData.stats.totalPoops}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Total poops</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">
                    {reportData.stats.avgPerDay}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Avg per day</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {reportData.stats.mostCommonType
                      ? typeLabel(reportData.stats.mostCommonType)
                      : "—"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Most common type</p>
                </div>
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-3 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {reportData.stats.mostCommonColor
                      ? colorLabel(reportData.stats.mostCommonColor)
                      : "—"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Most common color</p>
                </div>
              </div>
              {reportData.stats.totalNoPoop > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-3 text-center">
                  {reportData.stats.totalNoPoop} "no poop" day{reportData.stats.totalNoPoop > 1 ? "s" : ""} recorded
                </p>
              )}
              {reportData.dietLogs.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2 text-center">
                  {reportData.dietLogs.length} feed{reportData.dietLogs.length > 1 ? "s" : ""} recorded
                </p>
              )}
              {reportData.symptomLogs.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2 text-center">
                  {reportData.symptomLogs.length} symptom{reportData.symptomLogs.length > 1 ? "s" : ""} recorded
                </p>
              )}
              {reportData.milestoneLogs.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2 text-center">
                  {reportData.milestoneLogs.length} milestone{reportData.milestoneLogs.length > 1 ? "s" : ""} recorded
                </p>
              )}
              {reportData.episodeGroups.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2 text-center">
                  {reportData.episodeGroups.length} episode{reportData.episodeGroups.length > 1 ? "s" : ""} captured
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {reportData.highlights.map((highlight, index) => (
                  <div
                    key={`${highlight.title}-${index}`}
                    className={`rounded-[var(--radius-md)] border px-3 py-3 ${
                      highlight.tone === "alert"
                        ? "border-[var(--color-alert)]/20 bg-[var(--color-alert-bg)]"
                        : highlight.tone === "caution"
                          ? "border-[var(--color-caution)]/20 bg-[var(--color-caution-bg)]"
                          : "border-[var(--color-info)]/20 bg-[var(--color-info-bg)]"
                    }`}
                  >
                    <p className="text-sm font-medium text-[var(--color-text)]">{highlight.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{highlight.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {options.includeCaregiverNote && reportData.caregiverNote && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Caregiver Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {reportData.caregiverNote}
                </p>
              </CardContent>
            </Card>
          )}

          {options.includeEpisodeSummary && reportData.activeEpisodeGroup && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Active Episode Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {getEpisodeTypeLabel(reportData.activeEpisodeGroup.episode.episode_type)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      Started {formatDate(reportData.activeEpisodeGroup.episode.started_at)}
                    </p>
                  </div>
                  <Badge variant="info">Active</Badge>
                </div>
                {reportData.activeEpisodeGroup.episode.summary && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {reportData.activeEpisodeGroup.episode.summary}
                  </p>
                )}
                {reportData.activeEpisodeGroup.events[0] && (
                  <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Latest update</p>
                    <p className="mt-2 text-sm font-medium text-[var(--color-text)]">
                      {reportData.activeEpisodeGroup.events[0].title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {getEpisodeEventTypeLabel(reportData.activeEpisodeGroup.events[0].event_type)} · {formatDate(reportData.activeEpisodeGroup.events[0].logged_at)}
                    </p>
                    {options.includeNotes && reportData.activeEpisodeGroup.events[0].notes && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        {reportData.activeEpisodeGroup.events[0].notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Log entries */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Log Entries ({reportData.logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.logs.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)] text-center py-4">
                  No entries in this date range.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                  {reportData.logs.map((log) => {
                    const colorInfo = log.color ? STOOL_COLORS.find((c) => c.value === log.color) : null;
                    return (
                      <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                        <div
                          className="mt-1 w-3 h-3 rounded-full flex-shrink-0 border border-[var(--color-border)]"
                          style={{
                            backgroundColor: log.is_no_poop
                              ? "var(--color-muted)"
                              : colorInfo?.hex ?? "var(--color-muted)",
                          }}
                        />
                        <span className="text-xs text-[var(--color-muted)] w-24 flex-shrink-0">
                          {formatDate(log.logged_at)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--color-text)] truncate">
                              {log.is_no_poop
                                ? "No poop"
                                : log.stool_type
                                  ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
                                  : "Logged"}
                            </span>
                            {log.color && STOOL_COLORS.find((c) => c.value === log.color)?.isRedFlag && (
                              <Badge variant="alert">red flag</Badge>
                            )}
                            {log.size && <Badge variant="default">{log.size}</Badge>}
                          </div>
                          {options.includeNotes && log.notes && (
                            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                              {log.notes}
                            </p>
                          )}
                          {options.includePhotos && log.photo_path && reportData.photoUrls[log.id] && (
                            <img
                              src={reportData.photoUrls[log.id]}
                              alt="Stool log photo"
                              className="mt-2 h-16 w-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] object-cover"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {options.includeFeeds && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Feeds & Meals ({reportData.dietLogs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.dietLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No feeds or meals in this date range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                    {reportData.dietLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                        <div className="mt-1 w-3 h-3 rounded-full flex-shrink-0 border border-[var(--color-border)] bg-[#f7b183]" />
                        <span className="text-xs text-[var(--color-muted)] w-24 flex-shrink-0">
                          {formatDate(log.logged_at)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--color-text)] truncate">
                            {getDietEntryDisplayLabel(log)}
                          </p>
                          {options.includeNotes && getDietEntrySecondaryText(log) && (
                            <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                              {getDietEntrySecondaryText(log)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {options.includeSymptoms && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Symptoms ({reportData.symptomLogs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.symptomLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No symptoms in this date range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {reportData.symptomLogs.map((symptom) => (
                      <div key={symptom.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {getSymptomTypeLabel(symptom.symptom_type)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                              {formatDate(symptom.logged_at)} · {symptom.episode_id ? "Episode-linked" : "Standalone"}
                            </p>
                          </div>
                          <Badge variant={getSymptomSeverityBadgeVariant(symptom.severity)}>
                            {getSymptomSeverityLabel(symptom.severity)}
                          </Badge>
                        </div>
                        {options.includeNotes && symptom.notes && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {symptom.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {options.includeMilestones && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Milestones ({reportData.milestoneLogs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.milestoneLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No milestones in this date range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {reportData.milestoneLogs.map((milestone) => (
                      <div key={milestone.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text)]">
                              {getMilestoneTypeLabel(milestone.milestone_type)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                              {formatDate(milestone.logged_at)}
                            </p>
                          </div>
                          <Badge variant="info">Context</Badge>
                        </div>
                        {options.includeNotes && milestone.notes && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {milestone.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {options.includePhotos && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.logs.filter((log) => log.photo_path && reportData.photoUrls[log.id]).length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No photos in this date range.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {reportData.logs
                      .filter((log) => log.photo_path && reportData.photoUrls[log.id])
                      .map((log) => (
                        <div key={log.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                          <img
                            src={reportData.photoUrls[log.id]}
                            alt="Stool log photo"
                            className="aspect-square w-full object-cover"
                          />
                          <div className="p-3">
                            <p className="text-sm font-medium text-[var(--color-text)]">{formatDate(log.logged_at)}</p>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                              {log.stool_type ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}` : "Logged stool"}
                              {log.color ? ` · ${colorLabel(log.color)}` : ""}
                            </p>
                            {options.includeNotes && log.notes && (
                              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {options.includeEpisodes && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Episodes ({reportData.episodeGroups.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.episodeGroups.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No episodes in this date range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reportData.episodeGroups.map(({ episode, events }) => (
                      <div key={episode.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text)]">
                              {getEpisodeTypeLabel(episode.episode_type)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                              {formatDate(episode.started_at)}
                              {episode.ended_at ? ` to ${formatDate(episode.ended_at)}` : ""}
                            </p>
                          </div>
                          <Badge variant={episode.status === "active" ? "info" : "default"}>
                            {episode.status === "active" ? "Active" : "Resolved"}
                          </Badge>
                        </div>

                        {options.includeNotes && episode.summary && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {episode.summary}
                          </p>
                        )}

                        {options.includeNotes && episode.outcome && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            Outcome: {episode.outcome}
                          </p>
                        )}

                        {events.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
                            {events.map((event) => (
                              <div key={event.id}>
                                <p className="text-xs font-medium text-[var(--color-text)]">
                                  {event.title}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--color-text-soft)]">
                                  {getEpisodeEventTypeLabel(event.event_type)} · {formatDate(event.logged_at)}
                                </p>
                                {options.includeNotes && event.notes && (
                                  <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Print button */}
          <Button variant="cta" className="w-full mb-4" onClick={handlePrint}>
            {platform() === "android" || platform() === "ios" ? "Save Report" : "Export as PDF"}
          </Button>

          <p className="text-xs text-[var(--color-muted)] text-center">
            {platform() === "android" || platform() === "ios"
              ? "Lets you choose where to save the report file."
              : "Uses your browser's print dialog to save as PDF."}
          </p>
        </div>
      )}
    </div>
  );
}
