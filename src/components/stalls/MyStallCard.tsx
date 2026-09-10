import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { STALL_TIER_LABEL, type StallTier, type StallTile } from '@/lib/stalls/stallTypes';
import StallInteriorView from './StallInteriorView';

interface StallRow {
  name: string;
  tier: StallTier;
  front_image_path: string | null;
  interior_image_path: string | null;
  tiles: StallTile[];
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
  const [stall, setStall] = useState<StallRow | null | undefined>(undefined); // undefined = loading
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setStall(null); return; }
    let alive = true;
    supabase
      .from('stalls')
      .select('name, tier, front_image_path, interior_image_path, tiles, published')
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
          <div className="relative aspect-[16/9] sm:aspect-[21/9]">
            <img src={stall.front_image_path} alt={stall.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between">
              <h3 className="text-white font-bold drop-shadow">{stall.name}</h3>
              <span className="text-[11px] font-medium text-white/90 bg-black/40 rounded-full px-2 py-0.5">
                {STALL_TIER_LABEL[stall.tier]}
              </span>
            </div>
          </div>
        </Card>
      </button>

      {open && stall.interior_image_path && (
        <StallInteriorView
          interiorImageUrl={stall.interior_image_path}
          stallName={stall.name}
          tiles={stall.tiles ?? []}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
