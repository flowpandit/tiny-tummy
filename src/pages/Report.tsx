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
import { ReportReadyCard } from "../components/report/ReportReadyCard";
import { buildReportPdfPayload } from "../lib/report-pdf";
import {
  buildReportPatientSummary,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableData,
} from "../lib/report-view-model";
import { useToast } from "../components/ui/toast";
import {
  generateReportPdf,
  openPdfFromDownloads,
  savePdfToDownloads,
  sharePdfReport,
} from "../lib/tauri";
import { loadAvatarDataUrl } from "../lib/photos";

export function Report() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const { showError, showSuccess } = useToast();
  const currentPlatform = platform();
  const isAndroid = currentPlatform === "android";
  const isIos = currentPlatform === "ios";
  const [savedAndroidReport, setSavedAndroidReport] = useState<{ fileName: string; uri: string } | null>(null);
  const [isAutoSavingReport, setIsAutoSavingReport] = useState(false);
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

  const buildPdfFileName = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `tiny-tummy-pediatrician-report-${startDate}-to-${endDate}-${timestamp}.pdf`;
  };

  const createEncodedReportPdf = async (data = reportData) => {
    if (!data) return null;

    const childAvatarDataUrl = await loadAvatarDataUrl(activeChild.id).catch(() => null);
    return await generateReportPdf(
      buildReportPdfPayload({
        child: activeChild,
        startDate,
        endDate,
        data,
        unitSystem,
        childAvatarDataUrl,
      }),
    );
  };

  const saveAndroidReportToDownloads = async (data = reportData) => {
    if (!data) return null;
    if (!hasReportableData(data)) return null;

    const encodedPdf = await createEncodedReportPdf(data);
    if (!encodedPdf) return null;

    const savedReport = await savePdfToDownloads(buildPdfFileName(), encodedPdf);
    setSavedAndroidReport(savedReport);
    showSuccess("Report saved to Downloads.");
    return savedReport;
  };

  const handleGenerateReport = async () => {
    try {
      setSavedAndroidReport(null);
      const data = await handleGenerate();

      if (!isAndroid || !data || !hasReportableData(data)) {
        return;
      }

      setIsAutoSavingReport(true);
      await saveAndroidReportToDownloads(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not generate the PDF report: ${message}`);
    } finally {
      setIsAutoSavingReport(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportData) return;
    if (!hasReportableData(reportData)) {
      showError("No reportable data exists in the selected date range.");
      return;
    }

    try {
      if (isAndroid) {
        await saveAndroidReportToDownloads(reportData);
        return;
      }

      const encodedPdf = await createEncodedReportPdf(reportData);
      if (!encodedPdf) return;

      if (isIos) {
        await sharePdfReport(buildPdfFileName(), encodedPdf);
        return;
      }

      const pdfBytes = decodeBase64(encodedPdf);
      const targetPath = await save({
        defaultPath: buildPdfFileName(),
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
      showError(`Export failed: ${message}`);
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

  const handleReportCardAction = () => {
    if (isAndroid && savedAndroidReport) {
      void handleOpenSavedAndroidReport();
      return;
    }

    void handleSaveReport();
  };

  const patientSummary = buildReportPatientSummary(activeChild, startDate, endDate);
  const hasGeneratedReportData = hasReportableData(reportData);
  const reportActionLabel = isAndroid && savedAndroidReport
    ? "Open PDF report"
    : isIos
      ? "Share PDF report"
    : getReportSaveLabel(isAndroid);
  const reportActionHelpText = isAndroid && savedAndroidReport
    ? "Report saved to Downloads. Tap to open it."
    : isIos
      ? "Opens the iOS share sheet so you can save to Files, open in Books, or share."
    : getReportSaveHelpText(isAndroid);

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
          isGenerating={isGenerating || isAutoSavingReport}
          options={options}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onGenerate={() => { void handleGenerateReport(); }}
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
              hasReportableData={hasGeneratedReportData}
              saveLabel={reportActionLabel}
              saveHelpText={reportActionHelpText}
              onSave={handleReportCardAction}
            />

          </>
        )}

        <CareToolsSection className="px-0" palette="soft" />
      </div>
    </PageBody>
  );
}
