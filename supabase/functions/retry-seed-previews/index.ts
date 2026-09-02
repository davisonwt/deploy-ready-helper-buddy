// Scheduled every 15 minutes (see the retry-seed-previews-cron migration).
// Finds music products whose preview generation failed (preview_url null,
// but a real file already sitting in premium-room) and retries up to 10 of
// them per run by calling generate-preview directly. generate-preview only
// ever returns a previewUrl to its own caller -- it never writes back to
// the products row itself -- so this function does that part: on success,
// preview_url is set here.
//
// This is the automatic side of SowMusicPage's "Track uploaded. Preview
// couldn't be generated -- we'll retry it automatically." message: a
// preview_upload_failed (or any other post-upload) failure no longer blocks
// Plant, so a sower's seed can go live with preview_url null; this job is
// what fills it in afterward, quietly, without the sower needing to do
// anything.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session -- same pattern as
// reconcile-paypal-orders / release-escrow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const BATCH_LIMIT = 10;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && apikeyHeader && apikeyHeader === SERVICE_ROLE_KEY) authorized = true;
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Albums (file_url -> manifest.json) have no single audio file to
    // preview and are excluded. "a file in premium-room" per spec.
    const { data: candidates, error: candidatesErr } = await service
      .from("products")
      .select("id, sower_id, file_url")
      .eq("type", "music")
      .is("preview_url", null)
      .not("file_url", "is", null)
      .not("file_url", "ilike", "%manifest.json%")
      .ilike("file_url", "%/premium-room/%")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (candidatesErr) {
      console.error("retry-seed-previews: candidate query failed", candidatesErr);
      return json({ error: candidatesErr.message }, 500);
    }

    const results: Array<{ productId: string; action: string; detail?: string }> = [];

    for (const product of (candidates ?? []) as any[]) {
      const parsed = extractBucketAndPath(product.file_url);
      if (!parsed) {
        results.push({ productId: product.id, action: "skipped_unresolvable_url" });
        continue;
      }

      const ownerUserId = await resolveOwnerUserId(service, product.sower_id);
      if (!ownerUserId) {
        results.push({ productId: product.id, action: "skipped_no_owner" });
        continue;
      }

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${CRON_SECRET}`,
          },
          body: JSON.stringify({ bucket: parsed.bucket, path: parsed.path, userId: ownerUserId }),
        });
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data?.previewUrl) {
          console.error("retry-seed-previews: generate-preview failed", product.id, data);
          results.push({ productId: product.id, action: "retry_failed", detail: data?.error ?? `status_${resp.status}` });
          continue;
        }

        const { error: updateErr } = await service
          .from("products")
          .update({ preview_url: data.previewUrl })
          .eq("id", product.id);
        if (updateErr) {
          console.error("retry-seed-previews: products update failed", product.id, updateErr);
          results.push({ productId: product.id, action: "update_failed", detail: updateErr.message });
          continue;
        }

        results.push({ productId: product.id, action: "preview_generated" });
      } catch (err) {
        console.error("retry-seed-previews: unexpected error", product.id, err);
        results.push({ productId: product.id, action: "retry_failed", detail: err instanceof Error ? err.message : String(err) });
      }
    }

    return json({ checked: (candidates ?? []).length, results });
  } catch (err) {
    console.error("retry-seed-previews error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// products.sower_id is sowers.id, not the uploader's auth user id — same
// resolution shape get-seed-file already uses.
async function resolveOwnerUserId(service: ReturnType<typeof createClient>, sowerId: string | null): Promise<string | null> {
  if (!sowerId) return null;
  const { data } = await service.from("sowers").select("user_id").eq("id", sowerId).maybeSingle();
  return (data as any)?.user_id ?? null;
}
