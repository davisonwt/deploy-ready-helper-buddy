// Server-side duration probe for Grove Station rundown segment uploads
// (opening/talk/advert/jingle/handover). Called right after the DJ's own
// browser uploads their clip to dj-rundown-segments -- this function reads
// it back and reports its REAL duration, which the client then stores on
// the segment row. Never trusts a client-supplied number.
//
// No ffmpeg/ffprobe in the edge runtime -- probes via the same pure
// byte-level WAV/MP3 parsing audioTrim.ts already uses for previews
// (_shared/audioDuration.ts). WAV/MP3 only; anything else is rejected with
// a clear message rather than guessing at a duration a wrong parse would
// produce.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { probeAudioDurationSeconds } from "../_shared/audioDuration.ts";

const BUCKET = "dj-rundown-segments";

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

    const { path } = await req.json();
    if (!path || typeof path !== "string") return json({ error: "path required" }, 400);
    // Own-folder only -- same boundary as the storage RLS policy itself,
    // checked again here since this function reads via the service role
    // (which bypasses RLS) rather than the caller's own session.
    if (!path.startsWith(`${userData.user.id}/`)) return json({ error: "forbidden" }, 403);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: file, error: downloadError } = await service.storage.from(BUCKET).download(path);
    if (downloadError || !file) return json({ error: "file_not_found" }, 404);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const rawDuration = probeAudioDurationSeconds(bytes);
    if (rawDuration === null) {
      return json({ error: "unsupported_format", message: "We can only read duration from WAV or MP3 — please upload one of those formats." }, 422);
    }
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
