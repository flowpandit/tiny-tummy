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

function ReportReadyBanner({
  onOpen,
  onDismiss,
}: {
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-40 px-4 md:px-6"
      style={{ top: "calc(var(--safe-area-top) + 80px)" }}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[520px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-2.5 shadow-[var(--shadow-medium)] backdrop-blur-[18px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-healthy-bg)] text-[var(--color-healthy)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m5 10.4 3.1 3.1L15.2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--color-text)]">
          Report is ready
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="min-h-9 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98]"
        >
          Open
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-home-hover-surface)] hover:text-[var(--color-text-secondary)]"
          aria-label="Dismiss report ready banner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
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
  const [isReportReadyBannerVisible, setIsReportReadyBannerVisible] = useState(false);
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
    setIsReportReadyBannerVisible(true);
    return savedReport;
  }, [createEncodedReportPdf, getPdfFileName, reportData]);

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
      setIsReportReadyBannerVisible(false);
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
      setIsReportReadyBannerVisible(false);
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
      {isAndroid && savedAndroidReport && isReportReadyBannerVisible && (
        <ReportReadyBanner
          onOpen={() => { void handleOpenSavedAndroidReport(); }}
          onDismiss={() => setIsReportReadyBannerVisible(false)}
        />
      )}

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
