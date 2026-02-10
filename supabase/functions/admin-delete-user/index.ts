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

    // Check the target user exists
    const { data: targetUser, error: targetError } = await adminClient.auth.admin.getUserById(target_user_id);
    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Log the deletion as a security event
    await adminClient.rpc("log_security_event_enhanced", {
      event_type: "admin_user_deletion",
      target_user_id: target_user_id,
      event_details: {
        deleted_by: callingUser.id,
        deleted_email: targetUser.user?.email || "unknown",
        timestamp: new Date().toISOString(),
      },
      severity_level: "warn",
    }).catch(() => {
      // Non-critical, continue even if logging fails
    });

    // Delete the auth user (this is the actual account deletion)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
