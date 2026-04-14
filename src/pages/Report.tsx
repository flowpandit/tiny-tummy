import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useReportPageState } from "../hooks/useReportPageState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageIntro } from "../components/ui/page-intro";
import { PageBody } from "../components/ui/page-layout";
import { DatePicker } from "../components/ui/date-picker";
import { buildReportPdfPayload } from "../lib/report-pdf";
import {
  buildReportPatientSummary,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableTimeline,
  REPORT_OPTION_TOGGLES,
} from "../lib/report-view-model";
import { useToast } from "../components/ui/toast";
import { generateReportPdf, savePdfToDownloads } from "../lib/tauri";

export function Report() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const { showError, showSuccess } = useToast();
  const isAndroid = platform() === "android";
  const {
    today,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    reportData,
    isGenerating,
    options,
    toggleOption,
    handleGenerate,
  } = useReportPageState(activeChild, unitSystem);

  if (!activeChild) return null;

  const decodeBase64 = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  };

  const handlePrint = async () => {
    if (!reportData) return;
    if (!hasReportableTimeline(reportData)) {
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
        unitSystem,
      }));

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

  const patientSummary = buildReportPatientSummary(activeChild, startDate, endDate);

  return (
    <PageBody>
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
              {REPORT_OPTION_TOGGLES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleOption(item.key)}
                  className={`px-3 py-2 rounded-[var(--radius-full)] text-xs font-semibold border transition-colors ${
                    options[item.key]
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
          {!hasReportableTimeline(reportData) && (
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
              <p className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)]">{patientSummary.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{patientSummary.subtitle}</p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                {patientSummary.detail}
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

          <Button variant="cta" className="w-full mb-4" onClick={handlePrint}>{getReportSaveLabel(isAndroid)}</Button>

          <p className="text-xs text-[var(--color-muted)] text-center">{getReportSaveHelpText(isAndroid)}</p>
        </div>
      )}
    </PageBody>
  );
}
