import { useMemo, useState } from "react";
import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { platform } from "@tauri-apps/plugin-os";
import { useNavigate } from "react-router-dom";
import { CaregiverHandoffPanel } from "../components/handoff/CaregiverHandoffPanel";
import { Button } from "../components/ui/button";
import { PageBody } from "../components/ui/page-layout";
import { useToast } from "../components/ui/toast";
import { useActiveChild } from "../contexts/ChildContext";
import { useServices } from "../contexts/DatabaseContext";
import { useUnits } from "../contexts/UnitsContext";
import { useCaregiverHandoff } from "../hooks/useCaregiverHandoff";
import {
  buildCaregiverHandoffPdfFileName,
  buildCaregiverHandoffReportOptions,
  getCaregiverHandoffPdfErrorMessage,
} from "../lib/handoff-pdf";
import { formatHandoffSummaryText } from "../lib/handoff-summary";
import { renderReportPdfBase64 } from "../lib/report-pdf-renderer";
import { openPdfFromDownloads, savePdfToDownloads, sharePdfReport } from "../lib/tauri";

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function HandoffPdfReadyBanner({
  actionLabel,
  onAction,
  onDismiss,
}: {
  actionLabel: string;
  onAction: () => void;
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
          Handoff PDF ready
        </p>
        <button
          type="button"
          onClick={onAction}
          className="min-h-9 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98]"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-home-hover-surface)] hover:text-[var(--color-text-secondary)]"
          aria-label="Dismiss handoff PDF ready banner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function HandoffLoadingState() {
  return (
    <div className="rounded-[22px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-5 shadow-[var(--shadow-home-card)] md:rounded-[28px] md:px-6 md:py-6">
      <div className="h-4 w-28 rounded-full bg-[var(--color-home-empty-surface)]" />
      <div className="mt-3 h-8 w-44 rounded-full bg-[var(--color-home-empty-surface)]" />
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-[74px] rounded-[16px] bg-[var(--color-home-empty-surface)] md:h-[92px]" />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-14 rounded-[16px] bg-[var(--color-home-empty-surface)]" />
        ))}
      </div>
    </div>
  );
}

export function CaregiverHandoff() {
  const activeChild = useActiveChild();
  const { report } = useServices();
  const { unitSystem } = useUnits();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const currentPlatform = platform();
  const isAndroid = currentPlatform === "android";
  const isIos = currentPlatform === "ios";
  const { summary, isLoading, error, refresh } = useCaregiverHandoff(activeChild);
  const [parentNote, setParentNote] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savedAndroidPdf, setSavedAndroidPdf] = useState<{ fileName: string; uri: string } | null>(null);
  const [sharedIosPdf, setSharedIosPdf] = useState<{ fileName: string; base64Data: string } | null>(null);
  const [isPdfReadyBannerVisible, setIsPdfReadyBannerVisible] = useState(false);
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const displaySummary = useMemo(() => {
    if (!summary) return null;
    return {
      ...summary,
      parentNote: parentNote.trim() || null,
    };
  }, [parentNote, summary]);
  const handoffText = useMemo(() => (
    displaySummary ? formatHandoffSummaryText(displaySummary) : ""
  ), [displaySummary]);

  const copyHandoffText = async (showToast = true) => {
    if (!handoffText) return;

    setIsCopying(true);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is not available on this device.");
      }
      await navigator.clipboard.writeText(handoffText);
      if (showToast) showSuccess("Caregiver handoff copied.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      showError(`Could not copy handoff: ${message}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopy = () => {
    void copyHandoffText();
  };

  const handleShare = async () => {
    if (!displaySummary || !handoffText || isSharing) return;

    if (!canUseNativeShare) {
      void copyHandoffText();
      return;
    }

    setIsSharing(true);
    try {
      await navigator.share({
        title: `Tiny Tummy handoff for ${displaySummary.child.name}`,
        text: handoffText,
      });
      showSuccess("Caregiver handoff shared.");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      const message = caught instanceof Error ? caught.message : String(caught);
      showError(`Could not share handoff: ${message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!activeChild || !displaySummary || isGeneratingPdf) return;

    const dayKey = displaySummary.handoffWindow.end || displaySummary.handoffWindow.start;
    const generatedAt = displaySummary.generatedAt;
    const pdfFileName = buildCaregiverHandoffPdfFileName(
      displaySummary.child.name,
      dayKey,
      new Date(generatedAt),
    );

    try {
      setIsGeneratingPdf(true);
      setSavedAndroidPdf(null);
      setSharedIosPdf(null);
      setIsPdfReadyBannerVisible(false);

      const options = buildCaregiverHandoffReportOptions({
        childId: activeChild.id,
        dayKey,
        generatedAt,
        parentNote,
      });
      const reportData = await report.generateReport({
        childId: activeChild.id,
        startDate: dayKey,
        endDate: dayKey,
        options,
        unitSystem,
        reportKind: "fullHealth",
        reportMode: "caregiver_handoff",
      });
      const result = await renderReportPdfBase64({
        child: activeChild,
        startDate: dayKey,
        endDate: dayKey,
        reportData,
        unitSystem,
        handoffSummary: displaySummary,
      });
      console.info(
        `[Tiny Tummy] ${result.renderer} handoff PDF generated in ${Math.round(result.durationMs)}ms`,
      );

      if (isAndroid) {
        const savedPdf = await savePdfToDownloads(pdfFileName, result.base64Data);
        setSavedAndroidPdf(savedPdf);
        setIsPdfReadyBannerVisible(true);
        return;
      }

      if (isIos) {
        await sharePdfReport(pdfFileName, result.base64Data);
        setSharedIosPdf({ fileName: pdfFileName, base64Data: result.base64Data });
        setIsPdfReadyBannerVisible(true);
        return;
      }

      const targetPath = await save({
        defaultPath: pdfFileName,
        filters: [
          {
            name: "Handoff PDF",
            extensions: ["pdf"],
          },
        ],
      });

      if (!targetPath) return;

      await writeFile(targetPath, decodeBase64(result.base64Data));
      showSuccess("Handoff PDF saved.");
    } catch {
      showError(getCaregiverHandoffPdfErrorMessage());
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenSavedAndroidPdf = async () => {
    if (!savedAndroidPdf) return;

    try {
      await openPdfFromDownloads(savedAndroidPdf.uri);
      setIsPdfReadyBannerVisible(false);
    } catch {
      showError("Could not open the saved handoff PDF.");
    }
  };

  const handleShareSavedIosPdf = async () => {
    if (!sharedIosPdf) return;

    try {
      await sharePdfReport(sharedIosPdf.fileName, sharedIosPdf.base64Data);
      setIsPdfReadyBannerVisible(false);
    } catch {
      showError("Could not share the handoff PDF.");
    }
  };

  if (!activeChild) return null;

  return (
    <PageBody className="space-y-4 px-4 py-3 md:px-10 md:py-5">
      {isAndroid && savedAndroidPdf && isPdfReadyBannerVisible && (
        <HandoffPdfReadyBanner
          actionLabel="Open"
          onAction={() => { void handleOpenSavedAndroidPdf(); }}
          onDismiss={() => setIsPdfReadyBannerVisible(false)}
        />
      )}
      {isIos && sharedIosPdf && isPdfReadyBannerVisible && (
        <HandoffPdfReadyBanner
          actionLabel="Share"
          onAction={() => { void handleShareSavedIosPdf(); }}
          onDismiss={() => setIsPdfReadyBannerVisible(false)}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-10 rounded-full px-1 text-[0.9rem] font-semibold text-[var(--color-home-link)]"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[var(--color-alert)]/25 bg-[var(--color-alert)]/8 px-4 py-3 text-[0.88rem] leading-relaxed text-[var(--color-text)]">
          {error}
        </div>
      )}

      {isLoading && !displaySummary ? (
        <HandoffLoadingState />
      ) : displaySummary ? (
        <CaregiverHandoffPanel
          summary={displaySummary}
          parentNote={parentNote}
          canUseNativeShare={canUseNativeShare}
          isCopying={isCopying}
          isSharing={isSharing}
          isGeneratingPdf={isGeneratingPdf}
          onParentNoteChange={setParentNote}
          onCopy={handleCopy}
          onShare={() => { void handleShare(); }}
          onGeneratePdf={() => { void handleGeneratePdf(); }}
          onRefresh={() => { void refresh(); }}
        />
      ) : (
        <div className="rounded-[22px] border border-[var(--color-home-card-border)] bg-[var(--color-home-card-surface)] px-4 py-6 text-center shadow-[var(--shadow-home-card)]">
          <p className="text-lg font-semibold text-[var(--color-text)]">Handoff is not ready</p>
          <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Tiny Tummy could not prepare the local summary.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => { void refresh(); }}>
            Try again
          </Button>
        </div>
      )}
    </PageBody>
  );
}
