// Books/Jitsi->Daily.co migration (P1-6): mints a Daily.co room + short-lived
// meeting token for one caller, for one specific call. Every existing Jitsi
// integration in this app ran with NO room security at all (public
// meet.jit.si or a bare self-hosted IP, no JWT/token, room name guessable
// or literally random per-click) -- see AUDIT-2026-09-05.md P1-6. This
// function is the one and only place Daily's API key is used; it never
// reaches the client.
//
// Authorization is per `roomKind`, since "who's allowed in this room" means
// something different for each calling feature in this app:
//   - call_session: the row's caller_id/receiver_id (public.call_sessions,
//     the 1:1 call system behind useJitsiCall/JitsiVideoCall/JitsiAudioCall).
//   - chat_room: any current chat_participants row for that room (Wandering
//     Hearts' and ChatRoom's call button -- both used to open a random,
//     unauthenticated Jitsi URL with no way for the other party to even
//     learn the room name; this also fixes that by keying the Daily room
//     off the real, shared chat room id instead of Math.random()).
//   - custom: standalone/ad-hoc rooms (Garden calls, JitsiRoom-style live
//     rooms) not backed by a specific verifiable table in this pass --
//     floor is "must be authenticated," same trust level those rooms had
//     under Jitsi (public domain, no JWT) plus a real per-user token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

type RoomKind = "call_session" | "chat_room" | "custom";

interface Payload {
  roomKind: RoomKind;
  roomId: string;
  displayName?: string;
}

const DAILY_API = "https://api.daily.co/v1";
const ROOM_TTL_SECONDS = 60 * 60 * 4; // 4h -- a call/room that's been idle this long is stale
const TOKEN_TTL_SECONDS = 60 * 60 * 2; // 2h -- long enough for one call, short-lived by design

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!dailyApiKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    // Real, logged-in caller only -- every room kind requires at least this.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401);

    let payload: Payload;
    try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const { roomKind, roomId, displayName } = payload ?? {};
    if (!roomKind || !roomId || typeof roomId !== "string") {
      return json({ error: "roomKind and roomId are required" }, 400);
    }
    if (!["call_session", "chat_room", "custom"].includes(roomKind)) {
      return json({ error: "invalid_room_kind" }, 400);
    }

    const rlOk = await checkRateLimit(userClient, `daily-token:${user.id}`, "daily_meeting_token", 30, 15, true);
    if (!rlOk) return createRateLimitResponse(15 * 60);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Default naming: kind + the room's own id. Overridden below only for
    // call_session, the one kind with a fixed, known two-person shape --
    // chat_room can hold more than two participants (GroupChatRoomEnhanced
    // uses this same kind), so a "1v1" name would be actively wrong there.
    let dailyRoomName = `${roomKind}-${roomId}`;

    if (roomKind === "call_session") {
      const { data: call, error } = await service
        .from("call_sessions")
        .select("id, caller_id, receiver_id")
        .eq("id", roomId)
        .maybeSingle();
      if (error) { console.error("create-daily-meeting-token: call_sessions lookup failed", error); return json({ error: "lookup_failed" }, 500); }
      if (!call || (call.caller_id !== user.id && call.receiver_id !== user.id)) {
        return json({ error: "forbidden" }, 403);
      }
      // Sorted so both parties land on the same name regardless of who
      // initiated -- also means successive calls between the same two
      // people reuse the same Daily room instead of minting a fresh one
      // per call_sessions row, which is the intended UX (an identifiable,
      // persistent "room for us two"), not an incidental side effect.
      dailyRoomName = `s2g-1v1-${[call.caller_id, call.receiver_id].sort().join('-')}`;
    } else if (roomKind === "chat_room") {
      const { data: participant, error } = await service
        .from("chat_participants")
        .select("room_id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) { console.error("create-daily-meeting-token: chat_participants lookup failed", error); return json({ error: "lookup_failed" }, 500); }
      if (!participant) return json({ error: "forbidden" }, 403);
    }
    // "custom" rooms: authenticated is the whole check, same trust floor the
    // Jitsi rooms they replace had (a public domain with no JWT at all).

    dailyRoomName = dailyRoomName.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);

    const roomUrl = await getOrCreateDailyRoom(dailyApiKey, dailyRoomName);

    const tokenRes = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dailyApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          room_name: dailyRoomName,
          user_id: user.id,
          user_name: (displayName || "Sower").slice(0, 80),
          exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
        },
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error("create-daily-meeting-token: meeting-tokens failed", tokenRes.status, detail);
      return json({ error: "daily_token_failed" }, 502);
    }
    const { token } = await tokenRes.json();

    return json({ room_url: roomUrl, token, room_name: dailyRoomName });
  } catch (err) {
    console.error("create-daily-meeting-token error", err);
    await logFunctionFailure("create-daily-meeting-token", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function getOrCreateDailyRoom(apiKey: string, roomName: string): Promise<string> {
  const getRes = await fetch(`${DAILY_API}/rooms/${encodeURIComponent(roomName)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (getRes.ok) {
    const room = await getRes.json();
    return room.url;
  }
  if (getRes.status !== 404) {
    const detail = await getRes.text();
    console.error("create-daily-meeting-token: room lookup failed", getRes.status, detail);
    throw new Error(`daily_room_lookup_failed: ${getRes.status}: ${detail}`);
  }

  const createRes = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: roomName,
      privacy: "private", // only joinable with a signed meeting token -- no public link
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        exp: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
        eject_at_room_exp: true,
      },
    }),
  });
  if (!createRes.ok) {
    const detail = await createRes.text();
    console.error("create-daily-meeting-token: room create failed", createRes.status, detail);
    throw new Error(`daily_room_create_failed: ${createRes.status}: ${detail}`);
  }
  const room = await createRes.json();
  return room.url;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
