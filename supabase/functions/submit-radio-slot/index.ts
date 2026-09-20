// Submits a Grove Station rundown for airing: sums the slot's segments'
// REAL durations (already server-probed at upload time / read from the
// referenced product row -- never trusted from the client here either)
// and rejects if the total exceeds the 2-hour slot, stating the exact
// overage. A shortfall is fine -- autopilot pads whatever's left
// (_shared/radioSlots.ts's resolver falls through once the rundown runs
// out). On success, flips the slot to 'scheduled'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SLOT_SECONDS = 7200;

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
      .select("duration_seconds")
      .eq("slot_id", slotId);
    if (segmentsError) return json({ error: segmentsError.message }, 500);

    const rows = (segments ?? []) as Array<{ duration_seconds: number }>;
    if (rows.length === 0) {
      return json({ error: "empty_rundown", message: "Add at least one segment before submitting." }, 422);
    }

    const totalSeconds = rows.reduce((sum, r) => sum + r.duration_seconds, 0);
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
