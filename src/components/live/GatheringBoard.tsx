/**
 * GatheringBoard — Gathering Room batch 1's board content: host-typed text
 * (LiveStage.tsx's own existing 'whiteboard' mode, untouched), PDF with a
 * host-synced page, a short video clip with synced playback, and a pinned
 * seed with real Bestow. Rendered inside LiveStage's existing big-stage
 * area for the 'pdf' | 'clip' | 'seed' modes; camera/image/whiteboard/video
 * stay exactly as LiveStage.tsx already renders them.
 */
import SignedImg from '@/components/media/SignedImg';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Loader2, Upload, ChevronLeft, ChevronRight, Play, Pause, ZoomIn, ZoomOut, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import SeedCard, { type SeedCardKind } from '@/components/seeds/SeedCard';
import type { StagePayload, PinnedSeed } from '@/hooks/useLiveStage';

// Same worker setup StoryPdfViewer.tsx uses -- idempotent to re-assign.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

/** "Now: <title>" label -- shown regardless of which board mode is active.
 * Auto-fades after 3s (mirrors PdfBoard's own bottom control-bar fade
 * below) -- on phone portrait the board area is shorter than a typical
 * page/canvas (see PdfBoard's fitSize vs its own clientHeight), so a
 * permanently-visible top pill sits directly on top of the first line of
 * text instead of above it. Re-shows briefly whenever the title changes. */
export function NowLabel({ title }: { title: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [title]);
  return (
    <div
      className={`absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-amber-200 backdrop-blur transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      Now: {title}
    </div>
  );
}

/** Pinch (touch) / ctrl-wheel (trackpad) / +/- buttons zoom, pure client-side -- no server involvement, per docs/GATHERING-ROOM.md #2. */
function useZoom() {
  const [scale, setScale] = useState(1);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setScale((s) => Math.min(3, Math.max(1, s - e.deltaY * 0.01)));
  }, []);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinchStartDist.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchStartScale.current = scale;
  }, [scale]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchStartDist.current == null) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    setScale(Math.min(3, Math.max(1, pinchStartScale.current * (dist / pinchStartDist.current))));
  }, []);
  const onTouchEnd = useCallback(() => { pinchStartDist.current = null; }, []);

  return { scale, setScale, onWheel, onTouchStart, onTouchMove, onTouchEnd };
}

function ZoomControls({ scale, setScale }: { scale: number; setScale: (s: number) => void }) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur">
      <button type="button" onClick={() => setScale(Math.max(1, scale - 0.5))} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label="Zoom out">
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="w-9 text-center text-[10px] font-bold text-white/70">{Math.round(scale * 100)}%</span>
      <button type="button" onClick={() => setScale(Math.min(3, scale + 0.5))} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label="Zoom in">
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── PDF board ────────────────────────────────────────────────────────────

type BoardUploadResult = { url: string } | { error: string };

/**
 * Never throws -- every failure path (storage error, moderation
 * reject/scanner-error, an unexpected exception) resolves to `{error}`
 * with a message fit to show the host directly, so a failed upload is
 * never silent. Previously returned `string | null` and only
 * console.warn'd the reason -- a host with devtools closed saw nothing at
 * all, which is indistinguishable from the click itself not working.
 */
async function uploadBoardFile(userId: string, file: File, kind: 'pdf' | 'clip'): Promise<BoardUploadResult> {
  try {
    const ext = kind === 'pdf' ? 'pdf' : (file.name.split('.').pop() || 'mp4');
    const path = `${userId}/gathering/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, file, {
      cacheControl: '3600', contentType: file.type || undefined, upsert: false,
    });
    if (uploadErr) return { error: uploadErr.message || 'Upload failed.' };
    const { verdict, reason } = await moderateStorageUpload('stalls', path, kind === 'pdf' ? 'image' : 'video');
    if (verdict !== 'allow') {
      await supabase.storage.from('stalls').remove([path]);
      return { error: moderationRejectionMessage(reason, kind === 'pdf' ? 'file' : 'video') };
    }
    const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
    return { url: pub.publicUrl };
  } catch (e) {
    console.error('board upload failed', e);
    return { error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

function BoardUploadPrompt({ label, accept, busy, onFile }: { label: string; accept: string; busy: boolean; onFile: (f: File) => void }) {
  return (
    <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-white/50">
      {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
      <span className="text-sm">{busy ? 'Uploading…' : label}</span>
      <input type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );
}

interface BoardProps {
  isHost: boolean;
  stage: StagePayload;
  setStageMode: (p: Omit<StagePayload, 'at'>) => void;
}

export function PdfBoard({ isHost, stage, setStageMode }: BoardProps) {
  const { user } = useAuth();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoom = useZoom();
  const page = stage.pdfPage ?? 1;
  // The canvas's own CSS display size at scale=1 ("fit" width, matching
  // the container -- same basis the render-resolution effect below
  // already uses) -- the zoomed display size is this * zoom.scale.
  const [fitSize, setFitSize] = useState({ width: 0, height: 0 });

  // Zoom + page-turn controls auto-fade after 3s idle, reappear on any tap/
  // interaction -- on a short board (phone portrait especially) a
  // permanently-visible bottom bar sits on top of the page text underneath
  // it for as long as it's shown; fading it out the rest of the time is
  // the actual fix, not just moving it (it was already bottom-anchored,
  // just permanently visible over a board too short to spare the room).
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);
  useEffect(() => {
    bumpControls();
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
  }, [bumpControls, stage.pdfUrl]);

  useEffect(() => {
    if (!stage.pdfUrl) { setPdf(null); return; }
    let alive = true;
    pdfjsLib.getDocument({ url: stage.pdfUrl }).promise.then((doc) => {
      if (!alive) { doc.destroy(); return; }
      setPdf(doc);
      if (isHost && !stage.pdfPageCount) setStageMode({ ...stage, pdfPageCount: doc.numPages });
    }).catch((e) => console.error('board pdf load failed', e));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.pdfUrl]);

  useEffect(() => {
    if (!pdf || !containerRef.current || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const p = await pdf.getPage(Math.min(page, pdf.numPages));
      if (cancelled) return;
      const width = containerRef.current!.clientWidth;
      const base = p.getViewport({ scale: 1 });
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current!;
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await p.render({ canvasContext: ctx, viewport, canvas }).promise;
      if (!cancelled) setFitSize({ width, height: width * (base.height / base.width) });
    })();
    return () => { cancelled = true; };
  }, [pdf, page]);

  const handleFile = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const result = await uploadBoardFile(user.id, file, 'pdf');
      if ('url' in result) {
        setStageMode({ ...stage, pdfUrl: result.url, pdfPage: 1, pdfPageCount: undefined });
      } else {
        toast.error(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!stage.pdfUrl) {
    return isHost
      ? <BoardUploadPrompt label="Upload a PDF" accept="application/pdf" busy={busy} onFile={handleFile} />
      : <div className="flex h-full items-center justify-center text-sm text-white/40">Host hasn't uploaded a PDF yet.</div>;
  }

  // Zoomed-in scroll (was: transform:scale() inside overflow-hidden, which
  // visually blows the canvas up past its box with no way to reach the
  // clipped part). The canvas now gets a real CSS width/height (fitWidth/
  // fitHeight * scale) instead of a transform, so at scale>1 it's
  // genuinely larger than its scroll container in layout terms -- native
  // wheel/trackpad/touch-drag scrolling reaches every part of it with no
  // custom pan logic needed (zoom.onWheel/onTouch* already only
  // preventDefault for the ctrl-wheel/pinch zoom gesture itself; a plain
  // scroll/drag already falls through to the browser's own scrolling).
  // Centered via `m-auto` on the flex CHILD, not `items-center
  // justify-content` on the flex parent -- the parent-level version is
  // the well-known flexbox bug where a centered child that overflows its
  // container can never be scrolled back to its own start edge; margin:
  // auto on the child centers it exactly the same way while it fits, and
  // degrades to normal reachable overflow once it doesn't.
  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-col overflow-hidden bg-[#0d0805]">
      <div
        className="flex h-full w-full overflow-auto"
        // Only re-bump the fade timer for an actual zoom gesture (ctrl-wheel /
        // two-finger pinch start), not a plain scroll/pan -- on phone
        // portrait the board is shorter than the page (see PdfBoard's
        // fitSize vs. its own clientHeight), so reading it means
        // single-finger scrolling almost every time. Bumping on every
        // touchstart/wheel meant the bar reappeared over whatever text had
        // just been scrolled into view, on every scroll. A plain tap
        // (onClick) still explicitly reveals it.
        onWheel={(e) => { zoom.onWheel(e); if (e.ctrlKey) bumpControls(); }}
        onTouchStart={(e) => { zoom.onTouchStart(e); if (e.touches.length === 2) bumpControls(); }}
        onTouchMove={(e) => { zoom.onTouchMove(e); }}
        onTouchEnd={zoom.onTouchEnd}
        onClick={bumpControls}
      >
        {!pdf ? (
          <div className="m-auto"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
        ) : (
          <canvas
            ref={canvasRef}
            className="m-auto block shrink-0"
            style={fitSize.width ? { width: fitSize.width * zoom.scale, height: fitSize.height * zoom.scale } : undefined}
          />
        )}
      </div>

      {/* One combined bar, pinned to the board's own bottom edge, never
          mid-page -- was two separate always-visible pills (zoom
          bottom-right, page-turn bottom-center) that had nothing reserving
          the space under them, so on a short board (phone portrait
          especially) they sat directly on top of the page text. Auto-fades
          after 3s idle (bumpControls resets the timer on any tap/zoom/
          page-turn); a tap anywhere on the board brings it back. */}
      {pdf && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-2 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/75 px-2 py-1 backdrop-blur">
            <button type="button" onClick={() => { zoom.setScale(Math.max(1, zoom.scale - 0.5)); bumpControls(); }} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center text-[10px] font-bold text-white/70">{Math.round(zoom.scale * 100)}%</span>
            <button type="button" onClick={() => { zoom.setScale(Math.min(3, zoom.scale + 0.5)); bumpControls(); }} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="h-4 w-px shrink-0 bg-white/20" />
            {isHost ? (
              <>
                <button type="button" disabled={page <= 1} onClick={() => { setStageMode({ ...stage, pdfPage: page - 1 }); bumpControls(); }} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30" aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="whitespace-nowrap text-xs font-bold text-white/80">Page {page} of {stage.pdfPageCount ?? pdf.numPages}</span>
                <button type="button" disabled={page >= (stage.pdfPageCount ?? pdf.numPages)} onClick={() => { setStageMode({ ...stage, pdfPage: page + 1 }); bumpControls(); }} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30" aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <span className="whitespace-nowrap text-xs font-bold text-white/70">Page {page} of {stage.pdfPageCount ?? '…'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clip board ───────────────────────────────────────────────────────────

export function ClipBoard({ isHost, stage, setStageMode }: BoardProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zoom = useZoom();

  // Viewers (and the host's own re-render) apply the synced play/pause/time
  // -- correcting drift beyond 0.75s rather than fighting the video element
  // on every render.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isHost) return;
    if (Math.abs(v.currentTime - (stage.clipTime ?? 0)) > 0.75) v.currentTime = stage.clipTime ?? 0;
    if (stage.clipPlaying && v.paused) void v.play().catch(() => {});
    if (!stage.clipPlaying && !v.paused) v.pause();
  }, [stage.clipPlaying, stage.clipTime, isHost]);

  const handleFile = async (file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const result = await uploadBoardFile(user.id, file, 'clip');
      if ('url' in result) {
        setStageMode({ ...stage, clipUrl: result.url, clipPlaying: false, clipTime: 0 });
      } else {
        toast.error(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const broadcastState = () => {
    const v = videoRef.current;
    if (!v) return;
    setStageMode({ ...stage, clipPlaying: !v.paused, clipTime: v.currentTime });
  };

  if (!stage.clipUrl) {
    return isHost
      ? <BoardUploadPrompt label="Upload a short clip" accept="video/*" busy={busy} onFile={handleFile} />
      : <div className="flex h-full items-center justify-center text-sm text-white/40">Host hasn't shared a clip yet.</div>;
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black" onWheel={zoom.onWheel} onTouchStart={zoom.onTouchStart} onTouchMove={zoom.onTouchMove} onTouchEnd={zoom.onTouchEnd}>
      <video
        ref={videoRef}
        src={stage.clipUrl}
        playsInline
        muted={!isHost}
        controls={isHost}
        onPlay={() => isHost && broadcastState()}
        onPause={() => isHost && broadcastState()}
        onSeeked={() => isHost && broadcastState()}
        className="max-h-full max-w-full object-contain transition-transform"
        style={{ transform: `scale(${zoom.scale})` }}
      />
      <ZoomControls scale={zoom.scale} setScale={zoom.setScale} />
      {!isHost && (
        <button
          type="button"
          onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
          className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur"
        >
          {stage.clipPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} synced to host
        </button>
      )}
    </div>
  );
}

// ── Seed-pin board ───────────────────────────────────────────────────────

interface OwnSeedOption { id: string; title: string; cover_image_url: string | null; price: number | null; type: string | null; }

function productTypeToKind(type: string | null): SeedCardKind {
  if (type === 'music') return 'music';
  if (type === 'ebook') return 'book';
  if (type === 'video') return 'video';
  return 'seed';
}

export function SeedPinBoard({ isHost, stage, setStageMode }: BoardProps) {
  const { user } = useAuth();
  const [options, setOptions] = useState<OwnSeedOption[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isHost || !pickerOpen || options || !user) return;
    (async () => {
      const { data: sower } = await supabase.from('sowers').select('id').eq('user_id', user.id).maybeSingle();
      if (!sower) { setOptions([]); return; }
      const { data } = await supabase
        .from('products')
        .select('id, title, cover_image_url, price, type')
        .eq('sower_id', (sower as any).id)
        .order('updated_at', { ascending: false })
        .limit(20);
      setOptions((data as OwnSeedOption[] | null) ?? []);
    })();
  }, [isHost, pickerOpen, options, user]);

  const pin = (o: OwnSeedOption) => {
    if (!user) return;
    const displayName = (user as any)?.user_metadata?.display_name || user.email?.split('@')[0] || null;
    const seed: PinnedSeed = {
      id: o.id, kind: productTypeToKind(o.type), title: o.title, cover: o.cover_image_url,
      price: Number(o.price || 0), ownerId: user.id, ownerName: displayName, openPath: `/stall/build?tab=products`,
    };
    setStageMode({ ...stage, pinnedSeed: seed });
    setPickerOpen(false);
  };

  if (!stage.pinnedSeed) {
    if (!isHost) return <div className="flex h-full items-center justify-center text-sm text-white/40">Host hasn't pinned a seed yet.</div>;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <button type="button" onClick={() => setPickerOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/20">
          <Pin className="h-4 w-4" /> Pin one of your seeds
        </button>
        {pickerOpen && (
          <div className="max-h-64 w-full max-w-sm overflow-y-auto rounded-xl border border-white/10 bg-black/60">
            {options === null && <div className="p-3 text-center text-xs text-white/40">Loading…</div>}
            {options?.length === 0 && <div className="p-3 text-center text-xs text-white/40">No seeds found.</div>}
            {options?.map((o) => (
              <button key={o.id} type="button" onClick={() => pin(o)} className="flex w-full items-center gap-2 border-b border-white/5 p-2 text-left text-xs text-white/85 hover:bg-white/5">
                {o.cover_image_url ? <SignedImg src={o.cover_image_url} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-white/10" />}
                <span className="flex-1 truncate">{o.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const seed = stage.pinnedSeed;
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-xs">
        <SeedCard
          id={seed.id}
          kind={seed.kind}
          title={seed.title}
          subtitle={seed.subtitle}
          cover={seed.cover}
          ownerId={seed.ownerId}
          ownerName={seed.ownerName}
          price={seed.price}
          openPath={seed.openPath}
        />
        {isHost && (
          <button type="button" onClick={() => setStageMode({ ...stage, pinnedSeed: null })} className="mt-2 w-full rounded-full border border-white/15 py-1.5 text-xs text-white/60 hover:bg-white/5">
            Unpin
          </button>
        )}
      </div>
    </div>
  );
}
