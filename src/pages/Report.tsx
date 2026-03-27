import { useState, useRef } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useChildContext } from "../contexts/ChildContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DatePicker } from "../components/ui/date-picker";
import { Badge } from "../components/ui/badge";
import { getAgeLabelFromDob, formatDate } from "../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import * as db from "../lib/db";
import { useToast } from "../components/ui/toast";
import type { PoopEntry } from "../lib/types";

interface ReportData {
  logs: PoopEntry[];
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

  if (!activeChild) return null;
  const child = activeChild;

  const handleGenerate = async () => {
    setIsGenerating(true);
    const [logs, stats] = await Promise.all([
      db.getPoopLogsForRange(activeChild.id, startDate, endDate),
      db.getReportStats(activeChild.id, startDate, endDate),
    ]);
    setReportData({ logs, stats });
    setIsGenerating(false);
  };

  const typeLabel = (type: number) =>
    BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
  const colorLabel = (color: string) =>
    STOOL_COLORS.find((c) => c.value === color)?.label ?? color;

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildPrintableHtml(data: ReportData): string {
    const entriesHtml = data.logs.length === 0
      ? '<p class="empty">No entries in this date range.</p>'
      : data.logs.map((log) => {
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
              </td>
              <td class="size">${escapeHtml(log.size ?? "—")}</td>
            </tr>
          `;
        }).join("");

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
      </section>

      <section class="card">
        <h2>Log Entries (${data.logs.length})</h2>
        ${data.logs.length === 0 ? entriesHtml : `<table><tbody>${entriesHtml}</tbody></table>`}
      </section>

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
      <div className="my-5 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Share</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
          Report
        </h2>
        <p className="mt-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
          Generate a summary to share with your doctor.
        </p>
      </div>

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
            </CardContent>
          </Card>

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
                      <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border border-[var(--color-border)]"
                          style={{
                            backgroundColor: log.is_no_poop
                              ? "var(--color-muted)"
                              : colorInfo?.hex ?? "var(--color-muted)",
                          }}
                        />
                        <span className="text-xs text-[var(--color-muted)] w-24 flex-shrink-0">
                          {formatDate(log.logged_at)}
                        </span>
                        <span className="text-xs text-[var(--color-text)] flex-1 truncate">
                          {log.is_no_poop
                            ? "No poop"
                            : log.stool_type
                              ? `Type ${log.stool_type}: ${typeLabel(log.stool_type)}`
                              : "Logged"}
                        </span>
                        {log.size && <Badge variant="default">{log.size}</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
