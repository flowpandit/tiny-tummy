import { useCallback, useEffect, useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useActiveChild } from "../contexts/ChildContext";
import { usePremiumFeature } from "../contexts/TrialContext";
import { useUnits } from "../contexts/UnitsContext";
import { useReportPageState } from "../hooks/useReportPageState";
import { CareToolsSection } from "../components/care/CareToolsSection";
import { ScenicHero } from "../components/layout/ScenicHero";
import { PremiumInlineLock } from "../components/billing/PremiumLocks";
import { ReportComposerCard } from "../components/report/ReportComposerCard";
import { PageBody } from "../components/ui/page-layout";
import { ReportReadyCard } from "../components/report/ReportReadyCard";
import { renderReportPdfBase64 } from "../lib/report-pdf-renderer";
import {
  buildReportPatientSummary,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableData,
} from "../lib/report-view-model";
import { useToast } from "../components/ui/toast";
import {
  openPdfFromDownloads,
  savePdfToDownloads,
  sharePdfReport,
} from "../lib/tauri";

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfFileName(reportKind: "poopTummy" | "fullHealth", startDate: string, endDate: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportSlug = reportKind === "poopTummy" ? "poop-tummy-report" : "pediatrician-report";
  return `tiny-tummy-${reportSlug}-${startDate}-to-${endDate}-${timestamp}.pdf`;
}

export function Report() {
  const activeChild = useActiveChild();
  const { unitSystem } = useUnits();
  const canUseReports = usePremiumFeature("doctorReports");
  const { showError, showSuccess } = useToast();
  const currentPlatform = platform();
  const isAndroid = currentPlatform === "android";
  const isIos = currentPlatform === "ios";
  const [savedAndroidReport, setSavedAndroidReport] = useState<{ fileName: string; uri: string } | null>(null);
  const [isAutoSavingReport, setIsAutoSavingReport] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [pendingAndroidAutoSave, setPendingAndroidAutoSave] = useState(false);
  const {
    today,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    reportData,
    isGenerating,
    reportKind,
    setReportKind,
    options,
    toggleOption,
    handleGenerate,
  } = useReportPageState(activeChild, unitSystem);
  const hasGeneratedReportData = hasReportableData(reportData);
  const getPdfFileName = useCallback(
    () => buildPdfFileName(reportKind, startDate, endDate),
    [endDate, reportKind, startDate],
  );
  const createEncodedReportPdf = useCallback(async () => {
    if (!activeChild) {
      throw new Error("No active child is selected.");
    }
    if (!reportData) {
      throw new Error("Report data is still preparing. Try again in a moment.");
    }

    const result = await renderReportPdfBase64({
      child: activeChild,
      startDate,
      endDate,
      reportData,
      unitSystem,
    });
    console.info(
      `[Tiny Tummy] ${result.renderer} PDF generated in ${Math.round(result.durationMs)}ms`,
    );

    return result.base64Data;
  }, [activeChild, endDate, reportData, startDate, unitSystem]);
  const saveAndroidReportToDownloads = useCallback(async (data = reportData) => {
    if (!data) return null;
    if (!hasReportableData(data)) return null;

    const encodedPdf = await createEncodedReportPdf();

    const savedReport = await savePdfToDownloads(getPdfFileName(), encodedPdf);
    setSavedAndroidReport(savedReport);
    showSuccess("Report saved to Downloads.");
    return savedReport;
  }, [createEncodedReportPdf, getPdfFileName, reportData, showSuccess]);

  useEffect(() => {
    if (!pendingAndroidAutoSave || !isAndroid || !reportData || !hasGeneratedReportData) return;

    let cancelled = false;

    async function runPendingAndroidSave() {
      try {
        setIsAutoSavingReport(true);
        if (!cancelled) {
          await saveAndroidReportToDownloads(reportData);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          showError(`Could not save the PDF report: ${message}`);
        }
      } finally {
        if (!cancelled) {
          setPendingAndroidAutoSave(false);
          setIsAutoSavingReport(false);
        }
      }
    }

    void runPendingAndroidSave();

    return () => {
      cancelled = true;
    };
  }, [hasGeneratedReportData, isAndroid, pendingAndroidAutoSave, reportData, saveAndroidReportToDownloads, showError]);

  if (!activeChild) return null;

  if (!canUseReports) {
    return (
      <PageBody className="-mt-8 space-y-0 px-0 py-0">
        <ScenicHero
          child={activeChild}
          title="Report"
          description="Prepare a pediatrician-ready PDF with charts, context, and timeline detail."
          className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
          showChildInfo={false}
        />

        <div className="-mt-28 px-4 md:-mt-24 md:px-10">
          <PremiumInlineLock
            featureId="doctorReports"
            title="Doctor-ready PDFs are Premium"
            description="Basic logging stays free. Unlock when you want a clean report with poop, diaper, feeding, symptoms, and timeline context for a visit."
            actionLabel="Unlock reports"
          />
        </div>

        <div className="space-y-3 px-4 py-3 md:space-y-5 md:px-10 md:py-5">
          <CareToolsSection className="px-0" palette="soft" />
        </div>
      </PageBody>
    );
  }

  const handleGenerateReport = async () => {
    try {
      setSavedAndroidReport(null);
      const data = await handleGenerate();

      if (!isAndroid || !data || !hasReportableData(data)) {
        return;
      }

      setPendingAndroidAutoSave(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`Could not generate the PDF report: ${message}`);
    }
  };

  const handleSaveReport = async () => {
    if (isSavingReport) return;
    if (!reportData) return;
    if (!hasReportableData(reportData)) {
      showError("No reportable data exists in the selected date range.");
      return;
    }

    try {
      setIsSavingReport(true);

      if (isAndroid) {
        await saveAndroidReportToDownloads(reportData);
        return;
      }

      const encodedPdf = await createEncodedReportPdf();

      if (isIos) {
        await sharePdfReport(getPdfFileName(), encodedPdf);
        return;
      }

      const pdfBytes = decodeBase64(encodedPdf);
      const targetPath = await save({
        defaultPath: getPdfFileName(),
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
    } finally {
      setIsSavingReport(false);
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
    if (isSavingReport) return;

    if (isAndroid && savedAndroidReport) {
      void handleOpenSavedAndroidReport();
      return;
    }

    void handleSaveReport();
  };

  const patientSummary = buildReportPatientSummary(activeChild, startDate, endDate);
  const isPreparingReport = isSavingReport || isAutoSavingReport;
  const reportActionLabel = (() => {
    if (isPreparingReport) return "Preparing PDF...";
    if (isAndroid && savedAndroidReport) return "Open PDF report";
    if (isIos) return "Share PDF report";
    return getReportSaveLabel(isAndroid);
  })();
  const reportActionHelpText = (() => {
    if (isPreparingReport) return "Rendering the report into a PDF. The save or share dialog will open in a moment.";
    if (isAndroid && savedAndroidReport) return "Report saved to Downloads. Tap to open it.";
    if (isIos) return "Opens the iOS share sheet so you can save to Files, open in Books, or share.";
    return getReportSaveHelpText(isAndroid);
  })();
  const heroDescription = reportKind === "poopTummy"
    ? "Prepare a pediatrician-ready poop and tummy PDF with diapers, stool patterns, and timeline detail."
    : "Prepare a pediatrician-ready PDF with charts, context, and timeline detail.";

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <ScenicHero
        child={activeChild}
        title="Report"
        description={heroDescription}
        className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
        showChildInfo={false}
      />

      <div className="-mt-36 px-4 md:-mt-32 md:px-10">
        <ReportComposerCard
          today={today}
          startDate={startDate}
          endDate={endDate}
          isGenerating={isGenerating || isAutoSavingReport || isSavingReport}
          reportKind={reportKind}
          options={options}
          onReportKindChange={setReportKind}
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
              isSaving={isPreparingReport}
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
