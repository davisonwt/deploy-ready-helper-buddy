import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { TILE_KINDS, type StallHotspot } from '@/lib/stalls/stallTypes';

const MIN_BOX_PCT = 2;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Exported so callers can assign ids to hotspots loaded without one (a
 * template's own JSON, or older stalls.hotspots rows) before handing them
 * to this editor -- every box here must have a stable id (used as both
 * React key and drag/edit target). */
export function newHotspotId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  imageUrl: string;
  value: StallHotspot[];
  onChange: (next: StallHotspot[]) => void;
}

type DragMode =
  | { kind: 'draw'; startXPct: number; startYPct: number }
  | { kind: 'move'; id: string; startXPct: number; startYPct: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; startXPct: number; startYPct: number; origW: number; origH: number };

/**
 * "Mark your shelves" (wizard step, object hotspots batch): draw a box
 * over each tappable object by drag (mouse or touch), then give it a
 * label + kind. Percent math mirrors StallInteriorView's own rendering
 * exactly (useContainImageRect + offsetX/Y + width/height), so a box drawn
 * here lands on the identical object once published.
 */
export default function HotspotEditor({ imageUrl, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<DragMode | null>(null);
  const drawBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [, forceTick] = useState(0);

  const pointToPct = (clientX: number, clientY: number) => {
    if (!rect || !containerRef.current) return null;
    const box = containerRef.current.getBoundingClientRect();
    const localX = clientX - box.left - rect.offsetX;
    const localY = clientY - box.top - rect.offsetY;
    return { x: clamp((localX / rect.width) * 100, 0, 100), y: clamp((localY / rect.height) * 100, 0, 100) };
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (!rect) return;
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: 'draw', startXPct: pt.x, startYPct: pt.y };
    drawBoxRef.current = { x: pt.x, y: pt.y, w: 0, h: 0 };
    setSelectedId(null);
    forceTick((n) => n + 1);
  };

  const startMove = (e: React.PointerEvent, h: StallHotspot) => {
    e.stopPropagation();
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: 'move', id: h.id!, startXPct: pt.x, startYPct: pt.y, origX: h.x, origY: h.y };
    setSelectedId(h.id!);
  };

  const startResize = (e: React.PointerEvent, h: StallHotspot) => {
    e.stopPropagation();
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: 'resize', id: h.id!, startXPct: pt.x, startYPct: pt.y, origW: h.w, origH: h.h };
    setSelectedId(h.id!);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    if (d.kind === 'draw') {
      const x = Math.min(d.startXPct, pt.x);
      const y = Math.min(d.startYPct, pt.y);
      const w = Math.abs(pt.x - d.startXPct);
      const h = Math.abs(pt.y - d.startYPct);
      drawBoxRef.current = { x, y, w, h };
      forceTick((n) => n + 1);
      return;
    }
    if (d.kind === 'move') {
      const dx = pt.x - d.startXPct;
      const dy = pt.y - d.startYPct;
      onChange(value.map((h) => (h.id === d.id ? { ...h, x: clamp(d.origX + dx, 0, 100 - h.w), y: clamp(d.origY + dy, 0, 100 - h.h) } : h)));
      return;
    }
    if (d.kind === 'resize') {
      const dw = pt.x - d.startXPct;
      const dh = pt.y - d.startYPct;
      onChange(value.map((h) => (h.id === d.id ? { ...h, w: clamp(d.origW + dw, MIN_BOX_PCT, 100 - h.x), h: clamp(d.origH + dh, MIN_BOX_PCT, 100 - h.y) } : h)));
      return;
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (d?.kind === 'draw' && drawBoxRef.current) {
      const box = drawBoxRef.current;
      if (box.w >= MIN_BOX_PCT && box.h >= MIN_BOX_PCT) {
        const id = newHotspotId();
        onChange([...value, { id, kind: 'products', label: '', x: box.x, y: box.y, w: box.w, h: box.h }]);
        setSelectedId(id);
      }
    }
    dragRef.current = null;
    drawBoxRef.current = null;
    forceTick((n) => n + 1);
  };

  const updateHotspot = (id: string, patch: Partial<StallHotspot>) =>
    onChange(value.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const removeHotspot = (id: string) => {
    onChange(value.filter((h) => h.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const drawing = dragRef.current?.kind === 'draw' ? drawBoxRef.current : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-100/60">
        Drag on the image to draw a box over a shelf, mug, or instrument. Tap a box to edit its label. Drag its corner to resize, drag its middle to move.
      </p>
      <div
        ref={containerRef}
        className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-2xl border border-amber-500/25 bg-black shadow-lg"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img ref={imgRef} src={imageUrl} alt="Your stall interior" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        {rect && value.map((h) => {
          const isSelected = selectedId === h.id;
          return (
            <div
              key={h.id}
              onPointerDown={(e) => startMove(e, h)}
              className={`absolute cursor-move rounded-lg border-2 ${isSelected ? 'border-amber-300 bg-amber-300/20' : 'border-amber-400/70 bg-amber-400/10'}`}
              style={{
                left: rect.offsetX + (h.x / 100) * rect.width,
                top: rect.offsetY + (h.y / 100) * rect.height,
                width: (h.w / 100) * rect.width,
                height: (h.h / 100) * rect.height,
              }}
            >
              <span className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                {h.label || 'Untitled'}
              </span>
              <div
                onPointerDown={(e) => startResize(e, h)}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-black bg-amber-300"
              />
            </div>
          );
        })}
        {rect && drawing && drawing.w > 0 && drawing.h > 0 && (
          <div
            className="pointer-events-none absolute rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-300/15"
            style={{
              left: rect.offsetX + (drawing.x / 100) * rect.width,
              top: rect.offsetY + (drawing.y / 100) * rect.height,
              width: (drawing.w / 100) * rect.width,
              height: (drawing.h / 100) * rect.height,
            }}
          />
        )}
      </div>

      <div className="space-y-2">
        {value.length === 0 && (
          <p className="rounded-lg border border-dashed border-amber-500/25 p-4 text-center text-xs text-amber-100/50">
            No shelves marked yet — drag on the image above to add your first one.
          </p>
        )}
        {value.map((h) => (
          <div
            key={h.id}
            className={`rounded-xl border p-3 space-y-2 ${selectedId === h.id ? 'border-amber-400/60 bg-amber-500/5' : 'border-amber-500/20 bg-black/30'}`}
            onClick={() => setSelectedId(h.id ?? null)}
          >
            <div className="flex items-center gap-2">
              <Input
                placeholder="Label (e.g. My mugs)"
                value={h.label}
                onChange={(e) => updateHotspot(h.id!, { label: e.target.value })}
                maxLength={40}
                className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeHotspot(h.id!)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TILE_KINDS.map((k) => (
                <Button
                  key={k.id}
                  type="button"
                  size="sm"
                  variant={h.kind === k.id ? 'default' : 'outline'}
                  aria-pressed={h.kind === k.id}
                  onClick={() => updateHotspot(h.id!, { kind: k.id })}
                  className={
                    h.kind === k.id
                      ? 'bg-amber-500 text-amber-950 border-amber-500 hover:bg-amber-400'
                      : 'border-amber-500/25 text-amber-100/70 hover:bg-amber-500/10'
                  }
                >
                  {k.label}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Caption on hover/tap (optional)"
              value={h.caption ?? ''}
              onChange={(e) => updateHotspot(h.id!, { caption: e.target.value || undefined })}
              maxLength={80}
              className="bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
