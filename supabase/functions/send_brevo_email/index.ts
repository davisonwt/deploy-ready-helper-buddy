import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_FROM_EMAIL = "no-reply@sow2grow.online";

interface BrevoEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // ignored — enforced server-side
}

function normalizeRecipients(to: string | string[]): string[] | null {
  const arr = Array.isArray(to) ? to : [to];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = arr.map((e) => String(e).trim()).filter(Boolean);
  if (cleaned.length === 0 || cleaned.length > 20) return null;
  return cleaned.every((e) => emailRe.test(e)) ? cleaned : null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require a valid Supabase JWT
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.slice(7).trim();
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, subject, html } = (await req.json()) as BrevoEmailRequest;

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

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) throw new Error('BREVO_API_KEY secret not configured');

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Sow2Grow", email: ALLOWED_FROM_EMAIL },
        to: recipients.map((email) => ({ email })),
        subject,
        htmlContent: html,
      }),
    });

    const result = await brevoResponse.json();
    if (!brevoResponse.ok) {
      console.error('Brevo API error:', result);
      throw new Error(`Brevo API error`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        recipients: recipients.length,
        messageId: result.messageId,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send_brevo_email function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
