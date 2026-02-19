import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get the calling user's auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify calling user is admin/gosat
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("gosat")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find all products of type 'music' that have no mood or genre set
    const { data: uncategorizedProducts, error: prodError } = await supabase
      .from("products")
      .select("id, title, sower_id, sowers!inner(id, user_id)")
      .eq("type", "music")
      .or("music_mood.is.null,music_genre.is.null");

    if (prodError) throw prodError;

    // Also check dj_music_tracks
    const { data: uncategorizedTracks, error: trackError } = await supabase
      .from("dj_music_tracks")
      .select("id, track_title, dj_id, radio_djs!fk_dj_music_tracks_dj_id(id, user_id)")
      .or("music_mood.is.null,music_genre.is.null");

    if (trackError) throw trackError;

    // Group by sower/user
    const userNotifications = new Map<string, string[]>();

    for (const product of uncategorizedProducts || []) {
      const userId = product.sowers?.user_id;
      if (!userId) continue;
      if (!userNotifications.has(userId)) userNotifications.set(userId, []);
      userNotifications.get(userId)!.push(`🌱 "${product.title}" (Seed)`);
    }

    for (const track of uncategorizedTracks || []) {
      const userId = track.radio_djs?.user_id;
      if (!userId) continue;
      if (!userNotifications.has(userId)) userNotifications.set(userId, []);
      userNotifications.get(userId)!.push(`🎵 "${track.track_title}" (DJ Track)`);
    }

    // Get GoSat profile user_id for sending messages
    const { data: gosatProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", "s2gaadmin")
      .single();

    const gosatUserId = gosatProfile?.user_id || user.id;
    let messagesSent = 0;
    let usersNotified = 0;

    for (const [targetUserId, tracks] of userNotifications.entries()) {
      if (tracks.length === 0) continue;
      
      try {
        // Create or get direct room between gosat and the sower
        const { data: roomId, error: roomError } = await supabase.rpc(
          "get_or_create_direct_room",
          { user1_id: gosatUserId, user2_id: targetUserId }
        );

        if (roomError || !roomId) {
          console.error(`Failed to create room for user ${targetUserId}:`, roomError);
          continue;
        }

        const trackList = tracks.slice(0, 10).join("\n");
        const moreText = tracks.length > 10 ? `\n...and ${tracks.length - 10} more` : "";
        
        const message = `🎶 **Music Categorization Needed**\n\nHi there! We've added mood and genre tags to our music system to help listeners discover your songs more easily.\n\nThe following uploads need categorization:\n${trackList}${moreText}\n\nPlease go to **My Garden → My Seeds** and edit each music upload to set the **Mood** (e.g. Love, Spiritual, Uplifting) and **Genre** (e.g. Gospel, Rock, Pop).\n\nThis helps your music get discovered in the Community Music Library! 🙏`;

        const { error: msgError } = await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: gosatUserId,
          content: message,
          message_type: "text",
        });

        if (msgError) {
          console.error(`Failed to send message to user ${targetUserId}:`, msgError);
          continue;
        }

        messagesSent++;
        usersNotified++;
      } catch (err) {
        console.error(`Error notifying user ${targetUserId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        usersNotified,
        messagesSent,
        totalUncategorized: Array.from(userNotifications.values()).flat().length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
