import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nowpayments-sig',
};

interface NOWPaymentsIPN {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  actually_paid: number;
  actually_paid_at_fiat: number;
  outcome_amount: number;
  outcome_currency: string;
}

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ipnSecret = Deno.env.get('NOWPAYMENTS_IPN_SECRET')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-nowpayments-sig');

    console.log('📥 [NOWPayments Webhook] Received IPN callback');
    console.log('Signature present:', !!signature);

    // Verify signature
    if (!signature) {
      console.error('❌ Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort the JSON keys alphabetically for signature verification
    const ipnData: NOWPaymentsIPN = JSON.parse(rawBody);
    const sortedData = Object.keys(ipnData)
      .sort()
      .reduce((obj: Record<string, any>, key) => {
        obj[key] = (ipnData as Record<string, any>)[key];
        return obj;
      }, {});
    const sortedPayload = JSON.stringify(sortedData);

    const isValid = await verifySignature(sortedPayload, signature, ipnSecret);
    if (!isValid) {
      console.error('❌ Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Signature verified successfully');
    console.log('Payment ID:', ipnData.payment_id);
    console.log('Order ID (Bestowal ID):', ipnData.order_id);
    console.log('Payment Status:', ipnData.payment_status);
    console.log('Amount:', ipnData.price_amount, ipnData.price_currency);
    console.log('Actually Paid:', ipnData.actually_paid, ipnData.pay_currency);

    // Check for duplicate webhook processing
    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('webhook_id', `nowpayments_${ipnData.payment_id}_${ipnData.payment_status}`)
      .single();

    if (existingWebhook) {
      console.log('⚠️ Webhook already processed, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record webhook to prevent replay
    await supabase.from('processed_webhooks').insert({
      webhook_id: `nowpayments_${ipnData.payment_id}_${ipnData.payment_status}`,
      provider: 'nowpayments',
      processed_at: new Date().toISOString(),
    });

    // Get the bestowal by order_id
    const { data: bestowal, error: bestowalError } = await supabase
      .from('bestowals')
      .select('*, orchards(title, grower_id)')
      .eq('id', ipnData.order_id)
      .single();

    if (bestowalError || !bestowal) {
      console.error('❌ Bestowal not found:', ipnData.order_id, bestowalError);
      return new Response(
        JSON.stringify({ error: 'Bestowal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Found bestowal:', bestowal.id);

    // Map NOWPayments status to our status
    let paymentStatus: string;
    switch (ipnData.payment_status) {
      case 'waiting':
        paymentStatus = 'pending';
        break;
      case 'confirming':
        paymentStatus = 'processing';
        break;
      case 'confirmed':
      case 'sending':
        paymentStatus = 'processing';
        break;
      case 'finished':
        paymentStatus = 'completed';
        break;
      case 'partially_paid':
        paymentStatus = 'partial';
        break;
      case 'failed':
      case 'refunded':
        paymentStatus = 'failed';
        break;
      case 'expired':
        paymentStatus = 'expired';
        break;
      default:
        paymentStatus = 'pending';
    }

    // Update bestowal status
    const updateData: Record<string, any> = {
      payment_status: paymentStatus,
      payment_reference: String(ipnData.payment_id),
      updated_at: new Date().toISOString(),
    };

    if (paymentStatus === 'completed') {
      updateData.distributed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('bestowals')
      .update(updateData)
      .eq('id', bestowal.id);

    if (updateError) {
      console.error('❌ Failed to update bestowal:', updateError);
      throw updateError;
    }

    console.log(`✅ Updated bestowal status to: ${paymentStatus}`);

    // Log the payment in payment_transactions
    await supabase.from('payment_transactions').insert({
      user_id: bestowal.bestower_id,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency.toUpperCase(),
      payment_method: 'nowpayments',
      payment_provider_id: String(ipnData.payment_id),
      status: paymentStatus,
      metadata: {
        pay_currency: ipnData.pay_currency,
        pay_amount: ipnData.pay_amount,
        actually_paid: ipnData.actually_paid,
        purchase_id: ipnData.purchase_id,
        pay_address: ipnData.pay_address,
      },
    });

    // Create audit log
    await supabase.from('payment_audit_log').insert({
      user_id: bestowal.bestower_id,
      action: 'nowpayments_webhook',
      amount: ipnData.price_amount,
      currency: ipnData.price_currency.toUpperCase(),
      status: paymentStatus,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        payment_id: ipnData.payment_id,
        bestowal_id: bestowal.id,
        ipn_status: ipnData.payment_status,
      },
    });

    // If payment completed, send notification
    if (paymentStatus === 'completed') {
      console.log('🎉 Payment completed! Sending notifications...');
      
      // Create activity feed entry for the grower
      if (bestowal.orchards?.grower_id) {
        await supabase.from('activity_feed').insert({
          user_id: bestowal.orchards.grower_id,
          actor_id: bestowal.bestower_id,
          action_type: 'bestowal_received',
          mode_type: 'orchard',
          entity_type: 'bestowal',
          entity_id: bestowal.id,
          content: `New bestowal of ${ipnData.price_amount} ${ipnData.price_currency} received for ${bestowal.orchards.title}`,
          metadata: {
            amount: ipnData.price_amount,
            currency: ipnData.price_currency,
            pockets_count: bestowal.pockets_count,
            payment_method: 'nowpayments',
          },
        });
      }

      // Try to trigger distribution if automatic
      if (bestowal.distribution_mode === 'automatic') {
        try {
          await supabase.functions.invoke('distribute-bestowal', {
            body: { bestowalId: bestowal.id },
          });
          console.log('✅ Distribution triggered successfully');
        } catch (distError) {
          console.error('⚠️ Distribution trigger failed (will retry manually):', distError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: paymentStatus,
        bestowal_id: bestowal.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
