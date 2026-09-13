import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { TILE_KINDS, type StallHotspot } from '@/lib/stalls/stallTypes';

const MIN_BOX_PCT = 2;
const DEFAULT_BOX_PCT = 12;
/** Screen px -- a pointerdown/pointerup pair closer together than this on
 * empty canvas counts as a tap (mark a new box), not an accidental drag. */
const TAP_MOVE_THRESHOLD_PX = 6;

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
  | { kind: 'move'; id: string; startXPct: number; startYPct: number; origX: number; origY: number; startClientX: number; startClientY: number }
  | { kind: 'resize'; id: string; startXPct: number; startYPct: number; origW: number; origH: number };

/**
 * "Mark your shelves" (wizard step, object hotspots batch): tap the
 * interior to drop a default box over a shelf/mug/instrument, then move
 * or resize it by its corner handle. A tap on empty canvas opens a small
 * sheet right away to name and categorize the box just created; existing
 * boxes stay editable the same way below the canvas. Percent math mirrors
 * StallInteriorView's own rendering exactly (useContainImageRect +
 * offsetX/Y + width/height), so a box marked here lands on the identical
 * object once published.
 */
export default function HotspotEditor({ imageUrl, value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rect = useContainImageRect(containerRef, imgRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragRef = useRef<DragMode | null>(null);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceTick] = useState(0);

  const pointToPct = (clientX: number, clientY: number) => {
    if (!rect || !containerRef.current) return null;
    const box = containerRef.current.getBoundingClientRect();
    const localX = clientX - box.left - rect.offsetX;
    const localY = clientY - box.top - rect.offsetY;
    return { x: clamp((localX / rect.width) * 100, 0, 100), y: clamp((localY / rect.height) * 100, 0, 100) };
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return; // an existing box handles its own pointerdown
    tapStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const startMove = (e: React.PointerEvent, h: StallHotspot) => {
    e.stopPropagation();
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { kind: 'move', id: h.id!, startXPct: pt.x, startYPct: pt.y, origX: h.x, origY: h.y, startClientX: e.clientX, startClientY: e.clientY };
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

  const onPointerUp = (e: React.PointerEvent) => {
    // Finishing a move/resize on an existing box. A move that barely
    // moved was really a tap on that box -- open its edit sheet, same as
    // tapping empty canvas opens one for a brand new box. Using pointer
    // movement here (not onClick) on purpose: a plain click would also
    // fire after a real mouse drag, re-opening the sheet right after
    // every reposition.
    if (dragRef.current) {
      const d = dragRef.current;
      dragRef.current = null;
      if (d.kind === 'move') {
        const movedPx = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
        if (movedPx <= TAP_MOVE_THRESHOLD_PX) setEditingId(d.id);
      }
      forceTick((n) => n + 1);
      return;
    }
    // Otherwise: was this a tap on empty canvas (mark a new box), or a
    // drag/pan that happened to start and end on empty canvas (ignore)?
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start || e.target !== e.currentTarget) return;
    const movedPx = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (movedPx > TAP_MOVE_THRESHOLD_PX) return;
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    const w = DEFAULT_BOX_PCT, h = DEFAULT_BOX_PCT;
    const x = clamp(pt.x - w / 2, 0, 100 - w);
    const y = clamp(pt.y - h / 2, 0, 100 - h);
    const id = newHotspotId();
    onChange([...value, { id, kind: 'products', label: '', x, y, w, h }]);
    setSelectedId(id);
    setEditingId(id);
  };

  const updateHotspot = (id: string, patch: Partial<StallHotspot>) =>
    onChange(value.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const removeHotspot = (id: string) => {
    onChange(value.filter((h) => h.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  const editingHotspot = value.find((h) => h.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-100/60">
        Tap the image to mark a shelf, mug, or instrument. Drag its corner to resize, drag its middle to move.
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
              {/* 44px touch target (min-h/w-11) around a smaller visible
                  dot -- the handle itself only needs to look small. */}
              <div
                onPointerDown={(e) => startResize(e, h)}
                className="absolute -bottom-3.5 -right-3.5 flex h-11 w-11 cursor-nwse-resize items-center justify-center"
              >
                <div className="h-4 w-4 rounded-full border-2 border-black bg-amber-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Small sheet: opens right after a tap marks a new box (label +
          kind), reusable for re-opening an existing box the same way
          (tapping it without dragging). */}
      <Sheet open={!!editingHotspot} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto bg-[#140c06] border-amber-500/20 text-amber-50">
          {editingHotspot && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-amber-100">What's here?</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <Input
                  autoFocus
                  placeholder="Label (e.g. my books)"
                  value={editingHotspot.label}
                  onChange={(e) => updateHotspot(editingHotspot.id!, { label: e.target.value })}
                  maxLength={40}
                  className="h-11 bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
                />
                <div className="flex flex-wrap gap-1.5">
                  {TILE_KINDS.map((k) => (
                    <Button
                      key={k.id}
                      type="button"
                      size="sm"
                      variant={editingHotspot.kind === k.id ? 'default' : 'outline'}
                      aria-pressed={editingHotspot.kind === k.id}
                      onClick={() => updateHotspot(editingHotspot.id!, { kind: k.id })}
                      className={`min-h-[44px] ${
                        editingHotspot.kind === k.id
                          ? 'bg-amber-500 text-amber-950 border-amber-500 hover:bg-amber-400'
                          : 'border-amber-500/25 text-amber-100/70 hover:bg-amber-500/10'
                      }`}
                    >
                      {k.label}
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder="Caption on hover/tap (optional)"
                  value={editingHotspot.caption ?? ''}
                  onChange={(e) => updateHotspot(editingHotspot.id!, { caption: e.target.value || undefined })}
                  maxLength={80}
                  className="h-11 bg-black/30 border-amber-500/25 text-amber-50 placeholder:text-amber-100/30"
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[44px] gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => removeHotspot(editingHotspot.id!)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button
                    type="button"
                    className="min-h-[44px] bg-amber-500 text-amber-950 hover:bg-amber-400"
                    onClick={() => setEditingId(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <div className="space-y-2">
        {value.length === 0 && (
          <p className="rounded-lg border border-dashed border-amber-500/25 p-4 text-center text-xs text-amber-100/50">
            No shelves marked yet — tap the image above to add your first one.
          </p>
        )}
        {value.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => { setSelectedId(h.id ?? null); setEditingId(h.id ?? null); }}
            className={`flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border p-3 text-left ${selectedId === h.id ? 'border-amber-400/60 bg-amber-500/5' : 'border-amber-500/20 bg-black/30'}`}
          >
            <span className="truncate text-sm text-amber-50">{h.label || 'Untitled'}</span>
            <span className="shrink-0 text-xs uppercase tracking-wide text-amber-100/50">{h.kind}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
