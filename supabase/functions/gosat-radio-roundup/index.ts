// Admin-invoked one-shot: GoSat messages every existing music sower asking
// which of their already-sown tracks should be available on community radio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GOSAT_USER_ID = Deno.env.get("GOSAT_USER_ID");

    if (!GOSAT_USER_ID) {
      return new Response(
        JSON.stringify({ error: "GOSAT_USER_ID env var not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Caller must be an admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find every DJ with tracks. radio_djs.id == dj_music_tracks.dj_id.
    const { data: djs, error: djsErr } = await admin
      .from("radio_djs")
      .select("id, user_id, dj_name");
    if (djsErr) throw djsErr;

    // Already-nudged users to skip.
    const { data: sentRows } = await admin
      .from("gosat_radio_roundup_sent")
      .select("user_id");
    const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id));

    const results: any[] = [];
    for (const dj of djs ?? []) {
      if (!dj.user_id || alreadySent.has(dj.user_id)) continue;
      if (dj.user_id === GOSAT_USER_ID) continue;

      const { count, error: cntErr } = await admin
        .from("dj_music_tracks")
        .select("id", { count: "exact", head: true })
        .eq("dj_id", dj.id);
      if (cntErr || !count) continue;

      const { data: roomId, error: roomErr } = await admin.rpc(
        "get_or_create_direct_room",
        { user1_id: GOSAT_USER_ID, user2_id: dj.user_id },
      );
      if (roomErr || !roomId) {
        results.push({ user_id: dj.user_id, ok: false, error: roomErr?.message });
        continue;
      }

      const msg =
        `🌳 Greetings from GoSat\n\n` +
        `You've sown ${count} music seed${count === 1 ? "" : "s"} on Sow2Grow. ` +
        `Our community radio hosts are looking for songs they can play on air — ` +
        `you decide which of yours they may choose from.\n\n` +
        `Open your music radio list to tick each track you'd like radio hosts to be able to play:\n` +
        `https://sow2growapp.com/my-radio-opt-in\n\n` +
        `Bestow well. 🌱`;

      const { error: msgErr } = await admin.from("chat_messages").insert({
        room_id: roomId,
        sender_id: GOSAT_USER_ID,
        content: msg,
        message_type: "text",
      });
      if (msgErr) {
        results.push({ user_id: dj.user_id, ok: false, error: msgErr.message });
        continue;
      }

      await admin.from("gosat_radio_roundup_sent").insert({
        user_id: dj.user_id, track_count: count,
      });
      results.push({ user_id: dj.user_id, ok: true, track_count: count });
    }

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.ok).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
