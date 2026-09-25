// Station staff (admin, gosat, radio_admin) cancel a Grove Station slot
// with a reason, and the DJ is told in chat. Runs as service_role for the
// update so the reason and who-cancelled are recorded in the same write;
// the caller's role is checked here first.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { postRadioNotice, slotLabel } from "../_shared/radioNotice.ts";

const STAFF_ROLES = ["admin", "gosat", "radio_admin"];

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

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", STAFF_ROLES);
    if (!roles || roles.length === 0) {
      return json({ error: "forbidden", message: "Only station staff can cancel another member's slot." }, 403);
    }

    const { slotId, reason } = await req.json();
    if (!slotId || typeof slotId !== "string") return json({ error: "slotId required" }, 400);
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (trimmedReason.length < 3) {
      return json({ error: "reason_required", message: "Say why the slot is being cancelled; the DJ will see this reason." }, 422);
    }

    const { data: slot, error: slotError } = await service
      .from("radio_slots")
      .select("id, dj_user_id, status, starts_at, title")
      .eq("id", slotId)
      .maybeSingle();
    if (slotError || !slot) return json({ error: "slot_not_found", message: "That slot no longer exists." }, 404);
    if (slot.status !== "draft" && slot.status !== "scheduled") {
      return json({ error: "invalid_status", message: `This slot is already ${slot.status}.` }, 409);
    }

    const { data: updated, error: updateError } = await service
      .from("radio_slots")
      .update({
        status: "cancelled",
        cancel_reason: trimmedReason.slice(0, 500),
        cancelled_by: userData.user.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", slotId)
      .in("status", ["draft", "scheduled"])
      .select("id");
    if (updateError) return json({ error: updateError.message }, 500);
    if (!updated || updated.length === 0) {
      return json({ error: "invalid_status", message: "This slot changed while you were looking at it. Reload and try again." }, 409);
    }

    const posted = await postRadioNotice(
      service, slot.dj_user_id, slot.id, "cancelled",
      `📻 Grove Station has cancelled ${slotLabel(slot)}.\n\nReason: ${trimmedReason.slice(0, 500)}\n\n` +
      `The time is free again. You can book another slot here:\nhttps://sow2growapp.com/grove-station?tab=schedule`,
    );
    if (!posted.ok) console.error("cancel-radio-slot: notice failed", slot.id, posted.error);

    return json({ ok: true, notified: posted.ok });
  } catch (err) {
    console.error("cancel-radio-slot error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
