import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrevoEmailRequest {
  to: string[];
  subject: string;
  html: string;
  from: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from }: BrevoEmailRequest = await req.json();

    // Get Brevo API key from secrets
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY secret not configured');
    }

    console.log('Sending email via Brevo API...');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', from);

    // Send email via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: "Sow2Grow",
          email: from
        },
        to: to.map(email => ({ email })),
        subject: subject,
        htmlContent: html
      })
    });

    const result = await brevoResponse.json();
    
    if (!brevoResponse.ok) {
      console.error('Brevo API error:', result);
      throw new Error(`Brevo API error: ${JSON.stringify(result)}`);
    }

    console.log('Email sent successfully via Brevo API:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipients: to.length,
        messageId: result.messageId
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
    console.error('Error in send_brevo_email function:', error);
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