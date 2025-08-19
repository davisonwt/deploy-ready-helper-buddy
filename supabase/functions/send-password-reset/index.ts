import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let email: string;

  try {
    console.log('=== Password Reset Function Started ===');
    
    // Parse request body
    const requestBody = await req.json();
    email = requestBody.email;
    
    console.log('Request received for email:', email);

    if (!email) {
      console.log('No email provided in request');
      throw new Error("Email is required");
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service key exists:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Initialize Supabase client
    console.log('Creating Supabase service client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try the password reset
    console.log('Attempting password reset for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://f76da68e-977d-42e6-85f3-ea2df1aea0df.lovableproject.com'}/login`
    });

    if (error) {
      console.error('Supabase resetPasswordForEmail error:', error);
      
      // Return success for security (don't reveal if email exists)
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

    console.log('Password reset email sent successfully');

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
    console.error("=== ERROR in password reset function ===");
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'An unexpected error occurred',
        details: `Failed to process password reset for ${email || 'unknown email'}`
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