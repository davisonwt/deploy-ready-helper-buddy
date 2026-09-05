// 📞 Arch the Caller — Jitsi room creation + call log
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { mode = "place", counterparty_user_id = null, call_type = "video", seed_id = null, duration_seconds = 0, transcript = "", outcome = "completed", notes = "" } = await req.json();
    await setAgentStatus(user.id, "arch", "working");
    const admin = adminClient();

    if (mode === "place") {
      const room = `s2g-arch-${user.id.slice(0,8)}-${Date.now()}`;
      // Create call_session entry to ride existing Jitsi infra
      if (counterparty_user_id) {
        await admin.from("call_sessions").insert({
          caller_id: user.id, receiver_id: counterparty_user_id,
          call_type, status: "ringing", room_id: room,
        });
      }
      await admin.from("linux_family_call_log").insert({
        user_id: user.id, seed_id, direction: "outgoing", call_type,
        counterparty_user_id, jitsi_room: room, outcome: "ringing",
      });
      await logActivity(user.id, "arch", "call_placed", `📞 Placed a ${call_type} call.`, { room }, seed_id);
      await setAgentStatus(user.id, "arch", "idle");
      return new Response(JSON.stringify({ jitsi_room: room }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "log") {
      await admin.from("linux_family_call_log").insert({
        user_id: user.id, seed_id, direction: counterparty_user_id ? "outgoing" : "incoming",
        call_type, counterparty_user_id, duration_seconds, transcript, outcome, notes,
      });
      await logActivity(user.id, "arch", "call_logged", `📞 Logged a ${call_type} call (${duration_seconds}s, ${outcome}).`, {}, seed_id);
      await setAgentStatus(user.id, "arch", "idle");
      return new Response(JSON.stringify({ logged: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown mode" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
