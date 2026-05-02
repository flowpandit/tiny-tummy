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
import { buildReportPdfPayload } from "../lib/report-pdf";
import {
  buildReportPatientSummary,
  getReportSaveHelpText,
  getReportSaveLabel,
  hasReportableTimeline,
} from "../lib/report-view-model";
import { useToast } from "../components/ui/toast";
import { generateReportPdf, savePdfToDownloads } from "../lib/tauri";
import { loadAvatarDataUrl } from "../lib/photos";

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
      const childAvatarDataUrl = await loadAvatarDataUrl(activeChild.id).catch(() => null);
      const encodedPdf = await generateReportPdf(buildReportPdfPayload({
        child: activeChild,
        startDate,
        endDate,
        data: reportData,
        unitSystem,
        childAvatarDataUrl,
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

            {reportPreviewPayload && hasGeneratedTimeline && <ReportPreview payload={reportPreviewPayload} />}
          </>
        )}

        <CareToolsSection className="px-0" palette="soft" />
      </div>
    </PageBody>
  );
}
