import { useEffect, useState } from 'react';
import { X, Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useGiftBestowal } from '@/hooks/useGiftBestowal';
import { ConfirmBestowModal } from '@/components/payments/ConfirmBestowModal';
import type { PayoutProviderId } from '@/lib/payments/providerFees';
import type { TileKind } from '@/lib/stalls/stallTypes';
import { toast } from 'sonner';

interface Props {
  ownerId: string;
  ownerName: string;
  kind: TileKind;
  onClose: () => void;
}

interface Item {
  id: string;
  title: string;
  cover: string | null;
  price: number;
}

const KIND_LABEL: Partial<Record<TileKind, string>> = {
  books: 'Books',
  music: 'Music',
  lyrics: 'Lyrics',
  story: 'My Story',
};

/**
 * Bottom sheet opened by tapping a painted-interior hotspot (Farm-Stalls
 * batch 2b, task 3) -- slides up over the interior, doesn't navigate away
 * from it. Lists the STALL OWNER's own published items of that kind
 * (never the viewer's), each with an inline Bestow that opens the
 * existing ConfirmBestowModal at that item's own price.
 *
 * Data sources:
 *   - books/music: products rows, filtered the same way
 *     src/api/sowerContent.ts already classifies them (type IN
 *     ('book','ebook') / type = 'music') -- NOT products.category, which
 *     is free-text genre/description, not this classification. Sourced
 *     directly here (not useSowerContent) because this sheet needs
 *     `price` and `cover_image_url`, which that shared hook's queries
 *     don't select today.
 *   - lyrics: NO backing table exists anywhere in this app (confirmed
 *     during batch 2's shelf work too) -- always the empty state, never a
 *     fabricated query. Flagged back to the requester rather than guessed.
 *   - story: profiles.bio for the owner -- a single text card, no
 *     price/Bestow (a bio isn't a purchasable item).
 */
export default function StallHotspotSheet({ ownerId, ownerName, kind, onClose }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [bestowTarget, setBestowTarget] = useState<Item | null>(null);
  const { send: sendGift, loading: bestowing } = useGiftBestowal();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (kind === 'story') {
        const { data } = await supabase.from('profiles').select('bio').eq('user_id', ownerId).maybeSingle();
        if (alive) setBio((data as { bio?: string } | null)?.bio ?? null);
        return;
      }
      if (kind === 'lyrics') {
        if (alive) setItems([]);
        return;
      }

      const { data: sowerRow } = await supabase.from('sowers').select('id').eq('user_id', ownerId).maybeSingle();
      const sowerId = (sowerRow as { id?: string } | null)?.id;
      if (!sowerId) { if (alive) setItems([]); return; }

      const typeFilter = kind === 'books' ? ['book', 'ebook'] : ['music'];
      const { data } = await supabase
        .from('products')
        .select('id, title, cover_image_url, price')
        .eq('sower_id', sowerId)
        .in('type', typeFilter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!alive) return;
      setItems(((data ?? []) as { id: string; title: string; cover_image_url: string | null; price: number | null }[])
        .map((p) => ({ id: p.id, title: p.title, cover: p.cover_image_url, price: Number(p.price || 0) })));
    })();
    return () => { alive = false; };
  }, [kind, ownerId]);

  const handleBestowConfirm = async (provider: PayoutProviderId) => {
    if (!bestowTarget) return;
    const result = await sendGift({
      recipientId: ownerId,
      amount: bestowTarget.price > 0 ? bestowTarget.price : 5,
      contextKind: 'chat_tip',
      contextId: bestowTarget.id,
      provider,
      message: `Bestowal for "${bestowTarget.title}"`,
    });
    if (result.success) {
      toast.success(`${ownerName} will receive your bestowal!`);
      setBestowTarget(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[10000] bg-black/50" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[10001] max-h-[75vh] flex flex-col rounded-t-2xl bg-background shadow-2xl">
        <div className="shrink-0 flex flex-col items-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 pb-2">
          <h2 className="font-bold text-lg">{KIND_LABEL[kind] ?? kind}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {kind === 'story' ? (
            bio === null ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed text-sm py-2">
                {bio || `${ownerName} hasn't written their story yet.`}
              </p>
            )
          ) : items === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {kind === 'lyrics' ? 'Nothing here yet.' : 'Nothing on this shelf yet.'}
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  {item.cover ? (
                    <img src={item.cover} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => setBestowTarget(item)} className="shrink-0 gap-1.5">
                    <Heart className="h-3.5 w-3.5" /> Bestow
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmBestowModal
        isOpen={!!bestowTarget}
        onClose={() => setBestowTarget(null)}
        title={bestowTarget?.title ?? ''}
        amount={bestowTarget && bestowTarget.price > 0 ? bestowTarget.price : 5}
        onConfirm={handleBestowConfirm}
        confirming={bestowing}
        actionLabel="Bestow"
        enablePaystack
      />
    </>
  );
}
