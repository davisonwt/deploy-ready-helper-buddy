import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed email action types
const ALLOWED_ACTION_TYPES = new Set(["signup", "recovery", "email_change"]);

// Allowed redirect domains
const ALLOWED_REDIRECT_DOMAINS = new Set([
  "sow2growapp.lovable.app",
  "sow2growapp.com",
  "www.sow2growapp.com",
  "app.sow2grow.com",
  "localhost",
]);

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

/**
 * Validate that a URL's hostname is in the allowed list
 */
function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_DOMAINS.has(parsed.hostname) ||
           parsed.hostname.endsWith(".lovable.app") ||
           parsed.hostname.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}

/**
 * Basic email format validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require shared secret
    const hookSecret = Deno.env.get("SEND_AUTH_EMAIL_SECRET");
    if (hookSecret) {
      const authHeader = req.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== hookSecret) {
        console.error("Unauthorized: invalid or missing auth secret");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const { user, email_data }: AuthEmailData = await req.json();

    // Validate email
    if (!user?.email || !isValidEmail(user.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate action type
    if (!ALLOWED_ACTION_TYPES.has(email_data?.email_action_type)) {
      return new Response(
        JSON.stringify({ error: "Unsupported email action type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate redirect_to URL
    if (email_data.redirect_to && !isAllowedRedirectUrl(email_data.redirect_to)) {
      console.error("Blocked redirect to unauthorized domain:", email_data.redirect_to);
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token_hash is present and alphanumeric-ish
    if (!email_data.token_hash || !/^[a-zA-Z0-9_-]+$/.test(email_data.token_hash)) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Processing auth email for:', user.email);
    console.log('Email action type:', email_data.email_action_type);

    let subject = "";
    let html = "";

    const safeRedirectTo = encodeURIComponent(email_data.redirect_to || "");
    const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${encodeURIComponent(email_data.token_hash)}&type=${encodeURIComponent(email_data.email_action_type)}&redirect_to=${safeRedirectTo}`;
    const escapedConfirmUrl = escapeHtml(confirmUrl);
    const firstName = user.user_metadata?.first_name ? escapeHtml(String(user.user_metadata.first_name)) : '';

    switch (email_data.email_action_type) {
      case "signup":
        subject = "Welcome to Sow2Grow - Confirm Your Email";
        html = buildSignupEmail(escapedConfirmUrl, firstName);
        break;
      case "recovery":
        subject = "Reset Your Sow2Grow Password";
        html = buildRecoveryEmail(escapedConfirmUrl);
        break;
      case "email_change":
        subject = "Confirm Your New Email Address";
        html = buildEmailChangeEmail(escapedConfirmUrl);
        break;
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request", success: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function buildSignupEmail(confirmUrl: string, firstName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0;">🌱 Welcome to Sow2Grow!</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Hello${firstName ? ` ${firstName}` : ''},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Thank you for joining our community of sowers and bestowers! To complete your registration and start growing orchards, please confirm your email address.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Confirm Your Email
        </a>
      </div>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${confirmUrl}</p>
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0;">Welcome to Sow2Grow - Where Seeds Become Orchards</p>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">If you didn't create this account, you can safely ignore this email.</p>
      </div>
    </div>`;
}

function buildRecoveryEmail(confirmUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0;">🔐 Password Reset</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Hello,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">We received a request to reset your password for your Sow2Grow account. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${confirmUrl}</p>
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="font-size: 14px; color: #666; margin: 0;">This link will expire in 60 minutes for security reasons.</p>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    </div>`;
}

function buildEmailChangeEmail(confirmUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0;">📧 Email Change Request</h1>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Hello,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">We received a request to change your email address. Please confirm your new email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Confirm New Email
        </a>
      </div>
      <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">If you didn't request this change, please contact our support team immediately.</p>
      </div>
    </div>`;
}

serve(handler);
