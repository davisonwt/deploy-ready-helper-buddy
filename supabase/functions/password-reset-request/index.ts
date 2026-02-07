import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

// Simple hash function for password storage (bcrypt-like security would require a library)
// The actual password update will use Supabase Admin API which handles hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email exists in auth.users (using admin API)
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking users:", userError);
      // Don't reveal error details for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset request has been submitted." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userExists = users.users.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!userExists) {
      // Security: Don't reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists with this email, a reset request has been submitted." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending request for this email
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

    // Hash the password for storage
    const passwordHash = await hashPassword(newPassword);

    // Store the actual password encrypted (we'll use it with admin API later)
    // For now, store a simple reversible encoding since we need the actual password for admin.updateUserById
    const encodedPassword = btoa(newPassword); // Base64 encode for storage

    // Create password reset request
    const { error: insertError } = await supabase
      .from("password_reset_requests")
      .insert({
        email: email.toLowerCase(),
        password_hash: encodedPassword, // Storing encoded password for admin to use
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    if (insertError) {
      console.error("Error creating reset request:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit request. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset request created for ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset request submitted successfully. A Gosat administrator will review your request." }),
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
