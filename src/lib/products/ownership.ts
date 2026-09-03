import { supabase } from '@/integrations/supabase/client';

/**
 * Digital seeds (anything not delivery_type='physical') can only be
 * completed-purchased once per buyer — a repeat physical order is a
 * legitimate second copy, a repeat digital one is not.
 */
export function isDigitalSeed(product: { delivery_type?: string | null } | null | undefined): boolean {
  return !!product && product.delivery_type !== 'physical';
}

/** Whether `userId` already has a completed product_bestowals purchase of `productId`. */
export async function hasCompletedPurchase(userId: string, productId: string): Promise<boolean> {
  const { data } = await supabase
    .from('product_bestowals')
    .select('id')
    .eq('bestower_id', userId)
    .eq('product_id', productId)
    .eq('status', 'completed')
    .maybeSingle();
  return !!data;
}

/** Batch version — returns the subset of productIds the user already completed-purchased. */
export async function fetchOwnedProductIds(userId: string, productIds: string[]): Promise<Set<string>> {
  if (!userId || productIds.length === 0) return new Set();
  const { data } = await supabase
    .from('product_bestowals')
    .select('product_id')
    .eq('bestower_id', userId)
    .eq('status', 'completed')
    .in('product_id', productIds);
  return new Set((data || []).map((r: any) => r.product_id));
}
