import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log('Processing password reset request for:', email);

    // Initialize Supabase service client
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists by trying to get user by email
    const { data: userData, error: userError } = await supabaseServiceClient.auth.admin.getUserByEmail(email);
    
    if (userError && userError.message !== 'User not found') {
      console.error('Error fetching user:', userError);
      throw new Error('Failed to verify user account');
    }

    if (!userData?.user) {
      console.log('User not found, but proceeding for security:', email);
      // For security, we still return success even if user doesn't exist
      return new Response(JSON.stringify({ 
        success: true, 
        message: "If an account with that email exists, you will receive a password reset email shortly." 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log('User found, proceeding with password reset for:', email);

    // Generate password reset using Supabase's built-in functionality
    const { data: resetData, error: resetError } = await supabaseServiceClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://f76da68e-977d-42e6-85f3-ea2df1aea0df.lovableproject.com'}/login`
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      // Don't throw error, fall back to sending email notification
      console.log('Falling back to support email method');
    } else {
      console.log('Successfully generated reset link:', resetData);
    }

    // Use Supabase's built-in password reset functionality
    console.log('Attempting to send password reset email via Supabase...');
    
    const { error: sendError } = await supabaseServiceClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://f76da68e-977d-42e6-85f3-ea2df1aea0df.lovableproject.com'}/login`
    });

    if (sendError) {
      console.error('Supabase password reset failed:', sendError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Password reset failed: ${sendError.message}. Please contact support at support@sow2grow.online` 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log('Password reset email sent successfully via Supabase');

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Password reset email sent successfully. Please check your inbox." 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process password reset request',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);