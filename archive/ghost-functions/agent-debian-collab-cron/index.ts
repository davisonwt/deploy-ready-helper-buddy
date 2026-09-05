// 💌 Debian Collab DM Cron — runs periodically; takes queued collab_offer
// outbound messages (created when a member accepts a tribal_match) and
// delivers them as warm DMs into the recipient's 1:1 ChatApp room.
//
// Triggered by pg_cron (every 5 min). No JWT required — uses service role
// and is safe to call publicly because it only acts on already-queued rows.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, adminClient } from "../_shared/linux-family.ts";

const BATCH = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = adminClient();
  const startedAt = new Date().toISOString();

  try {
    const { data: queued, error } = await admin
      .from("linux_family_outbound_messages")
      .select("id,user_id,recipient_user_id,message_body,message_type,metadata,seed_id")
      .eq("status", "queued")
      .eq("channel", "chatapp")
      .not("recipient_user_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw error;

    let delivered = 0;
    let skipped = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const m of (queued ?? [])) {
      try {
        // Optional: only dispatch when matching tribal_match was accepted by both parties
        const tmId = (m.metadata as any)?.tribal_match_id;
        if (tmId) {
          const { data: tm } = await admin
            .from("tribal_matches")
            .select("status,member_a_response,member_b_response")
            .eq("id", tmId)
            .maybeSingle();
          // Require at least one explicit accept (initiator) before dispatching
          const okA = tm?.member_a_response === "accepted";
          const okB = tm?.member_b_response === "accepted";
          if (!okA && !okB) { skipped++; continue; }
        }

        // Resolve / create 1:1 chat room
        const { data: roomId, error: rpcErr } = await admin.rpc(
          "get_or_create_direct_room",
          { user1_id: m.user_id, user2_id: m.recipient_user_id },
        );
        if (rpcErr || !roomId) {
          failed++;
          errors.push({ id: m.id, err: rpcErr?.message ?? "no_room" });
          await admin.from("linux_family_outbound_messages")
            .update({ status: "failed", reply_text: rpcErr?.message ?? "no_room" })
            .eq("id", m.id);
          continue;
        }

        // Insert the warm DM signed by Debian
        const body = `💬 *Debian here, on behalf of your tribe sibling* —\n\n${m.message_body}\n\n_Reply here to start your collab. 🌿_`;
        const { error: insErr } = await admin.from("chat_messages").insert({
          room_id: roomId,
          sender_id: m.user_id,
          content: body,
          message_type: "text",
          ai_generated: true,
          system_metadata: {
            agent: "debian",
            kind: "collab_dispatch",
            outbound_id: m.id,
            tribal_match_id: tmId ?? null,
          },
        });
        if (insErr) {
          failed++;
          errors.push({ id: m.id, err: insErr.message });
          await admin.from("linux_family_outbound_messages")
            .update({ status: "failed", reply_text: insErr.message })
            .eq("id", m.id);
          continue;
        }

        await admin.from("linux_family_outbound_messages")
          .update({ status: "sent", recipient_room_id: roomId, replied_at: null })
          .eq("id", m.id);
        delivered++;
      } catch (e: any) {
        failed++;
        errors.push({ id: m.id, err: e?.message });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      startedAt,
      processed: queued?.length ?? 0,
      delivered, skipped, failed,
      errors: errors.slice(0, 5),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("collab-cron error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
