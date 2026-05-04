const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const EXPORT_VIEWPORT_WIDTH = 1280;
const EXPORT_VIEWPORT_HEIGHT = Math.round((EXPORT_VIEWPORT_WIDTH * A4_HEIGHT_MM) / A4_WIDTH_MM);

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

  for (const [index, page] of pages.entries()) {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }

    const pageWidth = Math.max(1, Math.round(page.getBoundingClientRect().width));
    const pageHeight = Math.round((pageWidth * A4_HEIGHT_MM) / A4_WIDTH_MM);
    const canvas = await html2canvas(page, {
      allowTaint: false,
      backgroundColor: "#fffdf8",
      height: pageHeight,
      imageTimeout: 15000,
      logging: false,
      scale: getPdfCaptureScale(),
      useCORS: true,
      width: pageWidth,
      windowWidth: EXPORT_VIEWPORT_WIDTH,
      windowHeight: EXPORT_VIEWPORT_HEIGHT,
      onclone: (documentClone) => {
        documentClone.body.classList.add("tt-report-html-pdf-export");
      },
    });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
      undefined,
      "FAST",
    );
  }

  return arrayBufferToBase64(pdf.output("arraybuffer"));
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
