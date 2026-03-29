import { BITSS_TYPES, STOOL_COLORS } from "./constants";
import {
  getEpisodeEventTypeLabel,
  getEpisodeTypeLabel,
} from "./episode-constants";
import {
  getFeedingEntryDisplayLabel,
  getFeedingEntrySecondaryText,
} from "./feeding";
import { getMilestoneTypeLabel } from "./milestone-constants";
import {
  getSymptomSeverityLabel,
  getSymptomTypeLabel,
} from "./symptom-constants";
import { formatDate, getAgeLabelFromDob } from "./utils";
import type { Child } from "./types";
import type { ReportData, ReportOptions } from "./reporting";

function typeLabel(type: number) {
  return BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
}

function colorLabel(color: string) {
  return STOOL_COLORS.find((c) => c.value === color)?.label ?? color;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPrintableReportHtml(input: {
  child: Child;
  startDate: string;
  endDate: string;
  data: ReportData;
  options: ReportOptions;
}): string {
  const { child, startDate, endDate, data, options } = input;
  const logEntries = data.logs.filter((log) => !log.is_no_poop || log.is_no_poop === 1);

  const entriesHtml = data.logs.length === 0
    ? '<p class="empty">No entries in this date range.</p>'
    : logEntries.map((log) => {
        const colorInfo = log.color ? STOOL_COLORS.find((c) => c.value === log.color) : null;
        const dotColor = log.is_no_poop ? "#98a2b3" : colorInfo?.hex ?? "#98a2b3";
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

  const feedEntriesHtml = data.feedingLogs.length === 0
    ? '<p class="empty">No feeds or meals in this date range.</p>'
    : data.feedingLogs.map((log) => `
        <tr>
          <td class="date">${escapeHtml(formatDate(log.logged_at))}</td>
          <td class="entry">${escapeHtml(getFeedingEntryDisplayLabel(log))}</td>
          <td class="size">${escapeHtml(options.includeNotes ? (getFeedingEntrySecondaryText(log) ?? "—") : "—")}</td>
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
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: var(--bg);
      }
      .report { max-width: 760px; margin: 0 auto; }
      .card { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 20px; margin-bottom: 16px; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 32px; margin-bottom: 10px; }
      .subtle { color: var(--ink-soft); }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
      .stat { padding: 14px; border-radius: 16px; background: #fff8f1; border: 1px solid var(--line); text-align: center; }
      .stat strong { display: block; font-size: 24px; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td { padding: 10px 0; border-bottom: 1px solid var(--line); vertical-align: middle; }
      tr:last-child td { border-bottom: 0; }
      .date, .size { color: var(--ink-soft); white-space: nowrap; }
      .entry { width: 100%; padding-left: 8px; }
      .dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 8px; vertical-align: middle; }
      .empty { color: var(--ink-soft); text-align: center; padding: 18px 0 4px; }
      .note { margin-top: 4px; }
      .highlight-list { display: grid; gap: 10px; margin-top: 16px; }
      .highlight { border-radius: 16px; padding: 14px; border: 1px solid var(--line); background: #fff8f1; }
      .highlight-alert { background: #fff2ef; }
      .highlight-caution { background: #fff7ea; }
      .highlight-info { background: #f4f9ff; }
      .episode + .episode { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
      .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
      .photo-card { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: #fff8f1; }
      .photo-thumb { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
      .photo-copy { padding: 12px; }
      .episode-title { font-size: 16px; font-weight: 600; }
      .episode-copy { margin-top: 8px; line-height: 1.5; }
      .episode-list { margin: 10px 0 0; padding-left: 18px; }
      .episode-list li + li { margin-top: 8px; }
      .footer { margin-top: 10px; color: var(--ink-soft); font-size: 12px; text-align: center; }
      @media print { body { background: white; padding: 0; } .card { break-inside: avoid; } }
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
          <div class="stat"><strong>${data.stats.totalPoops}</strong><span class="subtle">Total poops</span></div>
          <div class="stat"><strong>${data.stats.avgPerDay}</strong><span class="subtle">Avg per day</span></div>
          <div class="stat"><strong>${escapeHtml(data.stats.mostCommonType ? typeLabel(data.stats.mostCommonType) : "—")}</strong><span class="subtle">Most common type</span></div>
          <div class="stat"><strong>${escapeHtml(data.stats.mostCommonColor ? colorLabel(data.stats.mostCommonColor) : "—")}</strong><span class="subtle">Most common color</span></div>
        </div>
        ${data.stats.totalNoPoop > 0 ? `<p class="subtle" style="margin-top:12px;text-align:center;">${data.stats.totalNoPoop} no-poop day${data.stats.totalNoPoop > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.feedingLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.feedingLogs.length} feed${data.feedingLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.symptomLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.symptomLogs.length} symptom${data.symptomLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        ${data.episodeGroups.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.episodeGroups.length} episode${data.episodeGroups.length > 1 ? "s" : ""} captured</p>` : ""}
        ${data.milestoneLogs.length > 0 ? `<p class="subtle" style="margin-top:10px;text-align:center;">${data.milestoneLogs.length} milestone${data.milestoneLogs.length > 1 ? "s" : ""} recorded</p>` : ""}
        <div class="highlight-list">${highlightsHtml}</div>
      </section>

      ${options.includeCaregiverNote && data.caregiverNote ? `<section class="card"><h2>Caregiver Note</h2><p class="episode-copy">${escapeHtml(data.caregiverNote)}</p></section>` : ""}

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

      <section class="card"><h2>Log Entries (${data.logs.length})</h2>${data.logs.length === 0 ? entriesHtml : `<table><tbody>${entriesHtml}</tbody></table>`}</section>
      ${options.includeFeeds ? `<section class="card"><h2>Feeds & Meals (${data.feedingLogs.length})</h2>${data.feedingLogs.length === 0 ? feedEntriesHtml : `<table><tbody>${feedEntriesHtml}</tbody></table>`}</section>` : ""}
      ${options.includeSymptoms ? `<section class="card"><h2>Symptoms (${data.symptomLogs.length})</h2>${data.symptomLogs.length === 0 ? symptomEntriesHtml : `<table><tbody>${symptomEntriesHtml}</tbody></table>`}</section>` : ""}
      ${options.includeMilestones ? `<section class="card"><h2>Milestones (${data.milestoneLogs.length})</h2>${data.milestoneLogs.length === 0 ? milestoneEntriesHtml : `<table><tbody>${milestoneEntriesHtml}</tbody></table>`}</section>` : ""}
      ${options.includePhotos ? `<section class="card"><h2>Photos</h2>${data.logs.filter((log) => log.photo_path && data.photoUrls[log.id]).length === 0 ? photoEntriesHtml : `<div class="photo-grid">${photoEntriesHtml}</div>`}</section>` : ""}
      ${options.includeEpisodes ? `<section class="card"><h2>Episodes (${data.episodeGroups.length})</h2>${episodeEntriesHtml}</section>` : ""}
      <p class="footer">Open your browser or system share/print menu to save this as PDF.</p>
    </main>
  </body>
</html>`;
}
