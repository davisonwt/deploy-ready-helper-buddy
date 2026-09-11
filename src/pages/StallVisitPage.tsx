import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Store, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useStallTemplates } from '@/hooks/useStallTemplates';
import StallInteriorView from '@/components/stalls/StallInteriorView';
import { STALL_TIER_LABEL, resolveStallHotspots, type StallHotspot, type StallTier } from '@/lib/stalls/stallTypes';

interface StallRow {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  tier: StallTier;
  front_image_path: string | null;
  interior_image_path: string | null;
  hotspots: StallHotspot[] | null;
  published: boolean;
}

/**
 * Public visitor route: front -> interior -> hotspot sheets, same
 * StallInteriorView the Cockpit owner view uses. Owner view is identical
 * to the visitor view except an "Edit stall" pill top-right (Farm-Stalls
 * batch 2b, task 4) -- Bestow now happens per-item inside
 * StallHotspotSheet, not as a stall-level button here.
 *
 * RLS (stalls_owner_all / stalls_read_published) already restricts a
 * non-owner to a published row only -- the query here doesn't filter on
 * published itself, so the owner can preview a draft.
 */
export default function StallVisitPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const templates = useStallTemplates();

  const [stall, setStall] = useState<StallRow | null | undefined>(undefined); // undefined = loading
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!username) { setStall(null); return; }
    let alive = true;
    (async () => {
      // Narrow anon-callable RPC -- public_profiles itself is granted to
      // `authenticated` only, and this route must work for a signed-out
      // visitor. Resolves to null for no user, no stall, or an
      // unpublished one, all treated identically below.
      const { data: ownerId } = await supabase.rpc('get_stall_owner_id_by_username' as any, { _username: username });
      if (!ownerId) { if (alive) setStall(null); return; }

      const { data } = await supabase
        .from('stalls')
        .select('id, user_id, name, tagline, tier, front_image_path, interior_image_path, hotspots, published')
        .eq('user_id', ownerId)
        .maybeSingle();
      if (alive) setStall((data as StallRow | null) ?? null);
    })();
    return () => { alive = false; };
  }, [username]);

  const isOwner = !!user && !!stall && user.id === stall.user_id;

  if (stall === undefined) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!stall || (!stall.published && !isOwner)) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <UserX className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This stall isn't open yet.</p>
        <Link to="/" className="text-sm underline text-muted-foreground">Back to Sow2Grow</Link>
      </div>
    );
  }

  if (!stall.front_image_path || !stall.interior_image_path) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Store className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This stall is still being built.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {!stall.published && isOwner && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          Preview only -- this stall isn't published yet.
        </div>
      )}

      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <Card className="overflow-hidden hover:opacity-95 transition-opacity">
          <div className="relative aspect-[16/9] sm:aspect-[21/9]">
            <img src={stall.front_image_path} alt={stall.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
              <div>
                <h1 className="text-white font-bold text-xl drop-shadow">{stall.name}</h1>
                {stall.tagline && <p className="text-white/80 text-sm drop-shadow">{stall.tagline}</p>}
              </div>
              <span className="text-[11px] font-medium text-white/90 bg-black/40 rounded-full px-2 py-0.5 shrink-0">
                {STALL_TIER_LABEL[stall.tier]}
              </span>
            </div>
          </div>
          <CardContent className="py-3 text-sm text-muted-foreground">Tap to step inside</CardContent>
        </Card>
      </button>

      {open && (
        <StallInteriorView
          ownerId={stall.user_id}
          interiorImageUrl={stall.interior_image_path}
          stallName={stall.name}
          hotspots={resolveStallHotspots(stall.interior_image_path, stall.hotspots, templates)}
          isOwner={isOwner}
          onEdit={() => navigate('/stall/build')}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
