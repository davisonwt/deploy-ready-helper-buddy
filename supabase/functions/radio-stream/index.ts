// radio-stream -- the actual audio relay for Grove Station.
//
// Takes NO track selection from the caller, ever. It recomputes "what's
// live right now" itself (radioSchedule.ts, the same function
// radio-now-playing uses) and redirects to a short-lived signed URL for
// THAT track only. This is the whole protection model: there is no
// parameter, header, or request shape that lets a caller ask for a
// specific song. A caller can only ever "tune in" to the current instant,
// the same as any radio stream URL -- never an on-demand single.
//
// The redirect target is a real signed URL for the full file, technically
// fetchable for its TTL. That is unavoidable for continuous playback (the
// browser's <audio> element needs something to stream from), and is the
// same shape get-seed-file already uses for a paying owner's own
// playback. The difference that matters: get-seed-file lets the CALLER
// choose which product; radio-stream never does. TTL is sized to the
// current track's own remaining length, not a flat window, so it never
// outlives the one play-through it was minted for by more than a
// small margin.
//
// Auth required, same manual bearer-verification shape as get-seed-file.
// No ownership/bestow check -- Davison's own rule: hearing radio play a
// full track is fine for any listener, it is on-demand download that
// isn't.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { computeCurrentTrack, fetchRadioTracks } from "../_shared/radioSchedule.ts";

const MIN_TTL_SECONDS = 60;
const TTL_MARGIN_SECONDS = 45;
// 2026-09-19: was 20 minutes, sized as "no realistic track is longer than
// this." A cap that can fall short of a real track's remaining length is
// exactly the wrong kind of cap for a stream that must never go silent --
// it doesn't limit exposure (the URL is already scoped to one track), it
// just risks the URL expiring mid-track for anything unusually long. Set
// high enough that it is never the reason a real listen dies.
const MAX_TTL_SECONDS = 4 * 60 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    // Bearer token may arrive as a header (fetch/XHR) or as ?token=
    // (an <audio src> the browser navigates to directly sends no custom
    // headers at all -- this is the same constraint any "protected media
    // element src" design runs into).
    const authHeader = req.headers.get("Authorization");
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : queryToken;
    if (!token) return json({ error: "unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const tracks = await fetchRadioTracks(service);
    const current = computeCurrentTrack(tracks, Date.now());
    if (!current) return json({ error: "no_tracks" }, 404);

    const { data: product, error: productError } = await service
      .from("products")
      .select("file_url")
      .eq("id", current.track.id)
      .maybeSingle();
    if (productError || !product?.file_url) {
      return json({ error: "unresolvable" }, 500);
    }

    const parsed = extractBucketAndPath(product.file_url);
    if (!parsed) return json({ error: "unresolvable" }, 500);

    const remaining = current.track.durationSeconds - current.offsetSeconds;
    const ttl = Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.ceil(remaining) + TTL_MARGIN_SECONDS));

    const { data: signed, error: signError } = await service.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, ttl);
    if (signError || !signed?.signedUrl) {
      return json({ error: "sign_failed" }, 500);
    }

    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: signed.signedUrl } });
  } catch (err) {
    console.error("radio-stream error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

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
