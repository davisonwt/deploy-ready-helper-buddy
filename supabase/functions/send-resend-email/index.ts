import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only the platform's verified sending identity may be used as From
const ALLOWED_FROM = "Sow2Grow <no-reply@sow2grow.online>";

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // ignored; enforced server-side
}

function normalizeRecipients(to: string | string[]): string[] | null {
  const arr = Array.isArray(to) ? to : [to];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = arr.map((e) => String(e).trim()).filter(Boolean);
  if (cleaned.length === 0 || cleaned.length > 20) return null;
  return cleaned.every((e) => emailRe.test(e)) ? cleaned : null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a valid Supabase JWT (or the platform service role for internal calls)
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.slice(7).trim();
    const isServiceRole = SERVICE_ROLE_KEY.length > 0 && token === SERVICE_ROLE_KEY;

    let callerEmail: string | null = null;
    if (!isServiceRole) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      callerEmail = (userData.user.email ?? "").toLowerCase();
    }

    const body = (await req.json()) as EmailRequest;
    const { to, subject, html } = body;

    if (!subject || typeof subject !== "string" || subject.length > 500) {
      return new Response(JSON.stringify({ error: "invalid subject" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!html || typeof html !== "string" || html.length > 200_000) {
      return new Response(JSON.stringify({ error: "invalid html" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const recipients = normalizeRecipients(to);
    if (!recipients) {
      return new Response(JSON.stringify({ error: "invalid recipients" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Non-service callers may only email their own verified address.
    // Free-form recipients are reserved for internal, server-initiated sends.
    if (!isServiceRole) {
      const allowed =
        !!callerEmail &&
        recipients.length === 1 &&
        recipients[0].toLowerCase() === callerEmail;
      if (!allowed) {
        return new Response(JSON.stringify({ error: "recipient not permitted" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }


    const emailResponse = await resend.emails.send({
      from: ALLOWED_FROM,
      to: recipients,
      subject,
      html,
    });

    // resend.emails.send() resolves even when Resend itself rejected the
    // send (bad domain, invalid recipient, etc.) — the failure lands in
    // emailResponse.error, not a thrown exception. Checking it is the whole
    // fix: previously this always reported success regardless.
    if (emailResponse.error) {
      console.error("Resend send error:", emailResponse.error);
      return new Response(JSON.stringify({
        success: false,
        error: emailResponse.error.message || "Failed to send email",
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      recipients: recipients.length,
      data: emailResponse,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-resend-email function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
