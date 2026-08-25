// complete-library-bestowal — FREE GIVEAWAY GRANTS ONLY.
//
// Paid access is never granted here. Paid library items must go through
// create-content-purchase-order -> provider webhook -> finalize_content_purchase.
//
// This function only grants access when the item is genuinely a free giveaway
// (server-verified: is_giveaway = true, price 0 or giveaway, and the giveaway
// limit not yet reached). All values are re-read server-side; client input other
// than the item id is ignored.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'server_misconfigured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(
      authHeader.slice('Bearer '.length),
    );
    if (userError || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const userId = userData.user.id;

    let body: { libraryItemId?: string };
    try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
    const libraryItemId = String(body?.libraryItemId ?? '').trim();
    if (!libraryItemId) return json({ error: 'missing_library_item_id' }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: item, error: itemError } = await service
      .from('s2g_library_items')
      .select('id, user_id, title, price, is_public, is_giveaway, giveaway_limit, giveaway_count')
      .eq('id', libraryItemId)
      .maybeSingle();

    if (itemError || !item) return json({ error: 'item_not_found' }, 404);
    if (!item.is_public) return json({ error: 'item_not_available' }, 403);

    const isFree = Number(item.price ?? 0) <= 0;
    const isGiveaway = item.is_giveaway === true;
    if (!isGiveaway && !isFree) {
      return json({
        error: 'payment_required',
        message: 'This item requires a bestowal. Use the checkout flow to pay.',
      }, 402);
    }

    if (isGiveaway) {
      const limit = item.giveaway_limit === null || item.giveaway_limit === undefined
        ? null
        : Number(item.giveaway_limit);
      const claimed = Number(item.giveaway_count ?? 0);
      if (limit !== null && claimed >= limit) {
        return json({ error: 'giveaway_exhausted', message: 'All free copies have been claimed.' }, 409);
      }
    }

    // Already has access? Return success without double-counting the giveaway.
    const { data: existing } = await service
      .from('s2g_library_item_access')
      .select('id')
      .eq('user_id', userId)
      .eq('library_item_id', libraryItemId)
      .maybeSingle();

    if (existing) {
      return json({ success: true, alreadyGranted: true });
    }

    const { error: grantError } = await service
      .from('s2g_library_item_access')
      .insert({ user_id: userId, library_item_id: libraryItemId, access_type: 'download' });
    if (grantError) {
      console.error('library access grant failed', grantError);
      return json({ error: 'grant_failed', detail: grantError.message }, 500);
    }

    if (isGiveaway) {
      await service
        .from('s2g_library_items')
        .update({ giveaway_count: Number(item.giveaway_count ?? 0) + 1 })
        .eq('id', libraryItemId);
    }

    return json({ success: true, granted: true, title: item.title });
  } catch (err) {
    console.error('complete-library-bestowal error', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
