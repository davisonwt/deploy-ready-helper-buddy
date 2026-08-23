// Sower brands: a profile can hold multiple businesses / projects / brands.
// A brand is NOT the profile picture — it is the company or project identity
// shown as a small icon on every seed placeholder belonging to that brand.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SowerBrand {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  is_default: boolean;
  created_at: string;
}

/** card.id looks like "seed-<uuid>" / "music-<uuid>" — that whole string is the item key. */
export function itemKey(cardId: string): { item_type: string; item_id: string } {
  const idx = cardId.indexOf('-');
  if (idx === -1) return { item_type: 'seed', item_id: cardId };
  return { item_type: cardId.slice(0, idx), item_id: cardId.slice(idx + 1) };
}

export function useMyBrands(userId?: string | null) {
  const [brands, setBrands] = useState<SowerBrand[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) { setBrands([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('sower_brands')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) console.error('load brands failed', error);
    setBrands((data as SowerBrand[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { brands, loading, refetch };
}

/** Map of card.id -> brand_id for everything this sower owns. */
export function useMyBrandAssignments(userId?: string | null) {
  const [map, setMap] = useState<Record<string, string>>({});

  const refetch = useCallback(async () => {
    if (!userId) { setMap({}); return; }
    const { data, error } = await supabase
      .from('item_brand_assignments')
      .select('item_type,item_id,brand_id')
      .eq('user_id', userId);
    if (error) { console.error('load brand assignments failed', error); return; }
    const next: Record<string, string> = {};
    (data || []).forEach((r: any) => { next[`${r.item_type}-${r.item_id}`] = r.brand_id; });
    setMap(next);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { brandByItem: map, refetch };
}

export async function assignBrandToItem(userId: string, cardId: string, brandId: string | null) {
  const { item_type, item_id } = itemKey(cardId);
  if (!brandId) {
    const { error } = await supabase
      .from('item_brand_assignments')
      .delete()
      .eq('item_type', item_type)
      .eq('item_id', item_id)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('item_brand_assignments')
    .upsert(
      { user_id: userId, brand_id: brandId, item_type, item_id },
      { onConflict: 'item_type,item_id' },
    );
  if (error) throw error;
}

export async function uploadBrandLogo(userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('brand-logos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('brand-logos').getPublicUrl(path);
  return data.publicUrl; // re-signed at render time by useSignedImage
}
