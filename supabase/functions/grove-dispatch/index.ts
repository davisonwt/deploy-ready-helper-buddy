import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Deterministic system "user" id per agent (UUIDv5-ish via hash → stable uuid).
// We just use a fixed namespace prefix so the same agent always maps to the same uuid.
const AGENT_UUIDS: Record<string, string> = {
  groundskeeper: "00000000-0000-4000-8000-00000000a001",
  grain:         "00000000-0000-4000-8000-00000000a002",
  sheaf:         "00000000-0000-4000-8000-00000000a003",
  thresh:        "00000000-0000-4000-8000-00000000a004",
  birch:         "00000000-0000-4000-8000-00000000a005",
  hawthorn:      "00000000-0000-4000-8000-00000000a006",
  acorn:         "00000000-0000-4000-8000-00000000a007",
  root:          "00000000-0000-4000-8000-00000000a008",
  bud:           "00000000-0000-4000-8000-00000000a009",
  hive:          "00000000-0000-4000-8000-00000000a010",
  nectar:        "00000000-0000-4000-8000-00000000a011",
  petal:         "00000000-0000-4000-8000-00000000a012",
  linden:        "00000000-0000-4000-8000-00000000a013",
};

async function ensureAgentRoom(
  admin: ReturnType<typeof createClient>,
  recipientId: string,
  agentSlug: string,
): Promise<string> {
  const agentName = `🌳 ${agentSlug.charAt(0).toUpperCase()}${agentSlug.slice(1)}`;

  // Look for an existing system room flagged with this agent for this recipient.
  const { data: existing } = await admin
    .from("chat_rooms")
    .select("id")
    .eq("is_system_room", true)
    .eq("created_by", recipientId)
    .contains("metadata", { agent: agentSlug })
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: room, error: roomErr } = await admin
    .from("chat_rooms")
    .insert({
      name: agentName,
      description: `Whispers from ${agentName} of the Grove.`,
      room_type: "direct",
      created_by: recipientId,
      is_system_room: true,
      metadata: { agent: agentSlug, kind: "grove_agent" },
    })
    .select("id")
    .single();
  if (roomErr) throw roomErr;

  await admin.from("chat_participants").insert([
    { room_id: room.id, user_id: recipientId, is_active: true },
  ]);

  return room.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET");

    // Internal-only: require service-role key or shared cron secret.
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

    const body = await req.json();
    const recipientId = String(body?.recipient_id ?? "");
    const agentSlug = String(body?.agent ?? "groundskeeper");
    const content = String(body?.body ?? body?.content ?? "");
    const metadata = body?.metadata ?? {};

    if (!recipientId || !content) {
      return new Response(JSON.stringify({ error: "recipient_id and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roomId = await ensureAgentRoom(admin, recipientId, agentSlug);
    const senderId = AGENT_UUIDS[agentSlug] ?? AGENT_UUIDS.groundskeeper;

    const { data: msg, error: msgErr } = await admin
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        message_type: "system",
        ai_generated: true,
        system_metadata: { agent: agentSlug, ...metadata },
      })
      .select("id")
      .single();
    if (msgErr) throw msgErr;

    return new Response(JSON.stringify({ ok: true, room_id: roomId, message_id: msg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grove-dispatch error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
