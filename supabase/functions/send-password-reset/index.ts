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

    // Try Supabase's built-in password reset email first
    const { error: sendError } = await supabaseServiceClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://f76da68e-977d-42e6-85f3-ea2df1aea0df.lovableproject.com'}/login`
    });

    if (sendError) {
      console.error('Supabase built-in email failed:', sendError);
      console.log('Attempting to send custom email via Resend...');
      
      // Fall back to custom email via Resend
      const customEmailHtml = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #3b82f6, #10b981); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="padding: 40px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your Sow2Grow account. 
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
              To reset your password, please contact our support team at <strong>support@sow2grow.online</strong> 
              or visit our support page for assistance.
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email 
                or contact support if you have concerns about your account security.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This email was sent from Sow2Grow Platform
              </p>
            </div>
          </div>
        </div>
      `;

      // Try to send via our Supabase function instead of direct Resend call
      try {
        // Create Supabase client to call our own function
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('send-resend-email', {
          body: {
            to: [email],
            subject: "Password Reset Request - Sow2Grow",
            html: customEmailHtml,
            from: "noreply@sow2grow.online"
          }
        });

        if (emailError) {
          console.error('Resend function failed:', emailError);
          throw new Error(`Email function failed: ${emailError.message}`);
        }

        console.log('Password reset email sent via Resend function:', emailResult);
      } catch (customEmailError) {
        console.error('Custom email also failed:', customEmailError);
        throw new Error(`Failed to send password reset email: ${customEmailError.message}`);
      }
    } else {
      console.log('Password reset email sent via Supabase built-in system');
    }

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