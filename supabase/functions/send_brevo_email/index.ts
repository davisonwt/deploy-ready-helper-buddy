import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_FROM = "noreply@sow2grow.com";

interface BrevoEmailRequest {
  to: string[];
  subject: string;
  html: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Admin/gosat role check — only admins can send emails
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await serviceClient.rpc('has_role', {
      _user_id: userId, _role: 'admin'
    });

    if (!isAdmin) {
      console.error(`Non-admin user ${userId} attempted to send email via Brevo`);
      return new Response(JSON.stringify({ error: 'Forbidden: admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { to, subject, html }: BrevoEmailRequest = await req.json();

    // Validate inputs
    if (!Array.isArray(to) || to.length === 0 || to.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid recipients (1-50 allowed)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!subject || typeof subject !== 'string' || subject.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid subject' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY secret not configured');
    }

    console.log('Admin sending email via Brevo API...');
    console.log('To:', to);
    console.log('Subject:', subject);

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Sow2Grow", email: ALLOWED_FROM },
        to: to.map(email => ({ email })),
        subject: subject,
        htmlContent: html
      })
    });

    const result = await brevoResponse.json();
    
    if (!brevoResponse.ok) {
      console.error('Brevo API error:', result);
      throw new Error('Brevo API error');
    }

    console.log('Email sent successfully via Brevo API');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipients: to.length,
        messageId: result.messageId
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send_brevo_email function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email', success: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
