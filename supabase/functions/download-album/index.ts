import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROJECT_URL = Deno.env.get('SUPABASE_URL') ?? '';
const STORAGE_HOST = (() => {
  try { return new URL(PROJECT_URL).host.toLowerCase(); } catch { return ''; }
})();

// Service-role client, used only to sign premium-room storage paths server-side.
// premium-room is a private bucket — the manifest/track URLs stored on the product
// row are getPublicUrl()-style links that no longer resolve now the bucket is
// private, so every fetch below has to go through a freshly-minted signed URL
// instead of being fetched directly.
const serviceClient = createClient(PROJECT_URL, JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? '');

const FETCH_TIMEOUT_MS = 15_000;
const MAX_MANIFEST_BYTES = 1_000_000; // 1 MB
const MAX_TRACK_BYTES = 50_000_000; // 50 MB per track
const MAX_TOTAL_BYTES = 400_000_000; // 400 MB per album
const SIGN_TTL_SECONDS = 300; // just needs to outlive this request

/**
 * Only allow fetching from this project's own Supabase Storage domain.
 * Blocks SSRF to internal services / metadata endpoints / arbitrary hosts.
 */
function isAllowedUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length === 0) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (!STORAGE_HOST || u.host.toLowerCase() !== STORAGE_HOST) return false;
  return u.pathname.startsWith('/storage/v1/');
}

/**
 * Extracts the object path inside the premium-room bucket from a stored
 * getPublicUrl()-style (or signed/authenticated) URL. Returns null for
 * anything not pointing at premium-room, so callers fail closed.
 */
function extractPremiumRoomPath(raw: unknown): string | null {
  if (!isAllowedUrl(raw)) return null;
  const u = new URL(raw as string);
  const marker = '/storage/v1/object/';
  const idx = u.pathname.indexOf(marker);
  if (idx === -1) return null;
  const parts = u.pathname.slice(idx + marker.length).split('/').filter(Boolean);
  const bucketIdx = ['public', 'sign', 'authenticated'].includes(parts[0]) ? 1 : 0;
  if (parts[bucketIdx] !== 'premium-room') return null;
  return decodeURIComponent(parts.slice(bucketIdx + 1).join('/'));
}

/**
 * Signs a stored premium-room URL server-side, then fetches it through the
 * existing SSRF-guarded safeFetch. Replaces a direct fetch of the (no longer
 * public) stored URL.
 */
async function signedFetch(rawUrl: unknown, maxBytes: number): Promise<Uint8Array | null> {
  const path = extractPremiumRoomPath(rawUrl);
  if (!path) return null;
  const { data: signed, error } = await serviceClient.storage
    .from('premium-room')
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !signed?.signedUrl) {
    console.error('Failed to sign premium-room path', { path, error: error?.message });
    return null;
  }
  return safeFetch(signed.signedUrl, maxBytes);
}

async function safeFetch(url: string, maxBytes: number): Promise<Uint8Array | null> {
  if (!isAllowedUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!res.ok || !res.body) return null;
    const declared = Number(res.headers.get('content-length') ?? '0');
    if (declared > maxBytes) return null;

    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        return null;
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
    return out;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id');
    
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Missing product_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product and verify user has access (purchased or owns it)
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id, title, file_url, license_type, sower_id, sowers(user_id)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns the product or it's free
    const isOwner = product.sowers?.user_id === user.id;
    const isFree = product.license_type === 'free';

    if (!isFree && !isOwner) {
      // product_bestowals is the actual purchase record for `products` rows
      // (music_purchases is a different table — it only ever tracks
      // dj_music_tracks purchases via track_id/buyer_id, and has no
      // product_id/user_id columns at all).
      const { data: purchase, error: purchaseError } = await supabaseClient
        .from('product_bestowals')
        .select('id')
        .eq('product_id', productId)
        .eq('bestower_id', user.id)
        .eq('status', 'completed')
        .maybeSingle();

      // A failed lookup is not the same as "not purchased" — surface it as
      // an error instead of silently denying access (or, if the query were
      // ever inverted, silently granting it).
      if (purchaseError) {
        console.error('Purchase check failed', { productId, userId: user.id, error: purchaseError.message });
        return new Response(
          JSON.stringify({ error: 'Could not verify purchase' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'Access denied - product not purchased' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch manifest from storage via a freshly-signed URL (host-restricted, size/time capped)
    const manifestBytes = await signedFetch(product.file_url, MAX_MANIFEST_BYTES);
    if (!manifestBytes) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch album manifest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let manifest: any;
    try {
      manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid album manifest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate manifest structure
    if (!manifest.tracks || !Array.isArray(manifest.tracks) || manifest.tracks.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid album manifest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Streaming album with ${manifest.tracks.length} tracks`);

    // Import JSZip dynamically
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = new JSZip();

    // Download and add each track to ZIP
    let totalBytes = 0;
    for (const track of manifest.tracks) {
      const safeName = String(track?.name ?? '').replace(/[^\w.\- ]/g, '_').slice(0, 120);
      if (!safeName) continue;
      if (totalBytes >= MAX_TOTAL_BYTES) break;

      const remaining = Math.min(MAX_TRACK_BYTES, MAX_TOTAL_BYTES - totalBytes);
      const bytes = await signedFetch(track?.url, remaining);
      if (!bytes) {
        console.error(`Skipped track (blocked, too large, or unreachable): ${safeName}`);
        continue;
      }
      totalBytes += bytes.byteLength;
      zip.file(safeName, bytes);
    }


    // Generate ZIP
    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const filename = `${product.title.replace(/[^a-z0-9]/gi, '_')}_album.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBlob.length.toString(),
      },
    });

  } catch (error) {
    console.error('Album download error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
