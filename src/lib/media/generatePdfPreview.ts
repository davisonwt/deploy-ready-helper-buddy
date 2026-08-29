import * as pdfjsLib from 'pdfjs-dist';
// Vite-native worker URL import — the standard pdfjs-dist + Vite pattern.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TARGET_WIDTH = 1200;
const MAX_PAGES = 3;

export interface PdfPreviewResult {
  /** Up to the first 3 pages, 1200px wide, no watermark — a real preview, not a teaser with a mark on it. */
  pages: Blob[];
  /** The document's real total page count (pdf.js, not a heuristic) — used to auto-fill the seed form's page count field. */
  pageCount: number;
}

/**
 * Renders the first up-to-3 pages of a PDF to 1200px-wide JPEG blobs,
 * entirely client-side (pdf.js) — spec-sowing-forms.md's Document/e-book
 * form. EPUB has no equivalent here; the cover stands in for it instead
 * (see SowBookPage.tsx).
 */
export async function generatePdfPagePreviews(file: File): Promise<PdfPreviewResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;
  const pagesToRender = Math.min(MAX_PAGES, pageCount);
  const pages: Blob[] = [];

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = TARGET_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported in this browser');

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not export page image'))),
        'image/jpeg',
        0.85
      );
    });
    pages.push(blob);
  }

  return { pages, pageCount };
}
