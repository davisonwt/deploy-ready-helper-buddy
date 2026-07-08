import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

// Allow-list of domains permitted as site_url / redirect_to targets
const ALLOWED_HOSTS = new Set<string>([
  "sow2grow.online",
  "sow2growapp.com",
  "www.sow2growapp.com",
  "sow2growapp.lovable.app",
]);

function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    // allow *.lovable.app / *.lovable.dev preview hosts
    if (/\.lovable\.(app|dev)$/i.test(u.hostname)) return true;
    return false;
  } catch { return false; }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HOOK_SECRET) {
      console.error("SEND_EMAIL_HOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify the Supabase Auth webhook signature (standardwebhooks)
    // Accepts secret in either raw or `v1,<base64>` form.
    let wh: Webhook;
    try {
      const secret = HOOK_SECRET.startsWith("v1,") ? HOOK_SECRET.slice(3) : HOOK_SECRET;
      wh = new Webhook(secret);
    } catch (e) {
      console.error("Invalid webhook secret format", e);
      return new Response(JSON.stringify({ error: "server misconfigured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let verified: any;
    try {
      verified = wh.verify(payload, headers);
    } catch (e) {
      console.warn("Webhook signature verification failed", (e as Error).message);
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user, email_data } = verified as {
      user: { email: string; user_metadata?: any };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    // Validate URLs against allow-list before building any confirm link
    if (!hostAllowed(email_data.site_url)) {
      console.warn("Rejecting site_url not in allow-list:", email_data.site_url);
      return new Response(JSON.stringify({ error: "invalid site_url" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (email_data.redirect_to && !hostAllowed(email_data.redirect_to)) {
      console.warn("Rejecting redirect_to not in allow-list:", email_data.redirect_to);
      return new Response(JSON.stringify({ error: "invalid redirect_to" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const confirmUrl = `${email_data.site_url}/auth/confirm?token_hash=${encodeURIComponent(email_data.token_hash)}&type=${encodeURIComponent(email_data.email_action_type)}&redirect_to=${encodeURIComponent(email_data.redirect_to || email_data.site_url)}`;

    let subject = "";
    let html = "";

    switch (email_data.email_action_type) {
      case "signup":
        subject = "Welcome to Sow2Grow - Confirm Your Email";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">🌱 Welcome to Sow2Grow!</h1>
          <p>Hello${user.user_metadata?.first_name ? ` ${user.user_metadata.first_name}` : ''},</p>
          <p>Please confirm your email address to complete your registration.</p>
          <p><a href="${confirmUrl}" style="background:#22c55e;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;">Confirm Your Email</a></p>
          <p style="font-size:12px;color:#888;word-break:break-all;">${confirmUrl}</p>
        </div>`;
        break;
      case "recovery":
        subject = "Reset Your Sow2Grow Password";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">🔐 Password Reset</h1>
          <p><a href="${confirmUrl}" style="background:#ef4444;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;">Reset Password</a></p>
          <p style="font-size:12px;color:#888;word-break:break-all;">${confirmUrl}</p>
          <p style="font-size:12px;color:#999;">If you didn't request this, ignore this email.</p>
        </div>`;
        break;
      case "email_change":
        subject = "Confirm Your New Email Address";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">📧 Email Change Request</h1>
          <p><a href="${confirmUrl}" style="background:#3b82f6;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;">Confirm New Email</a></p>
        </div>`;
        break;
      default:
        throw new Error(`Unsupported email action type: ${email_data.email_action_type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Sow2Grow <no-reply@sow2grow.online>",
      to: [user.email],
      subject,
      html,
    });

    console.log("Auth email sent successfully");

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
