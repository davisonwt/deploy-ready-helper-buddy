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

// ============================================================================
// B3 helpers — bespoke listing queries.
//
// Each helper preserves the EXACT field projection, filters, ordering, and
// limits of the original inline supabase call. They return the raw
// `{ data, error }` shape so call sites can keep their existing destructure
// and error-handling logic untouched. No normalization, no shared cache.
// ============================================================================

/** Sower bulk page: count of non-archived products. */
export const countActiveProductsForSower = (sowerId: string) =>
  supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('sower_id', sowerId)
    .neq('status', 'archived');

/** Sower bulk page: all product ids for a sower (used to scope a bestowal count). */
export const fetchProductIdsForSower = (sowerId: string) =>
  supabase.from('products').select('id').eq('sower_id', sowerId);

/** Directory page: product sower_ids in a batch (used to count products per sower). */
export const fetchProductSowerIdsBatch = (sowerIds: string[]) =>
  supabase
    .from('products')
    .select('sower_id')
    .in('sower_id', sowerIds)
    .neq('status', 'archived');

export interface PaginatedSowerProductsOpts {
  from: number;
  to: number;
  orderBy?: { column: string; ascending?: boolean; nullsFirst?: boolean };
  excludeId?: string;
}

/** Sower bulk page / seed feed: paginated products with the sowers join. */
export const fetchProductsBySowerPaginated = (
  sowerId: string,
  opts: PaginatedSowerProductsOpts
) => {
  const { from, to, orderBy, excludeId } = opts;
  let q = supabase
    .from('products')
    .select('*, sowers:sower_id (id, display_name, slug, logo_url, user_id)')
    .eq('sower_id', sowerId)
    .neq('status', 'archived');
  if (excludeId) q = q.neq('id', excludeId);
  if (orderBy) {
    q = q.order(orderBy.column, {
      ascending: orderBy.ascending ?? false,
      ...(orderBy.nullsFirst !== undefined ? { nullsFirst: orderBy.nullsFirst } : {}),
    });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  return q.range(from, to);
};

/** Related products on the bulk product detail page (excludes current id). */
export const fetchRelatedProductsBySower = (sowerId: string, excludeId: string, limit = 8) =>
  supabase
    .from('products')
    .select('*, sowers:sower_id (id, display_name, slug, logo_url, user_id)')
    .eq('sower_id', sowerId)
    .neq('id', excludeId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit);

/** Main product fetch on bulk product detail (slug-or-uuid + sowers w/ is_verified). */
export const fetchProductBySlugOrId = (slugOrId: string) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const q = supabase
    .from('products')
    .select('*, sowers:sower_id (id, display_name, slug, logo_url, is_verified, user_id)')
    .neq('status', 'archived')
    .limit(1);
  return isUuid ? q.eq('id', slugOrId) : q.eq('slug', slugOrId);
};

/** Factory detail page: products listed under a company. */
export const fetchProductsByCompany = (companyId: string, limit = 60) =>
  supabase
    .from('products')
    .select('id, slug, title, price, cover_image_url, image_urls')
    .eq('company_id', companyId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit);

/** Live room detail: media-only projection for a single product id. */
export const fetchProductMedia = (id: string) =>
  supabase
    .from('products')
    .select('image_urls, cover_image_url')
    .eq('id', id)
    .maybeSingle();

/** Dashboard feed: cross-type product rows for a batch of sowers. */
export const fetchDashboardProductsForSowers = (sowerIds: string[], limit = 60) =>
  supabase
    .from('products')
    .select('id, title, description, type, category, cover_image_url, image_urls, music_genre, music_mood, artist_name, file_url, created_at')
    .in('sower_id', sowerIds)
    .order('created_at', { ascending: false })
    .limit(limit);

/** Tribal alive feed: active products projection for the feed. */
export const fetchActiveProductsForFeed = (limit = 80) =>
  supabase
    .from('products')
    .select('id, title, description, type, cover_image_url, image_urls, file_url, price, sower_id, wandering_role, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

/** Tier seed flow: products scoped to a list of companies. */
export const fetchProductsByCompanyIds = (companyIds: string[], limit = 60) =>
  supabase
    .from('products')
    .select('id, title, cover_image_url, image_urls, price, company_id, sower_id, type, category')
    .in('company_id', companyIds)
    .limit(limit);

/** Tier seed flow (homestead): solo-sown products (no company). */
export const fetchSoloSowerProducts = (limit = 500) =>
  supabase
    .from('products')
    .select('id, title, cover_image_url, image_urls, price, company_id, sower_id, type, category')
    .is('company_id', null)
    .not('sower_id', 'is', null)
    .limit(limit);

/** Whisperer dashboard: sowers with active whisperer-enabled products. */
export const fetchWhispererEnabledProducts = (limit = 200) =>
  supabase
    .from('products')
    .select('sower_id, whisperer_commission_percent, sowers:sower_id (id, slug, display_name, logo_url, is_verified)')
    .eq('has_whisperer', true)
    .eq('status', 'active')
    .limit(limit);

/** Leaderboard widget: top products by follower count. */
export const fetchTopProductsByFollowers = (limit = 5) =>
  supabase
    .from('products')
    .select(`
      id,
      title,
      follower_count,
      like_count,
      profiles:user_id (
        display_name,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .order('follower_count', { ascending: false })
    .limit(limit);

export interface ProductsPageQueryOpts {
  from: number;
  to: number;
  category?: string;          // legacy `category` text or marketplace UUID
  marketCategoryId?: string;  // overrides category if present
  wanderingRole?: string;
  taggedProductIds?: string[] | null;
  sort?: 'trending' | 'recent';
}

/** Products page (main marketplace grid). Returns supabase result. */
export const fetchProductsPage = (opts: ProductsPageQueryOpts) => {
  const { from, to, category, marketCategoryId, wanderingRole, taggedProductIds, sort } = opts;
  let query = supabase
    .from('products')
    .select(`
      *,
      sowers (
        ${SOWER_PUBLIC_COLS}
      )
    `)
    .range(from, to);

  if (category && category !== 'all' && category !== 'trending') {
    query = query.eq('category', category);
  }
  if (marketCategoryId) query = query.eq('category', marketCategoryId);
  if (wanderingRole) query = query.eq('wandering_role', wanderingRole);
  if (taggedProductIds) query = query.in('id', taggedProductIds);

  if (sort === 'trending') query = query.order('bestowal_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  return query;
};

