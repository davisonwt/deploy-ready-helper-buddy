// Submits a Grove Station rundown for airing: RECOMPUTES every segment's
// real duration at submit time -- song segments from the product row,
// uploaded-audio segments by re-probing the actual file in
// dj-rundown-segments -- overwrites the stored duration_seconds with
// whatever's real, then sums THAT and rejects if it exceeds the 2-hour
// slot, stating the exact overage. A shortfall is fine -- autopilot pads
// whatever's left (_shared/radioSlots.ts's resolver falls through once
// the rundown runs out). On success, flips the slot to 'scheduled'.
//
// 2026-09-20: duration_seconds is a plain client-writable column (the DB
// has no way to itself verify a duration against a file or a product
// row), and the fabricated-7300s overshoot test walked straight through
// that -- it worked as a TEST of the overshoot check, but the same path
// would just as easily let a real segment's stored duration drift from
// its real file/product (e.g. a product's price/duration edited after
// the segment was added, or any direct-API insert bypassing the upload
// probe). Never trust duration_seconds again past this point -- always
// recompute it here, unconditionally, before the 2h check runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { probeAudioDurationSeconds } from "../_shared/audioDuration.ts";

const SLOT_SECONDS = 7200;
const SEGMENTS_BUCKET = "dj-rundown-segments";

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

    const { slotId } = await req.json();
    if (!slotId || typeof slotId !== "string") return json({ error: "slotId required" }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: slot, error: slotError } = await service
      .from("radio_slots")
      .select("id, dj_user_id, status, starts_at")
      .eq("id", slotId)
      .maybeSingle();
    if (slotError || !slot) return json({ error: "slot_not_found" }, 404);
    if (slot.dj_user_id !== userData.user.id) return json({ error: "forbidden" }, 403);
    if (slot.status === "cancelled" || slot.status === "aired") {
      return json({ error: "invalid_status", message: `This slot is already ${slot.status} and can't be submitted.` }, 400);
    }

    const { data: segments, error: segmentsError } = await service
      .from("radio_rundown_segments")
      .select("id, kind, duration_seconds, track_product_id, audio_path")
      .eq("slot_id", slotId);
    if (segmentsError) return json({ error: segmentsError.message }, 500);

    const rows = (segments ?? []) as Array<{
      id: string; kind: string; duration_seconds: number;
      track_product_id: string | null; audio_path: string | null;
    }>;
    if (rows.length === 0) {
      return json({ error: "empty_rundown", message: "Add at least one segment before submitting." }, 422);
    }

    // Recompute every segment's real duration -- never trust the stored
    // value, however it got there.
    const recomputed: Array<{ id: string; durationSeconds: number }> = [];
    for (const row of rows) {
      if (row.kind === "song") {
        if (!row.track_product_id) {
          // Its sower deleted the track (ON DELETE SET NULL, 2026-09-20) --
          // that delete must never be blocked by a rundown, so this segment
          // just contributes zero airtime instead of failing submission.
          // Not pushed to `recomputed`: duration_seconds has its own CHECK
          // (> 0), and there is nothing real left to persist for it.
          continue;
        }
        const { data: product, error: productError } = await service
          .from("products")
          .select("duration")
          .eq("id", row.track_product_id)
          .maybeSingle();
        if (productError || !product || !product.duration) {
          return json({ error: "broken_segment", message: `The track behind one segment no longer exists or has no duration -- remove and re-add it.` }, 422);
        }
        recomputed.push({ id: row.id, durationSeconds: product.duration });
      } else {
        if (!row.audio_path) {
          return json({ error: "broken_segment", message: `Segment ${row.id} has no audio file.` }, 500);
        }
        const { data: file, error: downloadError } = await service.storage.from(SEGMENTS_BUCKET).download(row.audio_path);
        if (downloadError || !file) {
          return json({ error: "broken_segment", message: `A segment's audio file is missing -- remove and re-add it.` }, 422);
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const rawDuration = probeAudioDurationSeconds(bytes);
        if (rawDuration === null) {
          return json({ error: "broken_segment", message: `A segment's audio file could no longer be read (WAV/MP3 only) -- remove and re-add it.` }, 422);
        }
        recomputed.push({ id: row.id, durationSeconds: Math.max(1, Math.floor(rawDuration)) });
      }
    }

    // Persist every recomputed value, even ones that didn't change --
    // this is the row of record from now on, not whatever the client
    // (or a direct API call) last wrote.
    await Promise.all(recomputed.map((r) =>
      service.from("radio_rundown_segments").update({ duration_seconds: r.durationSeconds }).eq("id", r.id)
    ));

    const totalSeconds = recomputed.reduce((sum, r) => sum + r.durationSeconds, 0);
    if (totalSeconds > SLOT_SECONDS) {
      const overage = totalSeconds - SLOT_SECONDS;
      return json({
        error: "overshoot",
        message: `Your rundown is ${formatDuration(overage)} over the 2-hour limit (total ${formatDuration(totalSeconds)}). Trim a segment and try again.`,
        totalSeconds,
        overageSeconds: overage,
      }, 422);
    }

    const { error: updateError } = await service
      .from("radio_slots")
      .update({ status: "scheduled" })
      .eq("id", slotId);
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ ok: true, totalSeconds, shortfallSeconds: SLOT_SECONDS - totalSeconds });
  } catch (err) {
    console.error("submit-radio-slot error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
