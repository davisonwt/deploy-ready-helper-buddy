import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface QuoteRequestNotification {
  driverName: string;
  driverEmail?: string;
  requesterEmail: string;
  pickupLocation: string;
  dropoffLocation: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverName, requesterEmail, pickupLocation, dropoffLocation }: QuoteRequestNotification = await req.json();

    console.log('Quote request notification:', {
      driverName,
      requesterEmail,
      pickupLocation,
      dropoffLocation,
    });

    // In a production environment, you would send an email here using Brevo/SendGrid/etc.
    // For now, we just log the notification

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quote request notification logged',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in notify-quote-request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
