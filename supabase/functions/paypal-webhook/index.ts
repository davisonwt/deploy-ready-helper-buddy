import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('❌ Invalid PayPal webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const event = JSON.parse(body);
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
        status: 'confirmed',
        ip_address: req.headers.get('x-forwarded-for') || 'webhook',
        metadata: {
          paypal_order_id: orderId,
          event_type: eventType,
          bestowal_id: bestowal?.id,
        },
      });
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
