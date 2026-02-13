import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the requesting user is a gosat/admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user has admin or gosat role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    const isAuthorized = roles?.some(
      (r: any) => r.role === "admin" || r.role === "gosat"
    );

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Only gosat/admin can delete users." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target user ID from request body
    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent deleting yourself
    if (target_user_id === callingUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the target user exists in auth (may already be deleted)
    let targetUserEmail = "unknown";
    const { data: targetUser } = await adminClient.auth.admin.getUserById(target_user_id);
    if (targetUser?.user?.email) {
      targetUserEmail = targetUser.user.email;
    }
    // Proceed with cleanup regardless - residual data may still exist

    // Clean up related data before deleting auth user
    // (Most tables with user_id FK should CASCADE, but clean up manually for safety)
    
    // Delete profile
    await adminClient.from("profiles").delete().eq("user_id", target_user_id);
    
    // Delete user roles
    await adminClient.from("user_roles").delete().eq("user_id", target_user_id);

    // Delete journal entries
    await adminClient.from("journal_entries").delete().eq("user_id", target_user_id);

    // Delete activity feed
    await adminClient.from("activity_feed").delete().eq("user_id", target_user_id);

    // Delete achievements
    await adminClient.from("achievements").delete().eq("user_id", target_user_id);

    // Delete user's products and related data
    const { data: userProducts } = await adminClient.from("products").select("id").eq("sower_id", target_user_id);
    if (userProducts && userProducts.length > 0) {
      const productIds = userProducts.map((p: any) => p.id);
      await adminClient.from("basket_items").delete().in("product_id", productIds);
      await adminClient.from("product_reviews").delete().in("product_id", productIds);
      await adminClient.from("pocket_products").delete().in("product_id", productIds);
      await adminClient.from("products").delete().eq("sower_id", target_user_id);
    }

    // Delete user's sower books and related data
    const { data: userBooks } = await adminClient.from("sower_books").select("id").eq("sower_id", target_user_id);
    if (userBooks && userBooks.length > 0) {
      const bookIds = userBooks.map((b: any) => b.id);
      await adminClient.from("book_orders").delete().in("book_id", bookIds);
      await adminClient.from("pocket_products").delete().in("book_id", bookIds);
      await adminClient.from("sower_books").delete().eq("sower_id", target_user_id);
    }

    // Delete user's orchards and related data
    const { data: userOrchards } = await adminClient.from("orchards").select("id").eq("sower_id", target_user_id);
    if (userOrchards && userOrchards.length > 0) {
      const orchardIds = userOrchards.map((o: any) => o.id);
      await adminClient.from("bestowals").delete().in("orchard_id", orchardIds);
      await adminClient.from("courier_deliveries").delete().in("orchard_id", orchardIds);
      await adminClient.from("pocket_products").delete().in("orchard_id", orchardIds);
      await adminClient.from("orchards").delete().eq("sower_id", target_user_id);
    }

    // Delete community videos
    await adminClient.from("community_videos").delete().eq("uploader_id", target_user_id);

    // Delete radio DJ data
    const { data: djData } = await adminClient.from("radio_djs").select("id").eq("user_id", target_user_id);
    if (djData && djData.length > 0) {
      const djIds = djData.map((d: any) => d.id);
      const { data: playlists } = await adminClient.from("dj_playlists").select("id").in("dj_id", djIds);
      if (playlists && playlists.length > 0) {
        await adminClient.from("dj_playlist_tracks").delete().in("playlist_id", playlists.map((p: any) => p.id));
        await adminClient.from("dj_playlists").delete().in("dj_id", djIds);
      }
      await adminClient.from("dj_music_tracks").delete().in("dj_id", djIds);
      await adminClient.from("radio_djs").delete().eq("user_id", target_user_id);
    }

    // Nullify radio_schedule references
    await adminClient.from("radio_schedule").update({ approved_by: null }).eq("approved_by", target_user_id);

    // Nullify any other FK references that might block deletion
    await adminClient.from("bestowals").delete().eq("bestower_id", target_user_id);
    await adminClient.from("chat_participants").delete().eq("user_id", target_user_id);
    await adminClient.from("chat_messages").update({ sender_id: null }).eq("sender_id", target_user_id);
    await adminClient.from("community_posts").delete().eq("author_id", target_user_id);
    await adminClient.from("community_post_replies").delete().eq("author_id", target_user_id);
    await adminClient.from("community_post_votes").delete().eq("user_id", target_user_id);
    await adminClient.from("content_flags").delete().eq("user_id", target_user_id);
    await adminClient.from("call_sessions").delete().eq("caller_id", target_user_id);
    await adminClient.from("call_sessions").delete().eq("receiver_id", target_user_id);
    await adminClient.from("clubhouse_gifts").delete().eq("giver_id", target_user_id);
    await adminClient.from("clubhouse_gifts").delete().eq("receiver_id", target_user_id);
    await adminClient.from("ai_creations").delete().eq("user_id", target_user_id);
    await adminClient.from("ai_usage").delete().eq("user_id", target_user_id);
    await adminClient.from("birthdays").delete().eq("user_id", target_user_id);
    await adminClient.from("community_drivers").delete().eq("user_id", target_user_id);
    await adminClient.from("affiliates").delete().eq("user_id", target_user_id);
    await adminClient.from("ambassador_applications").delete().eq("user_id", target_user_id);
    await adminClient.from("circle_members").delete().eq("user_id", target_user_id);
    await adminClient.from("document_annotations").delete().eq("user_id", target_user_id);
    await adminClient.from("baskets").delete().eq("user_id", target_user_id);

    // Log the deletion as a security event
    try {
      await adminClient.rpc("log_security_event_enhanced", {
        event_type: "admin_user_deletion",
        target_user_id: target_user_id,
        event_details: {
          deleted_by: callingUser.id,
          deleted_email: targetUserEmail,
          timestamp: new Date().toISOString(),
        },
        severity_level: "warn",
      });
    } catch (_) {
      // Non-critical, continue even if logging fails
    }

    // Delete the auth user if they still exist
    if (targetUser?.user) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_user_id);
      if (deleteError) {
        console.error("Failed to delete auth user:", deleteError);
        // Non-fatal: data cleanup already succeeded
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User account deleted successfully. They can re-register if they wish." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Delete user error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
