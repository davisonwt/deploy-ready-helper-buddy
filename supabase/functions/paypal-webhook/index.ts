import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPostPaymentMessages } from "../_shared/postPaymentMessages.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function getPayPalBaseUrl(): string {
  return Deno.env.get('PAYPAL_SANDBOX') === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
  const baseUrl = getPayPalBaseUrl();
  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Verify PayPal webhook signature
async function verifyWebhookSignature(req: Request, body: string): Promise<boolean> {
  try {
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      console.warn('⚠️ PAYPAL_WEBHOOK_ID not set, skipping signature verification');
      return true; // Allow in dev, but log warning
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: req.headers.get('paypal-auth-algo'),
        cert_url: req.headers.get('paypal-cert-url'),
        transmission_id: req.headers.get('paypal-transmission-id'),
        transmission_sig: req.headers.get('paypal-transmission-sig'),
        transmission_time: req.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      console.error('❌ Webhook verification API failed');
      return false;
    }

    const result = await verifyResponse.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    
    // Guard against empty body (PayPal health-check pings)
    if (!body || body.trim().length === 0) {
      console.log('ℹ️ Empty body received (likely PayPal health-check ping)');
      return new Response(
        JSON.stringify({ received: true, note: 'empty body acknowledged' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('❌ Invalid PayPal webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    let event: any;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: corsHeaders }
      );
    }
    const eventType = event.event_type;
    console.log('📩 PayPal webhook event:', eventType);

    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      let orderId: string;
      let captureAmount: number;

      if (eventType === 'CHECKOUT.ORDER.APPROVED') {
        orderId = resource.id;
        captureAmount = parseFloat(resource.purchase_units?.[0]?.amount?.value || '0');

        // Auto-capture the payment
        try {
          const accessToken = await getPayPalAccessToken();
          const baseUrl = getPayPalBaseUrl();
          const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!captureRes.ok) {
            const captureError = await captureRes.text();
            console.error('❌ PayPal capture failed:', captureError);
          } else {
            console.log('✅ PayPal payment captured for order:', orderId);
          }
        } catch (captureErr) {
          console.error('❌ Error capturing PayPal payment:', captureErr);
        }
      } else {
        // PAYMENT.CAPTURE.COMPLETED
        orderId = resource.supplementary_data?.related_ids?.order_id || resource.id;
        captureAmount = parseFloat(resource.amount?.value || '0');
      }

      console.log('💰 PayPal payment confirmed:', { orderId, captureAmount });

      // Update bestowal by payment_reference (PayPal order ID)
      const { data: bestowal, error: updateError } = await supabase
        .from('bestowals')
        .update({
          payment_status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_reference', orderId)
        .eq('payment_method', 'paypal')
        .select()
        .single();

      if (updateError) {
        console.warn('⚠️ Could not find bestowal for PayPal order:', orderId, updateError);
        
        // Try product_bestowals
        const { error: productError } = await supabase
          .from('product_bestowals')
          .update({
            status: 'confirmed',
          })
          .like('payment_reference', `%${orderId}%`)
          .eq('payment_method', 'paypal');

        if (productError) {
          console.warn('⚠️ Could not update product bestowal either:', productError);
        }
      } else {
        console.log('✅ Bestowal confirmed:', bestowal?.id);
      }

      // Audit log
      await supabase.from('payment_audit_log').insert({
        user_id: bestowal?.bestower_id || 'unknown',
        action: 'paypal_payment_confirmed',
        amount: captureAmount,
        currency: 'USD',
        ip_address: req.headers.get('x-forwarded-for') || 'webhook',
        metadata: {
          paypal_order_id: orderId,
          event_type: eventType,
          bestowal_id: bestowal?.id,
        },
      });

      // ═══════════════════════════════════════════════
      // Send ChatApp notifications after payment confirmation
      // ═══════════════════════════════════════════════
      if (bestowal) {
        try {
          // Get orchard/content details for the notification
          let contentTitle = 'Bestowal';
          let sowerId: string | null = null;
          let contentType: 'orchard' | 'product' | 'music' | 'tithe' | 'freewill' = 'orchard';
          let trackFileUrl: string | undefined;
          let trackTitle: string | undefined;
          let artistName: string | undefined;

          // Check if this is an orchard bestowal
          const { data: orchardBestowal } = await supabase
            .from('bestowals')
            .select('*, orchards(title, user_id)')
            .eq('id', bestowal.id)
            .single();

          if (orchardBestowal?.orchards) {
            contentTitle = orchardBestowal.orchards.title || 'Orchard';
            sowerId = orchardBestowal.orchards.user_id;
          }

          // Check if this is a music track purchase
          const { data: musicPurchase } = await supabase
            .from('music_purchases')
            .select('*, dj_music_tracks(track_title, artist_name, file_url, dj_id)')
            .eq('payment_reference', orderId)
            .maybeSingle();

          if (musicPurchase?.dj_music_tracks) {
            contentType = 'music';
            contentTitle = musicPurchase.dj_music_tracks.track_title || 'Music Track';
            trackTitle = musicPurchase.dj_music_tracks.track_title;
            artistName = musicPurchase.dj_music_tracks.artist_name;
            trackFileUrl = musicPurchase.dj_music_tracks.file_url;
            sowerId = musicPurchase.dj_music_tracks.dj_id;
          }

          // Check product bestowals
          if (!sowerId) {
            const { data: productBestowal } = await supabase
              .from('product_bestowals')
              .select('*, products(title, sower_id)')
              .like('payment_reference', `%${orderId}%`)
              .maybeSingle();

            if (productBestowal?.products) {
              contentType = 'product';
              contentTitle = productBestowal.products.title || 'Product';
              sowerId = productBestowal.products.sower_id;
            }
          }

          if (sowerId && bestowal.bestower_id) {
            const sowerEarnings = captureAmount * 0.85;
            const tithingAmount = captureAmount * 0.10;
            const adminFee = captureAmount * 0.05;

            const result = await sendPostPaymentMessages(supabase, {
              bestowalId: bestowal.id,
              bestowerId: bestowal.bestower_id,
              sowerId,
              amount: captureAmount,
              currency: 'USD',
              paymentMethod: 'paypal',
              paymentReference: orderId,
              contentType,
              contentTitle,
              trackFileUrl,
              trackTitle,
              artistName,
              sowerEarnings,
              tithingAmount,
              adminFee,
            });

            if (result.success) {
              console.log('✅ ChatApp notifications sent successfully');
            } else {
              console.warn('⚠️ Some ChatApp notifications failed:', result.errors);
            }
          } else {
            console.warn('⚠️ Could not determine sower for ChatApp notifications');
          }
        } catch (notifError) {
          console.error('⚠️ ChatApp notification error (non-critical):', notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ PayPal webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
