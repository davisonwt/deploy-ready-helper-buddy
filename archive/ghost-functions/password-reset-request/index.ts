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
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generic response to prevent email enumeration
    const genericResponse = new Response(
      JSON.stringify({ success: true, message: "If an account exists with this email, a reset request has been submitted." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // Check if email exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error checking users:", userError);
      return genericResponse;
    }

    const userExists = users.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      return genericResponse;
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from("password_reset_requests")
      .select("id, expires_at")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: "A pending reset request already exists for this email. Please wait for admin approval or try again after 24 hours." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create password reset request WITHOUT storing the password
    // Admin approval will trigger Supabase's built-in password reset email
    const { error: insertError } = await supabase
      .from("password_reset_requests")
      .insert({
        email: email.toLowerCase(),
        password_hash: "PENDING_ADMIN_RESET", // No password stored - admin will trigger reset link
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    if (insertError) {
      console.error("Error creating reset request:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit request. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset request created for ${email} (no password stored)`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset request submitted successfully. A Gosat administrator will review your request and you will receive a password reset email." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Password reset request error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
