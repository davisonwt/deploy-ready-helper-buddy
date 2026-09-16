// Worldwide free-text place lookup for the Sleeping Seeds hub.
//
// The browser never calls Nominatim directly: its usage policy requires an
// identifying User-Agent and caps callers at roughly one request a second,
// neither of which a browser tab can honour. This function does the call
// server-side, identifies the app, and caches every answer in
// public.geocode_cache so a repeated place name costs nothing.
//
// No country is privileged. There is no country list, no default city and
// no bias parameter -- a member types any place on earth and gets that
// place.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const BodySchema = z.object({ place: z.string().min(2).max(160) });

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/** Cache key: case- and whitespace-insensitive, so "Cape Town" == " cape  town ". */
function normalise(place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"]
    || Deno.env.get("SUPABASE_ANON_KEY"));
  if (!supabaseUrl || !anonKey) return json({ error: "server_misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(authHeader.slice(7));
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  const callerId = authData.user.id;

  const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"]
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  if (!serviceRoleKey) return json({ error: "server_misconfigured" }, 500);
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Nominatim's policy is the real constraint here, not our own capacity.
  // A cache hit still passes through this check, which is deliberate: it
  // keeps a scripted caller from walking the cache.
  const rlOk = await checkRateLimit(service, callerId, "geocode_place", 20, 5, true);
  if (!rlOk) return createRateLimitResponse(300);

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return json({ error: "invalid_body", message: "Type a town, city or area name." }, 400);
  }

  const key = normalise(parsed.place);

  // --- cache first ---------------------------------------------------------
  const { data: cached } = await service
    .from("geocode_cache")
    .select("lat, lng, display_name, hit_count")
    .eq("query_norm", key)
    .maybeSingle();

  if (cached) {
    await service
      .from("geocode_cache")
      .update({ hit_count: (cached.hit_count ?? 1) + 1, last_used_at: new Date().toISOString() })
      .eq("query_norm", key);
    return json({
      lat: Number(cached.lat),
      lng: Number(cached.lng),
      displayName: cached.display_name,
      source: "cache",
    });
  }

  // --- live lookup ---------------------------------------------------------
  const url = `${NOMINATIM}?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(parsed.place)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        // Nominatim blocks unidentified callers. This is the app, not a browser.
        "User-Agent": "Sow2Grow/1.0 (https://www.sow2growapp.com)",
        "Accept": "application/json",
        "Accept-Language": req.headers.get("Accept-Language") ?? "en",
      },
    });
  } catch (err) {
    await logFunctionFailure("geocode-place", err);
    return json({ error: "geocoder_unreachable", message: "Could not reach the place lookup service. Try again in a moment." }, 503);
  }

  if (res.status === 429 || res.status === 403) {
    return json({ error: "geocoder_busy", message: "The place lookup service is busy. Try again in a moment.", retryable: true }, 503);
  }
  if (!res.ok) {
    return json({ error: "geocoder_failed", message: "Could not look that place up. Try again in a moment." }, 503);
  }

  let hits: Array<{ lat?: string; lon?: string; display_name?: string }>;
  try {
    hits = await res.json();
  } catch {
    // A non-JSON body is how Nominatim rate-limiting usually shows up.
    return json({ error: "geocoder_failed", message: "Could not look that place up. Try again in a moment." }, 503);
  }

  const hit = Array.isArray(hits) ? hits[0] : undefined;
  const lat = hit?.lat != null ? Number(hit.lat) : NaN;
  const lng = hit?.lon != null ? Number(hit.lon) : NaN;

  if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({
      error: "place_not_found",
      message: "We could not find that place. Try adding the country, for example \"Springs, South Africa\" or \"Lyon, France\".",
    }, 404);
  }

  await service.from("geocode_cache").upsert({
    query_norm: key,
    lat,
    lng,
    display_name: hit.display_name ?? parsed.place,
    provider: "nominatim",
    hit_count: 1,
    last_used_at: new Date().toISOString(),
  }, { onConflict: "query_norm" });

  return json({ lat, lng, displayName: hit.display_name ?? parsed.place, source: "nominatim" });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
