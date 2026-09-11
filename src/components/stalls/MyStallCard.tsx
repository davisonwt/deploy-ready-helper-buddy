import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useStallTemplates } from '@/hooks/useStallTemplates';
import { STALL_TIER_LABEL, resolveStallHotspots, type StallHotspot, type StallTier } from '@/lib/stalls/stallTypes';
import StallInteriorView from './StallInteriorView';

interface StallRow {
  name: string;
  tier: StallTier;
  front_image_path: string | null;
  interior_image_path: string | null;
  hotspots: StallHotspot[] | null;
  published: boolean;
}

/**
 * Cockpit middle-column stall card (Farm-Stalls batch 1, item 4): the
 * member's own shop-front, tap to walk in; or a "Build your stall" CTA if
 * they haven't made one yet. No public visitor view here -- this is the
 * owner looking at their own stall.
 */
export default function MyStallCard() {
  const { user } = useAuth();
  const templates = useStallTemplates();
  const [stall, setStall] = useState<StallRow | null | undefined>(undefined); // undefined = loading
  // Re-opens the interior automatically if we're arriving back from an
  // item-detail page's Back button (StallInteriorView hash-syncs
  // #stall-kind=<kind> onto this same URL while a sheet is open).
  const [open, setOpen] = useState(() => window.location.hash.startsWith('#stall-kind='));

  useEffect(() => {
    if (!user) { setStall(null); return; }
    let alive = true;
    supabase
      .from('stalls')
      .select('name, tier, front_image_path, interior_image_path, hotspots, published')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setStall((data as StallRow | null) ?? null); });
    return () => { alive = false; };
  }, [user]);

  if (stall === undefined) return null;

  if (!stall || !stall.published || !stall.front_image_path) {
    return (
      <Link to="/stall/build">
        <Card className="border-dashed border-2 hover:border-primary/60 transition-colors cursor-pointer">
          <CardContent className="flex items-center gap-3 py-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold">Build your stall</p>
              <p className="text-sm text-muted-foreground">A shop-front for your seeds, sower, or whisperer work.</p>
            </div>
            <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <Card className="overflow-hidden hover:opacity-95 transition-opacity">
          <div className="relative w-full aspect-square">
            {/* Blurred cover copy fills the square behind the real image --
                the real image itself is object-contain so it's never
                cropped, whatever its own aspect ratio. */}
            <img src={stall.front_image_path} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70" />
            <div className="absolute inset-0 bg-black/20" />
            <img src={stall.front_image_path} alt={stall.name} className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 p-3 flex items-center gap-2">
              <h3 className="text-white font-bold drop-shadow">{stall.name}</h3>
              <span className="text-[11px] font-medium text-white/90 bg-black/40 rounded-full px-2 py-0.5 shrink-0">
                {STALL_TIER_LABEL[stall.tier]}
              </span>
            </div>
          </div>
        </Card>
      </button>

      {open && stall.interior_image_path && user && (
        <StallInteriorView
          ownerId={user.id}
          interiorImageUrl={stall.interior_image_path}
          stallName={stall.name}
          hotspots={resolveStallHotspots(stall.interior_image_path, stall.hotspots, templates)}
          isOwner
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
