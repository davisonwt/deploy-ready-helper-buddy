// get-seed-file — purchase-gated access to a product-sourced seed's full file.
//
// products.file_url points into the private `premium-room` bucket (its
// "/object/public/..." shape is misleading — the bucket itself is private,
// confirmed via storage.buckets.public = false). Nothing may mint a signed
// URL for it directly from the client; this function is the only path.
//
// Entitlement: the caller must either be the seed's own uploader (resolved
// via products.sower_id -> sowers.id -> sowers.user_id, since sower_id is
// the sowers table's own PK, not the uploader's auth id — see
// SESSION-STATE.md's sower_earnings_v fix for the same bug class), or hold
// a completed product_bestowals row for this exact product. No other check
// grants access. content_purchases (dj_track / library-item purchases) is
// deliberately out of scope here — this function is products-only.
//
// verify_jwt is false (see supabase/config.toml) because the entitlement
// check needs the DB to run as service role while still knowing who the
// caller is; auth is verified manually below with the caller's own bearer
// token against the anon client first.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SIGNED_URL_TTL_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const callerId = userData.user.id;

    let payload: { productId?: string };
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const productId = payload?.productId;
    if (!productId) return json({ error: "missing_product_id" }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: product, error: productError } = await service
      .from("products")
      .select("id, file_url, sower_id")
      .eq("id", productId)
      .maybeSingle();
    if (productError || !product) {
      return json({ error: "not_found" }, 404);
    }
    if (!product.file_url) {
      return json({ error: "no_file" }, 404);
    }

    const isUploader = await checkIsUploader(service, product.sower_id, callerId);
    const isBuyer = isUploader ? false : await checkHasCompletedBestowal(service, productId, callerId);

    if (!isUploader && !isBuyer) {
      console.warn("get-seed-file: access denied", { productId, callerId });
      return json({ error: "forbidden" }, 403);
    }

    const parsed = extractBucketAndPath(product.file_url);
    if (!parsed) {
      console.error("get-seed-file: could not parse file_url", productId, product.file_url);
      return json({ error: "unresolvable_file" }, 500);
    }

    const { data: signed, error: signError } = await service.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) {
      console.error("get-seed-file: sign failed", productId, signError);
      return json({ error: "sign_failed" }, 500);
    }

    return json({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (err) {
    console.error("get-seed-file error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// deno-lint-ignore no-explicit-any
async function checkIsUploader(service: any, sowerId: string | null, callerId: string): Promise<boolean> {
  if (!sowerId) return false;
  const { data } = await service
    .from("sowers")
    .select("id")
    .eq("id", sowerId)
    .eq("user_id", callerId)
    .maybeSingle();
  return !!data;
}

// deno-lint-ignore no-explicit-any
async function checkHasCompletedBestowal(service: any, productId: string, callerId: string): Promise<boolean> {
  const { data } = await service
    .from("product_bestowals")
    .select("id")
    .eq("product_id", productId)
    .eq("bestower_id", callerId)
    .eq("status", "completed")
    .maybeSingle();
  return !!data;
}

function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
