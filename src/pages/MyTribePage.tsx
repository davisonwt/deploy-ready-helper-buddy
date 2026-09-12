import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useContainImageRect } from '@/hooks/useContainImageRect';
import { TRIBE_FRONT_URL, TRIBE_INTERIOR_URL, TRIBE_BOARD, TRIBE_HOTSPOTS, type TribeHotspotId } from '@/lib/tribe/tribeLayout';
import TribeInviteSheetContent from '@/components/tribe/TribeInviteSheetContent';
import TribeFollowingSheetContent from '@/components/tribe/TribeFollowingSheetContent';

const SHEET_TITLE: Record<Exclude<TribeHotspotId, 'village'>, string> = {
  invite: 'Invite',
  following: 'Following',
  rewards: 'Rewards',
};

/**
 * Same slide-up/backdrop/mount-unmount pattern StallHotspotSheet.tsx and
 * StallInteriorView.tsx's own StallDrawer already use -- not reused
 * directly (both are tightly coupled to stall/product data), a lean
 * version of the same chrome instead.
 */
function TribeSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  return (
    <>
      <div
        className={`fixed inset-0 z-[10000] bg-black/60 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[10001] h-[85vh] flex flex-col rounded-t-2xl
          bg-[#180f08]/95 backdrop-blur-md border-t border-x border-amber-500/25 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
          transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-amber-100/25" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-5 pb-3 border-b border-amber-500/15">
          <h2 className="font-serif text-xl text-amber-200 tracking-wide">{title}</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-amber-100/60 hover:text-amber-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * Auto-fits `${name}'s` to the board's own rendered pixel width -- shrinks
 * (never grows past 1) via a CSS transform once the natural text width is
 * measured, same "measure then scale" technique as everywhere else in
 * this app that fits text to a fixed space.
 */
function BoardName({ name, boardPxWidth }: { name: string; boardPxWidth: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || !boardPxWidth) return;
    const natural = el.scrollWidth;
    setScale(natural > boardPxWidth ? boardPxWidth / natural : 1);
  }, [name, boardPxWidth]);
  return (
    <span
      ref={ref}
      className="inline-block whitespace-nowrap font-serif"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center', color: '#2b1a0d', textShadow: '0 1px 0 rgba(255,214,170,0.4)' }}
    >
      {name}&rsquo;s
    </span>
  );
}

/**
 * My Tribe, phase 1: a walk-through place instead of a plain page --
 * front (village gate, the viewer's own name carved into the blank
 * board) tap -> interior (village square), same pannable-on-portrait /
 * object-contain-on-desktop mechanics as StallInteriorView, with 4
 * hotspots on the painted plaques. Not a stall (no owner, no
 * StallHotspotSheet item-kind fetching) -- "My village"/"Invite"/
 * "Following"/"Rewards" are bespoke actions, not seed browsing.
 */
export default function MyTribePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [openSheet, setOpenSheet] = useState<Exclude<TribeHotspotId, 'village'> | null>(null);
  const [viewerName, setViewerName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, first_name, username')
        .eq('user_id', user.id)
        .maybeSingle();
      const p = data as { display_name?: string | null; first_name?: string | null; username?: string | null } | null;
      const name = p?.display_name?.trim() || p?.first_name?.trim() || p?.username?.trim() || user.email?.split('@')[0] || 'Friend';
      if (alive) setViewerName(name);
    })();
    return () => { alive = false; };
  }, [user]);

  // Front image
  const frontContainerRef = useRef<HTMLDivElement>(null);
  const frontImgRef = useRef<HTMLImageElement>(null);
  const frontRect = useContainImageRect(frontContainerRef, frontImgRef);
  // Interior image (desktop/landscape -- object-contain)
  const interiorContainerRef = useRef<HTMLDivElement>(null);
  const interiorImgRef = useRef<HTMLImageElement>(null);
  const interiorRect = useContainImageRect(interiorContainerRef, interiorImgRef);
  // Interior image (mobile portrait -- pannable, no letterboxing)
  const mobileInteriorImgRef = useRef<HTMLImageElement>(null);
  const mobileInteriorWrapRef = useRef<HTMLDivElement>(null);
  const panScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = panScrollRef.current;
    const img = mobileInteriorImgRef.current;
    if (!scrollEl || !entered) return;
    const center = () => {
      scrollEl.scrollLeft = (scrollEl.scrollWidth - scrollEl.clientWidth) / 2;
    };
    if (img && !img.complete) {
      img.addEventListener('load', center, { once: true });
      return () => img.removeEventListener('load', center);
    }
    center();
  }, [entered]);

  function handleHotspotTap(id: TribeHotspotId) {
    if (id === 'village') {
      navigate('/stalls-feed?tribe=mine');
      return;
    }
    setOpenSheet(id);
  }

  const backLink = (
    <button
      type="button"
      onClick={() => navigate('/cockpit')}
      className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Cockpit
    </button>
  );

  if (!entered) {
    const boardPxWidth = frontRect ? (TRIBE_BOARD.w / 100) * frontRect.width : 0;
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        {backLink}
        <button
          type="button"
          onClick={() => setEntered(true)}
          aria-label="Enter My Tribe"
          className="absolute inset-0 w-full h-full"
        >
          <div ref={frontContainerRef} className="relative w-full h-full">
            <img ref={frontImgRef} src={TRIBE_FRONT_URL} alt="My Tribe" className="absolute inset-0 w-full h-full object-contain" />
            {frontRect && viewerName && (
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: frontRect.offsetX + (TRIBE_BOARD.x / 100) * frontRect.width,
                  top: frontRect.offsetY + (TRIBE_BOARD.y / 100) * frontRect.height,
                  width: (TRIBE_BOARD.w / 100) * frontRect.width,
                  height: (TRIBE_BOARD.h / 100) * frontRect.height,
                }}
              >
                <BoardName name={viewerName} boardPxWidth={boardPxWidth} />
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* Mobile portrait: pannable, same technique as StallInteriorView. */}
      <div className="hidden max-lg:portrait:block relative w-full h-full">
        <div
          ref={panScrollRef}
          className="relative w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div ref={mobileInteriorWrapRef} className="relative h-full w-max mx-auto snap-center">
            <img ref={mobileInteriorImgRef} src={TRIBE_INTERIOR_URL} alt="My Tribe village" className="block h-full w-auto max-w-none" />
            {TRIBE_HOTSPOTS.map((h) => (
              <button
                key={h.id}
                type="button"
                aria-label={h.label}
                onClick={() => handleHotspotTap(h.id)}
                className="absolute outline-none"
                style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%`, minWidth: 44, minHeight: 44 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Landscape/desktop: object-contain. */}
      <div ref={interiorContainerRef} className="relative w-full h-full max-lg:portrait:hidden">
        <img ref={interiorImgRef} src={TRIBE_INTERIOR_URL} alt="My Tribe village" className="absolute inset-0 w-full h-full object-contain" />
        {interiorRect && TRIBE_HOTSPOTS.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-label={h.label}
            onClick={() => handleHotspotTap(h.id)}
            className="absolute outline-none"
            style={{
              left: interiorRect.offsetX + (h.x / 100) * interiorRect.width,
              top: interiorRect.offsetY + (h.y / 100) * interiorRect.height,
              width: (h.w / 100) * interiorRect.width,
              height: (h.h / 100) * interiorRect.height,
            }}
          />
        ))}
      </div>

      {backLink}
      <button
        type="button"
        onClick={() => setEntered(false)}
        className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
        aria-label="Back to gate"
      >
        <X className="h-5 w-5" />
      </button>

      {openSheet && (
        <TribeSheet title={SHEET_TITLE[openSheet]} onClose={() => setOpenSheet(null)}>
          {openSheet === 'invite' && <TribeInviteSheetContent />}
          {openSheet === 'following' && <TribeFollowingSheetContent />}
          {openSheet === 'rewards' && (
            <p className="text-amber-100/50 font-serif italic text-center py-12">Rewards coming soon</p>
          )}
        </TribeSheet>
      )}
    </div>
  );
}
