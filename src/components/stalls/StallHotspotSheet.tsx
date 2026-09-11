import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
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
  isOwner?: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  title: string;
  blurb: string;
  cover: string | null;
  price: number;
}

const KIND_LABEL: Partial<Record<TileKind, string>> = {
  books: 'Books',
  music: 'Music',
  lyrics: 'Lyrics',
  story: 'My Story',
  mugs: 'Mugs',
};

const EMPTY_TEXT: Partial<Record<TileKind, string>> = {
  books: 'No books on the shelf yet',
  music: 'No music playing yet',
  lyrics: 'No lyrics written yet',
  story: 'Story still being written',
  mugs: 'No mugs on the table yet',
};

/** Where "Add one" sends the owner, per kind -- the only real create flow each maps to. */
const ADD_ONE_PATH: Partial<Record<TileKind, string>> = {
  books: '/sow/book',
  music: '/sow/music',
  lyrics: '/sow/book', // lyrics are a category on the same book form (products.category = 'lyrics') -- no dedicated lyrics form exists
  mugs: '/sow/product', // mugs are a category on the general Shop product form (products.type = 'product', category = 'mugs')
};

/**
 * Bottom sheet opened by tapping a painted-interior hotspot -- styled to
 * feel like still being inside the stall (dark wood-tone panel, gold
 * hairline + serif title, cover-first cards), not a default app dialog.
 * Slides up/down in 200ms, ~70% viewport height, drag handle. Lists the
 * STALL OWNER's own published items of that kind (never the viewer's).
 *
 * Data sources (batch 2c correctness fixes over batch 2b's version):
 *   - books: products (type IN ('book','ebook'), category <> 'lyrics')
 *     UNION sower_books -- resolved via BOTH sowers.id and company_id
 *     (a stall owner can have either or both; MyProductsPage.tsx's own
 *     OR-across-both-links pattern, which batch 2b's version missed).
 *   - lyrics: products (type IN ('book','ebook'), category = 'lyrics') --
 *     lyrics are a category on the same book product type, not a
 *     separate products.type (that column has a CHECK constraint; adding
 *     a new type would need a migration, category needs none).
 *   - music: products (type = 'music') UNION dj_music_tracks (via
 *     radio_djs), deduped by normalized title -- a products row always
 *     wins a title that exists in both (see scripts/studio/
 *     music-duplicates.sql for the read-only audit this was checked
 *     against: 4 of one owner's 32 music products shared a title with
 *     one of their 25 dj_music_tracks rows).
 *   - story: profiles.bio for the owner -- no price/Bestow (not a
 *     purchasable item).
 *   - mugs: products (type = 'product', category = 'mugs'). `type` has a
 *     CHECK constraint with no 'merch' value (confirmed live against
 *     products_type_check) so, like lyrics, this is a category filter on
 *     an existing type rather than a new type needing a migration. Strict
 *     category = 'mugs' -- an owner's existing product under a different
 *     category (e.g. 'kitchenware') won't show here until recategorized
 *     via the Mugs quick-pick on /sow/product (see the Farm-Stalls batch
 *     2d audit for a real example of this).
 */
export default function StallHotspotSheet({ ownerId, ownerName, kind, isOwner, onClose }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[] | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [bestowTarget, setBestowTarget] = useState<Item | null>(null);
  const [visible, setVisible] = useState(false);
  const { send: sendGift, loading: bestowing } = useGiftBestowal();

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (kind === 'story') {
        const { data } = await supabase.from('profiles').select('bio').eq('user_id', ownerId).maybeSingle();
        if (alive) setBio((data as { bio?: string } | null)?.bio ?? null);
        return;
      }

      const [{ data: sowerRow }, { data: companyRow }] = await Promise.all([
        supabase.from('sowers').select('id').eq('user_id', ownerId).maybeSingle(),
        supabase.from('companies').select('id').eq('owner_user_id', ownerId).maybeSingle(),
      ]);
      const sowerId = (sowerRow as { id?: string } | null)?.id;
      const companyId = (companyRow as { id?: string } | null)?.id;

      // Deduped by normalized title (lowercased, whitespace collapsed) --
      // a products row always wins a tie, so it's inserted into the map
      // first and every later source just skips a title already present.
      // See scripts/studio/music-duplicates.sql for the read-only audit
      // this dedupe rule was verified against.
      const byNormTitle = new Map<string, Item>();
      const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

      if (sowerId || companyId) {
        const typeFilter = kind === 'music' ? ['music'] : kind === 'mugs' ? ['product'] : ['book', 'ebook'];
        let q = supabase.from('products').select('id, title, description, cover_image_url, price, category').in('type', typeFilter);
        const orParts: string[] = [];
        if (sowerId) orParts.push(`sower_id.eq.${sowerId}`);
        if (companyId) orParts.push(`company_id.eq.${companyId}`);
        q = q.or(orParts.join(','));
        const { data } = await q.order('created_at', { ascending: false }).limit(100);
        for (const p of (data ?? []) as { id: string; title: string; description: string | null; cover_image_url: string | null; price: number | null; category: string | null }[]) {
          const isLyrics = (p.category ?? '').toLowerCase() === 'lyrics';
          const isMugs = (p.category ?? '').toLowerCase() === 'mugs';
          if (kind === 'lyrics' && !isLyrics) continue;
          if (kind === 'books' && isLyrics) continue;
          if (kind === 'mugs' && !isMugs) continue;
          byNormTitle.set(normalize(p.title), {
            id: p.id,
            title: p.title,
            blurb: (p.description ?? '').slice(0, 90),
            cover: p.cover_image_url,
            price: Number(p.price || 0),
          });
        }
      }

      // sower_books -- a separate, older books table (keyed directly by
      // user_id, no sower_id indirection) that src/api/sowerContent.ts
      // already unions into "books" elsewhere in the app.
      if (kind === 'books') {
        const { data } = await supabase
          .from('sower_books')
          .select('id, title, description, cover_image_url, bestowal_value')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(100);
        for (const b of (data ?? []) as { id: string; title: string; description: string | null; cover_image_url: string | null; bestowal_value: number | null }[]) {
          const key = normalize(b.title);
          if (byNormTitle.has(key)) continue; // a products row already claimed this title
          byNormTitle.set(key, {
            id: b.id,
            title: b.title,
            blurb: (b.description ?? '').slice(0, 90),
            cover: b.cover_image_url,
            price: Number(b.bestowal_value || 0),
          });
        }
      }

      // dj_music_tracks -- radio uploads, not itself a `products` row.
      // Real overlap exists here for at least one owner (4 of 32 products
      // vs 25 dj tracks shared a title as of this check) -- a products row
      // always wins the same title; only a dj-only track gets added.
      if (kind === 'music') {
        const { data: djRow } = await supabase.from('radio_djs').select('id').eq('user_id', ownerId).maybeSingle();
        const djId = (djRow as { id?: string } | null)?.id;
        if (djId) {
          const { data } = await supabase
            .from('dj_music_tracks')
            .select('id, track_title, cover_image_url')
            .eq('dj_id', djId)
            .order('created_at', { ascending: false })
            .limit(200);
          for (const t of (data ?? []) as { id: string; track_title: string; cover_image_url: string | null }[]) {
            const key = normalize(t.track_title);
            if (byNormTitle.has(key)) continue; // a products row already claimed this title
            byNormTitle.set(key, { id: t.id, title: t.track_title, blurb: '', cover: t.cover_image_url, price: 0 });
          }
        }
      }

      if (alive) setItems([...byNormTitle.values()]);
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

  // Item detail: no dedicated per-book/per-track page with its own Bestow
  // exists app-wide yet (Bestow already lives on this card) -- this opens
  // the closest real destination the rest of the app already uses for
  // this content kind (seedCardBuilders.js's own openPath convention).
  // The interior's own open/kind state is hash-synced (StallInteriorView)
  // so browser Back lands here again with this same sheet open.
  const openItemDetail = (item: Item) => {
    navigate(kind === 'music' ? '/music-library' : '/my-s2g-library', { state: { fromStallItem: item.id } });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[10000] bg-black/60 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[10001] h-[70vh] flex flex-col rounded-t-2xl
          bg-[#180f08]/95 backdrop-blur-md border-t border-x border-amber-500/25 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]
          transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-amber-100/25" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-5 pb-3 border-b border-amber-500/15">
          <h2 className="font-serif text-xl text-amber-200 tracking-wide">{KIND_LABEL[kind] ?? kind}</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-amber-100/60 hover:text-amber-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {kind === 'story' ? (
            bio === null ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
            ) : bio ? (
              <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-amber-50/90 py-4 font-serif">{bio}</p>
            ) : (
              <EmptyState text={EMPTY_TEXT.story!} isOwner={isOwner} addOnePath="/profile" addOneLabel="Write your story" />
            )
          ) : items === null ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-amber-100/40" /></div>
          ) : items.length === 0 ? (
            <EmptyState text={EMPTY_TEXT[kind] ?? 'Nothing here yet'} isOwner={isOwner} addOnePath={ADD_ONE_PATH[kind]} addOneLabel="Add one" />
          ) : (
            <div className="space-y-3 py-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl border border-amber-500/15 bg-black/25 p-2.5">
                  <button type="button" onClick={() => openItemDetail(item)} className="shrink-0">
                    {item.cover ? (
                      <img src={item.cover} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-amber-950/60 border border-amber-500/10" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <button type="button" onClick={() => openItemDetail(item)} className="text-left">
                      <p className="font-serif text-base text-amber-50 truncate">{item.title}</p>
                      {item.blurb && <p className="text-xs text-amber-100/50 truncate mt-0.5">{item.blurb}</p>}
                    </button>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-amber-300/90">${item.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setBestowTarget(item)}
                        className="rounded-full bg-gradient-to-b from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-amber-950 shadow hover:from-amber-300 hover:to-amber-500 transition-colors"
                      >
                        Bestow
                      </button>
                    </div>
                  </div>
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

function EmptyState({ text, isOwner, addOnePath, addOneLabel }: { text: string; isOwner?: boolean; addOnePath?: string; addOneLabel: string }) {
  const navigate = useNavigate();
  return (
    <div className="py-12 text-center">
      <p className="text-amber-100/50 font-serif italic">{text}</p>
      {isOwner && addOnePath && (
        <button
          type="button"
          onClick={() => navigate(addOnePath)}
          className="mt-2 text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          {addOneLabel}
        </button>
      )}
    </div>
  );
}
