import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Local copy under public/ -- no CDN. The app's CSP (index.html) has no
// worker-src of its own, so workers fall back to script-src, which only
// allows 'self' plus a short explicit allowlist (Stripe, unpkg, Lovable)
// -- a same-origin /pdfjs/ path needs nothing added there. This also
// sidesteps the actual bug this component replaces: the old <iframe>
// pointed at the Supabase storage URL directly, which CSP's frame-src
// blocks (it only allows 'self', Stripe, daily.co, Lovable -- no
// *.supabase.co). Rendering to <canvas> instead of framing the PDF avoids
// frame-src entirely; only connect-src applies to pdf.js's own fetch of
// the PDF bytes, and that already allows https://*.supabase.co.
//
// public/pdfjs/pdf.worker.min.mjs is a literal copy of node_modules/
// pdfjs-dist/build/pdf.worker.min.mjs -- pdf.js hard-errors if the
// worker's version doesn't match the `pdfjs-dist` package version this
// imports, so re-copy it (`cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs
// public/pdfjs/`) any time package.json's pdfjs-dist version changes.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}

/** One page: renders to <canvas> once it's near the viewport, not before. */
function PdfPage({ pdf, pageNumber, width }: PdfPageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null); // height / width, for the placeholder box before it's rendered

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setInView(true); },
      { rootMargin: '600px 0px' }, // starts rendering well before it's actually on screen, so scrolling doesn't outrun it
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || rendered || width <= 0) return;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = width / baseViewport.width;
      setAspectRatio(baseViewport.height / baseViewport.width);

      // Render at device pixel ratio for crisp text, then let the canvas'
      // own width:100%/height:auto CSS scale it back down to `width` --
      // same "render big, display small" approach as <img srcset>.
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (!cancelled) setRendered(true);
    })();
    return () => { cancelled = true; };
  }, [inView, rendered, pdf, pageNumber, width]);

  return (
    <div
      ref={wrapperRef}
      className="flex items-center justify-center rounded-lg border border-amber-500/15 bg-[#0d0805] overflow-hidden"
      style={{ minHeight: width * (aspectRatio ?? 1.294) }}
    >
      {!rendered && <Loader2 className="h-5 w-5 animate-spin text-amber-100/30" />}
      <canvas ref={canvasRef} className={`block w-full h-auto ${rendered ? '' : 'hidden'}`} />
    </div>
  );
}

interface Props {
  url: string;
}

/**
 * Renders a story PDF in-app, page by page, on <canvas> -- no <iframe>
 * (blocked by CSP's frame-src, which doesn't list *.supabase.co and isn't
 * getting a carve-out just for this). Same component regardless of
 * platform; pages lazy-render as they scroll into view (PdfPage above).
 * A plain "Open in a new tab" link sits under the last page as a minor
 * fallback/convenience, not the primary path anymore.
 */
export default function StoryPdfViewer({ url }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let doc: PDFDocumentProxy | null = null;
    pdfjsLib.getDocument({ url }).promise
      .then((d) => {
        if (!alive) { d.destroy(); return; }
        doc = d;
        setPdf(d);
      })
      .catch((e: unknown) => {
        console.error('Story PDF load failed:', e);
        if (alive) setError(e instanceof Error ? e.message : 'Could not load this PDF.');
      });
    return () => {
      alive = false;
      doc?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-amber-100/50 font-serif italic">Could not load this story's PDF here.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Open it in a new tab instead
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="py-4">
      {!pdf || width <= 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
      ) : (
        <>
          <div className="space-y-3">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PdfPage key={i + 1} pdf={pdf} pageNumber={i + 1} width={width} />
            ))}
          </div>
          <div className="pt-4 text-center">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Open in a new tab
            </a>
          </div>
        </>
      )}
    </div>
  );
}
