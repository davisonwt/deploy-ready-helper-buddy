// radio-slot-tick -- every 5 minutes via pg_cron (invoke_money_job, see
// the 20260925120000 migration):
//   1. a 'scheduled' slot whose 2-hour window has ended becomes 'aired';
//   2. a 'scheduled' slot starting within the next hour gets its DJ a
//      one-time chat reminder (reminder_sent_at makes it once only).
//
// Auth: same as expire-bookings -- CRON_SECRET bearer, service-role
// apikey, or an admin/gosat session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { postRadioNotice, slotLabel } from "../_shared/radioNotice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const SLOT_MS = 2 * 60 * 60 * 1000;
const REMINDER_LEAD_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
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
        authorized = !!roles?.some((r: { role: string }) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const now = Date.now();

    const { data: aired, error: airedError } = await service
      .from("radio_slots")
      .update({ status: "aired", aired_at: new Date(now).toISOString() })
      .eq("status", "scheduled")
      .lte("starts_at", new Date(now - SLOT_MS).toISOString())
      .select("id");
    if (airedError) return json({ error: "aired_failed", detail: airedError.message }, 500);

    const { data: due, error: dueError } = await service
      .from("radio_slots")
      .select("id, dj_user_id, starts_at, title")
      .eq("status", "scheduled")
      .is("reminder_sent_at", null)
      .gt("starts_at", new Date(now).toISOString())
      .lte("starts_at", new Date(now + REMINDER_LEAD_MS).toISOString());
    if (dueError) return json({ error: "reminder_query_failed", detail: dueError.message }, 500);

    const reminders: Array<{ id: string; ok: boolean }> = [];
    for (const slot of due ?? []) {
      // Claim first so an overlapping run can't double-send.
      const { data: claimed } = await service
        .from("radio_slots")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", slot.id)
        .is("reminder_sent_at", null)
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      const minutes = Math.max(1, Math.round((new Date(slot.starts_at).getTime() - now) / 60000));
      const posted = await postRadioNotice(
        service, slot.dj_user_id, slot.id, "reminder",
        `📻 Reminder: ${slotLabel(slot)} airs on Grove Station in about ${minutes} minutes. ` +
        `Your rundown is set; nothing more to do.\n\nhttps://sow2growapp.com/grove-station?tab=listen`,
      );
      if (!posted.ok) {
        console.error("radio-slot-tick: reminder failed", slot.id, posted.error);
        await service.from("radio_slots").update({ reminder_sent_at: null }).eq("id", slot.id);
      }
      reminders.push({ id: slot.id, ok: posted.ok });
    }

    return json({ ok: true, aired: (aired ?? []).length, reminders });
  } catch (err) {
    console.error("radio-slot-tick error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
