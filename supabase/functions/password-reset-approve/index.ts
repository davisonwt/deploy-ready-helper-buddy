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

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has gosat role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "gosat")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Only Gosat administrators can approve password resets." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: "Request ID and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'approve' or 'reject'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the reset request
    const { data: resetRequest, error: fetchError } = await adminClient
      .from("password_reset_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError || !resetRequest) {
      return new Response(
        JSON.stringify({ error: "Reset request not found or already processed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(resetRequest.expires_at) < new Date()) {
      await adminClient
        .from("password_reset_requests")
        .update({ status: "expired", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", requestId);

      return new Response(
        JSON.stringify({ error: "This reset request has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      // Update request status to rejected
      await adminClient
        .from("password_reset_requests")
        .update({ 
          status: "rejected", 
          reviewed_by: user.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      console.log(`Password reset request ${requestId} rejected by ${user.email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Password reset request rejected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action is "approve" - generate a password reset link for the user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: resetRequest.email,
    });

    if (linkError) {
      console.error("Error generating reset link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate password reset link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset link generated for ${resetRequest.email}`);

    // Update request status to approved
    await adminClient
      .from("password_reset_requests")
      .update({ 
        status: "approved", 
        reviewed_by: user.id, 
        reviewed_at: new Date().toISOString() 
      })
      .eq("id", requestId);

    console.log(`Password reset approved for ${resetRequest.email} by ${user.email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset approved and applied successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Password reset approval error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
