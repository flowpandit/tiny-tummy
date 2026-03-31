import { useEffect, useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useChildContext } from "../contexts/ChildContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageIntro } from "../components/ui/page-intro";
import { PageBackButton, PageBody } from "../components/ui/page-layout";
import { DatePicker } from "../components/ui/date-picker";
import { buildReportPdfPayload } from "../lib/report-pdf";
import {
  defaultReportOptions,
  generateReportData,
  type ReportData,
  type ReportOptions,
} from "../lib/reporting";
import { useToast } from "../components/ui/toast";
import { generateReportPdf, savePdfToDownloads } from "../lib/tauri";
import { getAgeLabelFromDob } from "../lib/utils";
import * as db from "../lib/db";

function addDays(dateString: string, delta: number): string {
  const next = new Date(`${dateString}T00:00:00`);
  next.setDate(next.getDate() + delta);
  return next.toISOString().split("T")[0];
}

export function Report() {
  const { activeChild } = useChildContext();
  const { showError, showSuccess } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions);

  useEffect(() => {
    if (!activeChild) return;

    let cancelled = false;

    void db.getLatestReportActivityDate(activeChild.id).then((latestActivity) => {
      if (cancelled || !latestActivity) return;
      const latestDay = latestActivity.split("T")[0];
      setEndDate(latestDay);
      setStartDate(addDays(latestDay, -29));
    });

    return () => {
      cancelled = true;
    };
  }, [activeChild]);

  if (!activeChild) return null;

  const decodeBase64 = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateReportData(activeChild.id, startDate, endDate, options);
      setReportData(data);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData) return;
    if (reportData.timeline.length === 0) {
      showError("No reportable data exists in the selected date range.");
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `tiny-tummy-pediatrician-report-${startDate}-to-${endDate}-${timestamp}.pdf`;
      const encodedPdf = await generateReportPdf(buildReportPdfPayload({
        child: activeChild,
        startDate,
        endDate,
        data: reportData,
      }));
      const currentPlatform = platform();
      const isAndroid = currentPlatform === "android";

      if (isAndroid) {
        await savePdfToDownloads(fileName, encodedPdf);
        showSuccess(`PDF saved to Downloads as ${fileName}.`);
        return;
      }

      const pdfBytes = decodeBase64(encodedPdf);
      const targetPath = await save({
        defaultPath: fileName,
        filters: [
          {
            name: "PDF report",
            extensions: ["pdf"],
          },
        ],
      });

      if (!targetPath) {
        return;
      }

      await writeFile(targetPath, pdfBytes);
      showSuccess("PDF report saved successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not generate the PDF report: ${message}`);
    }
  };

  return (
    <PageBody>
      <PageBackButton fallbackTo="/dashboard" />

      <PageIntro
        eyebrow="Share"
        title="Pediatrician Report"
        description="Generate a bowel-first clinical summary with highlighted concerns, 7-day charts, and a chronological appendix."
      />

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
                { key: "includeSymptoms", label: "Symptoms" },
                { key: "includeMilestones", label: "Milestones" },
                { key: "includeEpisodes", label: "Episodes" },
                { key: "includeEpisodeSummary", label: "Active episode" },
                { key: "includeGrowth", label: "Growth" },
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

      {reportData && (
        <div>
          {reportData.timeline.length === 0 && (
            <Card className="mb-4">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-[var(--color-text)]">No reportable data in this date range.</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Try expanding the date range. The picker now defaults to the child&apos;s latest recorded activity instead of today.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="mb-4">
            <CardContent className="py-4">
              <p className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
                {activeChild.name}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {getAgeLabelFromDob(activeChild.date_of_birth)} · {startDate} to {endDate}
              </p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                The exported PDF uses a 3-part layout: executive summary, clinical context, and a chronological appendix.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Executive Summary Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {reportData.dashboardStats.map((stat) => (
                  <div key={stat.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-soft)]">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-text)]">{stat.value}</p>
                    {stat.detail && (
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{stat.detail}</p>
                    )}
                  </div>
                ))}
              </div>

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

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Clinical Context Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {reportData.contextSections.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">No extra clinical context is included for this date range.</p>
              ) : (
                reportData.contextSections.map((section) => (
                  <div key={section.title} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{section.title}</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {section.rows.slice(0, 3).map((row) => (
                        <div key={`${section.title}-${row.title}-${row.meta ?? ""}`} className="border-b border-[var(--color-border)] pb-2 last:border-b-0 last:pb-0">
                          <p className="text-sm font-medium text-[var(--color-text)]">{row.title}</p>
                          {row.meta && <p className="mt-1 text-xs text-[var(--color-text-soft)]">{row.meta}</p>}
                          {row.detail && <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{row.detail}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Appendix Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {reportData.timeline.slice(0, 6).map((row) => (
                  <div key={`${row.dateTime}-${row.eventType}-${row.details}`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{row.eventType}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-soft)]">{row.dateTime}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{row.details}</p>
                    {row.note && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{row.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button variant="cta" className="w-full mb-4" onClick={handlePrint}>
            {platform() === "android" ? "Save PDF to Downloads" : "Save PDF"}
          </Button>

          <p className="text-xs text-[var(--color-muted)] text-center">
            {platform() === "android"
              ? "Generates an ink-friendly PDF and saves it directly to your Downloads folder."
              : "Generates an ink-friendly PDF and lets you choose where to save it."}
          </p>
        </div>
      )}
    </PageBody>
  );
}
