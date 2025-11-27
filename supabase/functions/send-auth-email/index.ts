import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailData {
  user: {
    email: string;
    user_metadata?: any;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, email_data }: AuthEmailData = await req.json();
    
    console.log('Processing auth email for:', user.email);
    console.log('Email action type:', email_data.email_action_type);

    let subject = "";
    let html = "";
    
    const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

    switch (email_data.email_action_type) {
      case "signup":
        subject = "Welcome to Sow2Grow - Confirm Your Email";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">🌱 Welcome to Sow2Grow!</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Hello${user.user_metadata?.first_name ? ` ${user.user_metadata.first_name}` : ''},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Thank you for joining our community of sowers and bestowers! To complete your registration and start growing orchards, please confirm your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Confirm Your Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
              ${confirmUrl}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                Welcome to Sow2Grow - Where Seeds Become Orchards
              </p>
              <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </div>
          </div>
        `;
        break;

      case "recovery":
        subject = "Reset Your Sow2Grow Password";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">🔐 Password Reset</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Hello,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              We received a request to reset your password for your Sow2Grow account. Click the button below to set a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
              ${confirmUrl}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                This link will expire in 60 minutes for security reasons.
              </p>
              <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
        `;
        break;

      case "email_change":
        subject = "Confirm Your New Email Address";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">📧 Email Change Request</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Hello,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              We received a request to change your email address. Please confirm your new email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Confirm New Email
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
                If you didn't request this change, please contact our support team immediately.
              </p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error(`Unsupported email action type: ${email_data.email_action_type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Sow2Grow <no-reply@sow2grow.online>",
      to: [user.email],
      subject: subject,
      html: html,
    });

    console.log("Auth email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email',
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