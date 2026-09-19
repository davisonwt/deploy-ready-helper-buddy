import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Sprout, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SignedImg from '@/components/media/SignedImg';
import type { MessageSegment } from '@/lib/chat/parseMessageLinks';

interface CardData {
  title: string;
  image: string | null;
  kind: 'seed' | 'stall';
}

/**
 * A pasted sow2growapp.com stall (or seed-within-a-stall) link, rendered
 * the same shape SeedReferenceMessage.tsx already uses for a deliberately
 * shared seed -- image, a small caps label, the name, the whole thing
 * tappable. Resolved live at render time (this is a plain pasted URL, not
 * something composed through the share flow, so there is no
 * pre-attached system_metadata to read) -- one lightweight query, never a
 * fetch of the link's own page or any external site.
 */
export default function StallLinkCard({ segment }: { segment: Extract<MessageSegment, { type: 'stall-link' }> }) {
  const navigate = useNavigate();
  const [data, setData] = useState<CardData | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (segment.seedId) {
        const { data: product } = await supabase
          .from('products')
          .select('title, cover_image_url')
          .eq('id', segment.seedId)
          .maybeSingle();
        if (product) {
          if (alive) setData({ title: product.title, image: product.cover_image_url, kind: 'seed' });
          return;
        }
      }
      const { data: profile } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, username')
        .eq('username', segment.username)
        .maybeSingle();
      if (!profile) {
        if (alive) setData(null);
        return;
      }
      const { data: stall } = await supabase
        .from('stalls')
        .select('name, front_image_path')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      const name = stall?.name?.trim() || profile.display_name?.trim() || profile.first_name?.trim() || profile.username?.trim() || 'This stall';
      if (alive) setData({ title: name, image: stall?.front_image_path ?? null, kind: 'stall' });
    })();
    return () => { alive = false; };
  }, [segment.seedId, segment.username]);

  if (data === null) {
    // Couldn't resolve (stall gone, bad username) -- fall back to a plain
    // link rather than showing a broken card.
    return (
      <a href={segment.href} target="_blank" rel="noopener noreferrer" className="underline break-all">
        {segment.href}
      </a>
    );
  }

  return (
    <Card
      className="mt-1 max-w-xs cursor-pointer overflow-hidden border-amber-500/20 bg-[#180f08]"
      onClick={() => navigate(segment.internalPath)}
    >
      <div className="flex items-center gap-3 p-2.5 hover:bg-amber-500/5 transition-colors">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-amber-950/40">
          {data?.image ? (
            <SignedImg src={data.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-amber-500/50">
              {data?.kind === 'seed' ? <Sprout className="h-5 w-5" /> : <Store className="h-5 w-5" />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500/70">
            {data === undefined ? 'Loading…' : data.kind === 'seed' ? 'About this seed' : 'Visit this stall'}
          </p>
          <p className="truncate text-sm font-medium text-amber-50">{data?.title ?? segment.username}</p>
        </div>
      </div>
    </Card>
  );
}
