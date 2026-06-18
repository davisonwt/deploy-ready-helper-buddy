import { supabase } from '@/integrations/supabase/client';

/**
 * Products data-access layer (foundation).
 *
 * Pure functions — no React, no local state. Throw on error.
 *
 * Scope of this module is intentionally narrow: it covers the call sites
 * migrated in slice B2 only. Bespoke listing queries (paginated marketplace,
 * tribal feed, dashboard feed, factory pages, etc.) get their own dedicated
 * helpers in slice B3 to preserve exact field projections.
 */

/** Standard public columns selected from the joined `sowers` row. */
export const SOWER_PUBLIC_COLS = 'user_id, display_name, logo_url, is_verified';

export interface ProductsBySowerOptions {
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Fetch all products for a sower with the standard `sowers` public join.
 * Used by: MyProductsPage.
 */
export const fetchProductsBySower = async (
  sowerId: string,
  opts: ProductsBySowerOptions = {}
) => {
  const { orderBy = { column: 'created_at', ascending: false } } = opts;
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      sowers (
        ${SOWER_PUBLIC_COLS}
      )
    `)
    .eq('sower_id', sowerId)
    .order(orderBy.column, { ascending: orderBy.ascending ?? false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch a single product joined with `sowers!inner(user_id)` for ownership check.
 * Used by: EditForm.
 */
export const fetchProductForEdit = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      sowers!inner(user_id)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetch only a product's title. Returns null when missing.
 * Used by: SowerAnalyticsTooltip.
 */
export const fetchProductTitle = async (id: string): Promise<string | null> => {
  const { data } = await supabase
    .from('products')
    .select('title')
    .eq('id', id)
    .maybeSingle();
  return (data as any)?.title ?? null;
};

/**
 * Insert a product row; returns `{ id }`.
 * Used by: UploadForm, BulkUploadWizardPage.
 */
export const insertProduct = async (
  payload: Record<string, any>
): Promise<{ id: string }> => {
  const { data, error } = await supabase
    .from('products')
    .insert(payload as any)
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string };
};

/**
 * Patch a product by id. Throws on error.
 * Used by: EditForm.
 */
export const updateProduct = async (
  id: string,
  patch: Record<string, any>
): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .update(patch as any)
    .eq('id', id);

  if (error) throw error;
};

/**
 * Delete a product by id. Throws on error.
 * Used by: ProductCard.
 */
export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
