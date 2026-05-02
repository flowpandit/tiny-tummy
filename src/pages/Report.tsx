import { useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useActiveChild } from "../contexts/ChildContext";
import { useUnits } from "../contexts/UnitsContext";
import { useReportPageState } from "../hooks/useReportPageState";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { ScenicHero } from "../components/layout/ScenicHero";
import { ReportComposerCard } from "../components/report/ReportComposerCard";
import { PageBody } from "../components/ui/page-layout";
import { ReportPreview } from "../components/report/ReportPreview";
import { ReportReadyCard } from "../components/report/ReportReadyCard";
import { Button } from "../components/ui/button";
import { buildReportPdfPayload } from "../lib/report-pdf";
import {
  buildReportPatientSummary,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableTimeline,
} from "../lib/report-view-model";
import { useToast } from "../components/ui/toast";
import { generateReportPdf, openPdfFromDownloads, savePdfToDownloads } from "../lib/tauri";
import { loadAvatarDataUrl } from "../lib/photos";

export function Report() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const { showError, showSuccess } = useToast();
  const isAndroid = platform() === "android";
  const [savedAndroidReport, setSavedAndroidReport] = useState<{ fileName: string; uri: string } | null>(null);
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
      setSavedAndroidReport(null);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `tiny-tummy-pediatrician-report-${startDate}-to-${endDate}-${timestamp}.pdf`;
      const childAvatarDataUrl = await loadAvatarDataUrl(activeChild.id).catch(() => null);
      const encodedPdf = await generateReportPdf(
        buildReportPdfPayload({
          child: activeChild,
          startDate,
          endDate,
          data: reportData,
          unitSystem,
          childAvatarDataUrl,
        }),
      );

      if (isAndroid) {
        const savedReport = await savePdfToDownloads(fileName, encodedPdf);
        setSavedAndroidReport(savedReport);
        showSuccess("Report saved to Downloads.");
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

  const handleOpenSavedAndroidReport = async () => {
    if (!savedAndroidReport) return;

    try {
      await openPdfFromDownloads(savedAndroidReport.uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(message || "Could not open the saved PDF report.");
    }
  };

  const patientSummary = buildReportPatientSummary(activeChild, startDate, endDate);
  const reportPreviewPayload = reportData
    ? buildReportPdfPayload({
      child: activeChild,
      startDate,
      endDate,
      data: reportData,
      unitSystem,
    })
    : null;
  const hasGeneratedTimeline = hasReportableTimeline(reportData);

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Report"
        description="Prepare a pediatrician-ready PDF with charts, context, and timeline detail."
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        showChildInfo={false}
      />

      <div className="-mt-36 px-4 md:-mt-32 md:px-10">
        <ReportComposerCard
          today={today}
          startDate={startDate}
          endDate={endDate}
          isGenerating={isGenerating}
          options={options}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onGenerate={handleGenerate}
          onToggleOption={toggleOption}
        />
      </div>

      <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
        {reportData && (
          <>
            <ReportReadyCard
              title={patientSummary.title}
              subtitle={patientSummary.subtitle}
              detail={patientSummary.detail}
              hasReportableData={hasGeneratedTimeline}
              saveLabel={getReportSaveLabel(isAndroid)}
              saveHelpText={getReportSaveHelpText(isAndroid)}
              onSave={handlePrint}
            />

            {isAndroid && savedAndroidReport && (
              <div className="rounded-[18px] border border-[var(--color-home-card-border)] bg-[var(--color-surface-strong)] p-4 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      Report saved to Downloads.
                    </p>
                    <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                      {savedAndroidReport.fileName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={handleOpenSavedAndroidReport}
                  >
                    Open PDF
                  </Button>
                </div>
              </div>
            )}

            {reportPreviewPayload && hasGeneratedTimeline && <ReportPreview payload={reportPreviewPayload} />}
          </>
        )}

        <CareToolsSection className="px-0" palette="soft" />
      </div>
    </PageBody>
  );
}
