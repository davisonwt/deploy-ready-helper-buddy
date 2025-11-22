import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  user_id: string;
  type: 'incoming_call' | 'new_message' | 'new_orchard' | 'new_product' | 'orchard_update' | 'product_purchased';
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, type, title, body, url, data }: NotificationRequest = await req.json();

    console.log('Sending notification:', { user_id, type, title });

    // Insert notification into database (triggers real-time update)
    const { data: notification, error: insertError } = await supabase
      .from('user_notifications')
      .insert({
        user_id,
        type,
        title,
        message: body,
        action_url: url,
        metadata: data,
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Get user's push subscription (if exists)
    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single();

    // If user has push subscription and Web Push is configured, send push notification
    if (subscription?.subscription && Deno.env.get('VAPID_PRIVATE_KEY')) {
      try {
        // Note: You would need to implement Web Push here
        // This requires the web-push library or similar
        console.log('Would send push notification to subscription');
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
        // Don't fail the request if push fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
