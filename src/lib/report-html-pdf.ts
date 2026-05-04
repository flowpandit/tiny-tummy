const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_MARGIN_X_MM = 13;
const PDF_FOOTER_LINE_Y_MM = 280;
const PDF_FOOTER_TEXT_Y_MM = 288;
const PDF_CONTENT_HEIGHT_MM = 275;
const EXPORT_VIEWPORT_WIDTH = 1280;
const EXPORT_VIEWPORT_HEIGHT = Math.round((EXPORT_VIEWPORT_WIDTH * A4_HEIGHT_MM) / A4_WIDTH_MM);
const MIN_SAFE_SLICE_RATIO = 0.45;
const REPORT_MAJOR_BREAK_CANDIDATE_SELECTOR = [
  ".tt-report-header",
  ".tt-report-meta",
  ".tt-report-brief",
  ".tt-concern-grid",
  ".tt-report-section",
  ".tt-metric-grid",
  ".tt-report-chart-grid",
  ".tt-chart-card",
  ".tt-report-two-column",
  ".tt-report-panel",
  ".tt-care-notes",
  ".tt-report-note",
  ".tt-timeline-tabs",
  ".tt-timeline-table",
  ".tt-timeline-group",
].join(",");
const REPORT_MINOR_BREAK_CANDIDATE_SELECTOR = [
  ".tt-table-row",
  ".tt-clinical-table > div",
  ".tt-info-row",
].join(",");

export async function renderReportPreviewToPdfBase64(previewRoot: HTMLElement): Promise<string> {
  const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>(".tt-report-page"));

  if (pages.length === 0) {
    throw new Error("Report preview is not ready yet.");
  }

  await waitForReportAssets(previewRoot);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let physicalPageNumber = 1;

  for (const [index, page] of pages.entries()) {
    const pageWidth = Math.max(1, Math.round(page.getBoundingClientRect().width));
    const pageHeight = getLogicalPageCaptureHeight(page, pageWidth);
    const captureId = `report-pdf-page-${index}-${Date.now()}`;
    page.dataset.reportPdfPageId = captureId;

    const canvas = await (async () => {
      try {
        return await html2canvas(page, {
          allowTaint: false,
          backgroundColor: "#fffdf8",
          height: pageHeight,
          imageTimeout: 15000,
          logging: false,
          scale: getPdfCaptureScale(),
          useCORS: true,
          width: pageWidth,
          windowWidth: EXPORT_VIEWPORT_WIDTH,
          windowHeight: Math.max(EXPORT_VIEWPORT_HEIGHT, pageHeight),
          onclone: (documentClone) => {
            documentClone.body.classList.add("tt-report-html-pdf-export");
            const clonedPage = documentClone.querySelector<HTMLElement>(`[data-report-pdf-page-id="${captureId}"]`);
            if (!clonedPage) return;

            clonedPage.style.setProperty("height", `${pageHeight}px`, "important");
            clonedPage.style.setProperty("min-height", `${pageHeight}px`, "important");
            clonedPage.style.setProperty("max-height", "none", "important");
            clonedPage.style.setProperty("overflow", "visible", "important");
          },
        });
      } finally {
        page.removeAttribute("data-report-pdf-page-id");
      }
    })();

    const sliceHeight = Math.round((pageWidth * PDF_CONTENT_HEIGHT_MM) / A4_WIDTH_MM);
    const breakpoints = buildPageBreakpoints(page, pageHeight, sliceHeight);
    const footerText = getReportFooterText(page);

    for (const [sliceIndex, breakpoint] of breakpoints.entries()) {
      if (index > 0 || sliceIndex > 0) {
        pdf.addPage("a4", "portrait");
      }

      const sliceCanvas = createCanvasSlice(canvas, breakpoint.start, breakpoint.end, pageWidth);
      const sliceHeightMm = Math.min(PDF_CONTENT_HEIGHT_MM, ((breakpoint.end - breakpoint.start) / pageWidth) * A4_WIDTH_MM);

      pdf.addImage(
        sliceCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        A4_WIDTH_MM,
        sliceHeightMm,
        undefined,
        "FAST",
      );
      drawReportFooter(pdf, footerText, physicalPageNumber);
      physicalPageNumber += 1;
    }
  }

  return arrayBufferToBase64(pdf.output("arraybuffer"));
}

function getLogicalPageCaptureHeight(page: HTMLElement, pageWidth: number) {
  const pageHeight = Math.round((pageWidth * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const content = page.querySelector<HTMLElement>(".tt-report-page__content");
  const pageRect = page.getBoundingClientRect();
  const contentBottom = content ? Math.ceil(content.getBoundingClientRect().bottom - pageRect.top) : 0;

  return Math.max(pageHeight, page.scrollHeight, contentBottom);
}

function buildPageBreakpoints(page: HTMLElement, fullHeight: number, sliceHeight: number) {
  const breakpoints: Array<{ start: number; end: number }> = [];
  const majorBreakOffsets = getSafeBreakOffsets(page, fullHeight, REPORT_MAJOR_BREAK_CANDIDATE_SELECTOR);
  const minorBreakOffsets = getSafeBreakOffsets(page, fullHeight, REPORT_MINOR_BREAK_CANDIDATE_SELECTOR);
  let start = 0;

  while (start < fullHeight - 1) {
    const targetEnd = Math.min(fullHeight, start + sliceHeight);
    if (targetEnd >= fullHeight) {
      breakpoints.push({ start, end: fullHeight });
      break;
    }

    const minimumEnd = start + Math.round(sliceHeight * MIN_SAFE_SLICE_RATIO);
    const safeEnd = findSafeBreakpoint(majorBreakOffsets, start, minimumEnd, targetEnd)
      ?? findSafeBreakpoint(minorBreakOffsets, start, minimumEnd, targetEnd);

    const end = safeEnd ?? targetEnd;
    breakpoints.push({ start, end });
    start = end;
  }

  return breakpoints;
}

function findSafeBreakpoint(offsets: number[], start: number, minimumEnd: number, targetEnd: number) {
  return [...offsets]
    .reverse()
    .find((offset) => offset > minimumEnd && offset <= targetEnd - 1 && offset > start);
}

function getSafeBreakOffsets(page: HTMLElement, fullHeight: number, selector: string) {
  const pageRect = page.getBoundingClientRect();
  const offsets = Array.from(page.querySelectorAll<HTMLElement>(selector))
    .map((element) => Math.round(element.getBoundingClientRect().top - pageRect.top))
    .filter((offset) => offset > 0 && offset < fullHeight);

  return [...new Set(offsets)].sort((left, right) => left - right);
}

function createCanvasSlice(canvas: HTMLCanvasElement, start: number, end: number, pageWidth: number) {
  const scale = canvas.width / pageWidth;
  const sliceStart = Math.max(0, Math.round(start * scale));
  const sliceHeight = Math.max(1, Math.min(canvas.height - sliceStart, Math.round((end - start) * scale)));
  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = canvas.width;
  sliceCanvas.height = sliceHeight;

  const context = sliceCanvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the PDF page image.");
  }

  context.drawImage(canvas, 0, sliceStart, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
  return sliceCanvas;
}

function getReportFooterText(page: HTMLElement) {
  return page.querySelector<HTMLElement>(".tt-report-footer > span:nth-child(2)")?.textContent?.trim()
    ?? "Generated locally by Tiny Tummy.";
}

function drawReportFooter(
  pdf: {
    setDrawColor: (red: number, green: number, blue: number) => void;
    setTextColor: (red: number, green: number, blue: number) => void;
    setFontSize: (size: number) => void;
    setFont: (fontName: string, fontStyle?: string) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
    text: (text: string | string[], x: number, y: number, options?: { maxWidth?: number; align?: "left" | "center" | "right" }) => void;
  },
  footerText: string,
  pageNumber: number,
) {
  pdf.setDrawColor(217, 210, 197);
  pdf.line(PDF_MARGIN_X_MM, PDF_FOOTER_LINE_Y_MM, A4_WIDTH_MM - PDF_MARGIN_X_MM, PDF_FOOTER_LINE_Y_MM);
  pdf.setTextColor(48, 44, 44);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.text(footerText, PDF_MARGIN_X_MM, PDF_FOOTER_TEXT_Y_MM, { maxWidth: 146 });
  pdf.setTextColor(32, 27, 28);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Page ${pageNumber}`, A4_WIDTH_MM - PDF_MARGIN_X_MM, PDF_FOOTER_TEXT_Y_MM, { align: "right" });
}

async function waitForReportAssets(root: HTMLElement) {
  await document.fonts?.ready;
  await Promise.all(Array.from(root.querySelectorAll("img")).map(waitForImage));
  await nextFrame();
  await nextFrame();
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getPdfCaptureScale() {
  return Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
}
