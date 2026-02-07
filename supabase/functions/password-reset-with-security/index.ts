import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

// Hash function matching the client-side implementation
async function hashAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email, answer1, answer2, answer3, newPassword } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Action: get-questions - Returns security questions for an email
    if (action === "get-questions") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find user by email
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Error listing users:", listError);
        return new Response(
          JSON.stringify({ error: "Unable to process request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!targetUser) {
        // Security: Don't reveal if user exists - return generic message
        return new Response(
          JSON.stringify({ error: "If an account exists with this email, security questions would be shown. Please check your email address." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get security questions
      const { data: securityData, error: securityError } = await supabase
        .from("user_security_questions")
        .select("question_1, question_2, question_3")
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (securityError || !securityData) {
        return new Response(
          JSON.stringify({
            error: "Security questions not set up for this account. Please contact support for assistance.",
            noQuestions: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          questions: {
            question_1: securityData.question_1,
            question_2: securityData.question_2,
            question_3: securityData.question_3
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: verify-and-reset - Verify answers and reset password
    if (action === "verify-and-reset") {
      if (!email || !answer1 || !answer2 || !answer3 || !newPassword) {
        return new Response(
          JSON.stringify({ error: "All fields are required" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find user
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Error listing users:", listError);
        return new Response(
          JSON.stringify({ error: "Unable to process request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get stored security questions and hashed answers
      const { data: securityData, error: securityError } = await supabase
        .from("user_security_questions")
        .select("*")
        .eq("user_id", targetUser.id)
        .maybeSingle();

      if (securityError || !securityData) {
        return new Response(
          JSON.stringify({ error: "Security questions not found for this account" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash provided answers and compare
      const [hash1, hash2, hash3] = await Promise.all([
        hashAnswer(answer1),
        hashAnswer(answer2),
        hashAnswer(answer3)
      ]);

      const allCorrect = 
        hash1 === securityData.answer_1_hash &&
        hash2 === securityData.answer_2_hash &&
        hash3 === securityData.answer_3_hash;

      if (!allCorrect) {
        console.log(`Failed password reset attempt for ${email}: incorrect security answers`);
        return new Response(
          JSON.stringify({ error: "One or more security answers are incorrect. Please try again." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // All answers correct - reset the password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        targetUser.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update password. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Password successfully reset for ${email} via security questions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Password has been reset successfully. You can now log in with your new password." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Password reset error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
