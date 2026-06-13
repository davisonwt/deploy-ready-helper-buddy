import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET");

    // Require a shared cron secret so this flush endpoint can't be triggered by anonymous callers.
    const authHeader = req.headers.get("authorization") ?? "";
    const provided = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const isServiceRole = !!SERVICE_KEY && provided === SERVICE_KEY;
    const isCron = !!CRON_SECRET && provided === CRON_SECRET;
    if (!isServiceRole && !isCron) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: due } = await admin
      .from("grove_message_queue")
      .select("id, recipient_id, agent_slug, body, metadata, attempts")
      .is("delivered_at", null)
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 5)
      .limit(50);

    const rows = (due as any[]) ?? [];
    let delivered = 0;

    for (const row of rows) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/grove-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({
            recipient_id: row.recipient_id,
            agent: row.agent_slug,
            body: row.body,
            metadata: row.metadata ?? {},
          }),
        });
        if (!r.ok) throw new Error(`dispatch ${r.status}`);
        await admin.from("grove_message_queue")
          .update({ delivered_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
          .eq("id", row.id);
        delivered++;
      } catch (e) {
        await admin.from("grove_message_queue")
          .update({ attempts: (row.attempts ?? 0) + 1, delivery_error: String(e).slice(0, 500) })
          .eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, scanned: rows.length, delivered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
