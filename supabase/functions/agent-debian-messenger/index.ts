// 💬 Debian the Messenger — ChatApp 2-way messaging + bestowar broadcasts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { mode = "draft", recipient_user_ids = [], room_id = null, seed_title = "", message_kind = "collab_offer", custom_text = null, seed_id = null } = await req.json();
    await setAgentStatus(user.id, "debian", "working");
    const admin = adminClient();

    let body = custom_text;
    if (!body) {
      body = await callAI([
        { role: "system", content: "You are Debian the Messenger 💬 for Sow2Grow. Write a short warm tribal message (under 300 chars). No emojis spam. End with a soft call-to-action." },
        { role: "user", content: `Type: ${message_kind}\nAbout: ${seed_title}\nFrom: a fellow tribe sower` },
      ]);
    }

    if (mode === "draft") {
      await setAgentStatus(user.id, "debian", "idle");
      return new Response(JSON.stringify({ draft: body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send: log outbound entries (real chat insert requires a room — we log + insert if room_id given)
    const records = [];
    if (room_id) {
      await admin.from("chat_messages").insert({ room_id, sender_id: user.id, content: body, message_type: "text" });
      records.push({ user_id: user.id, seed_id, recipient_room_id: room_id, message_body: body, message_type: message_kind, channel: "chatapp", status: "sent" });
    } else {
      for (const rid of recipient_user_ids) {
        records.push({ user_id: user.id, seed_id, recipient_user_id: rid, message_body: body, message_type: message_kind, channel: "chatapp", status: "sent" });
      }
    }
    if (records.length) await admin.from("linux_family_outbound_messages").insert(records);

    await logActivity(user.id, "debian", "messages_sent", `💬 Sent ${records.length} ${message_kind} message(s).`, { count: records.length }, seed_id);
    await setAgentStatus(user.id, "debian", "idle");
    return new Response(JSON.stringify({ sent: records.length, body }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("debian error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
