import { useState, useRef } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useChildContext } from "../contexts/ChildContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageIntro } from "../components/ui/page-intro";
import { PageBody } from "../components/ui/page-layout";
import { DatePicker } from "../components/ui/date-picker";
import { Badge } from "../components/ui/badge";
import { getAgeLabelFromDob, formatDate } from "../lib/utils";
import { BITSS_TYPES, STOOL_COLORS } from "../lib/constants";
import { getFeedingEntryDisplayLabel, getFeedingEntrySecondaryText } from "../lib/feeding";
import { getEpisodeEventTypeLabel, getEpisodeTypeLabel } from "../lib/episode-constants";
import { getMilestoneTypeLabel } from "../lib/milestone-constants";
import { getSymptomSeverityBadgeVariant, getSymptomSeverityLabel, getSymptomTypeLabel } from "../lib/symptom-constants";
import { buildPrintableReportHtml } from "../lib/report-export";
import {
  defaultReportOptions,
  generateReportData,
  type ReportData,
  type ReportOptions,
} from "../lib/reporting";
import { useToast } from "../components/ui/toast";

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
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);

  if (!activeChild) return null;

  const typeLabel = (type: number) => BITSS_TYPES.find((b) => b.type === type)?.label ?? `Type ${type}`;
  const colorLabel = (color: string) => STOOL_COLORS.find((c) => c.value === color)?.label ?? color;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateReportData(activeChild.id, startDate, endDate);
      setReportData(data);
    } finally {
      setIsGenerating(false);
    }
  };

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

      await writeTextFile(targetPath, buildPrintableReportHtml({
        child: activeChild,
        startDate,
        endDate,
        data: reportData,
        options,
      }));
      showSuccess("Report saved successfully.");
    } catch {
      showError("Could not save the report export. Please try again.");
    }
  };

  return (
    <PageBody>
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
              {reportData.feedingLogs.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2 text-center">
                  {reportData.feedingLogs.length} feed{reportData.feedingLogs.length > 1 ? "s" : ""} recorded
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
                <CardTitle>Feeds & Meals ({reportData.feedingLogs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.feedingLogs.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)] text-center py-4">
                    No feeds or meals in this date range.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                    {reportData.feedingLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
                        <div
                          className="mt-1 w-3 h-3 rounded-full flex-shrink-0 border border-[var(--color-border)]"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        />
                        <span className="text-xs text-[var(--color-muted)] w-24 flex-shrink-0">
                          {formatDate(log.logged_at)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--color-text)] truncate">
                            {getFeedingEntryDisplayLabel(log)}
                          </p>
                          {options.includeNotes && getFeedingEntrySecondaryText(log) && (
                            <p className="text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                              {getFeedingEntrySecondaryText(log)}
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
    </PageBody>
  );
}
