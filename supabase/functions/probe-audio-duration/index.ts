// Server-side duration probe for owner-uploaded audio: Grove Station
// rundown segments (dj-rundown-segments bucket) and stall welcome voice
// notes (stalls bucket, 2026-09-20). Called right after the owner's own
// browser uploads their clip -- this function reads it back and reports
// its REAL duration, which the client then stores. Never trusts a
// client-supplied number.
//
// No ffmpeg/ffprobe in the edge runtime -- probes via the same pure
// byte-level WAV/MP3 parsing audioTrim.ts already uses for previews
// (_shared/audioDuration.ts). WAV/MP3 only; anything else is rejected with
// a clear message rather than guessing at a duration a wrong parse would
// produce.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { probeStoredAudio } from "../_shared/storedAudio.ts";

// Both buckets use the SAME owner-folder convention (uid as the first
// path segment) -- allowlisted explicitly rather than accepting any
// bucket name, so this can't be pointed at something it wasn't scoped for.
const ALLOWED_BUCKETS = new Set(["dj-rundown-segments", "stalls"]);

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

    const { path, bucket } = await req.json();
    if (!path || typeof path !== "string") return json({ error: "path required" }, 400);
    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) return json({ error: "unsupported_bucket" }, 400);
    // Own-folder only -- same boundary as the storage RLS policy itself,
    // checked again here since this function reads via the service role
    // (which bypasses RLS) rather than the caller's own session.
    if (!path.startsWith(`${userData.user.id}/`)) return json({ error: "forbidden" }, 403);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const probed = await probeStoredAudio(service, bucket, path);
    if (!probed.ok && probed.reason === "missing") return json({ error: "file_not_found" }, 404);
    if (!probed.ok) {
      return json({ error: "unsupported_format", message: "We can only read duration from WAV or MP3 — please upload one of those formats." }, 422);
    }
    const rawDuration = probed.seconds;
    // duration_seconds is an integer column; floor (never round up, per
    // the 2026-09-20 radio duration sweep's own rule) so a segment's
    // stored length never overstates its real file and seeks past the
    // real end.
    const durationSeconds = Math.max(1, Math.floor(rawDuration));

    return json({ durationSeconds });
  } catch (err) {
    console.error("probe-audio-duration error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
