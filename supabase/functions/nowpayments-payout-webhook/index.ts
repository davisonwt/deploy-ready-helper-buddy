import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nowpayments-sig',
};

// NOWPayments whitelisted IP addresses
const NOWPAYMENTS_IPS = [
  '51.89.194.21',
  '51.75.77.69',
  '138.201.172.58',
  '65.21.158.36',
];

function getClientIP(req: Request): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

function isWhitelistedIP(ip: string): boolean {
  const isDev = Deno.env.get('ENVIRONMENT') === 'development';
  if (isDev) return true;
  return NOWPAYMENTS_IPS.includes(ip);
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
    // Verify IP whitelist
    const clientIP = getClientIP(req);
    console.log('📥 [Payout Webhook] Request from IP:', clientIP);

    if (!isWhitelistedIP(clientIP)) {
      console.error('❌ IP not whitelisted:', clientIP);
      return new Response(
        JSON.stringify({ error: 'IP not whitelisted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-nowpayments-sig');

    console.log('📥 [Payout Webhook] Received callback');

    // Verify signature
    if (!signature) {
      console.error('❌ Missing signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payoutData = JSON.parse(rawBody);
    const sortedData = Object.keys(payoutData)
      .sort()
      .reduce((obj: Record<string, any>, key) => {
        obj[key] = (payoutData as Record<string, any>)[key];
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

    console.log('✅ Signature verified');
    console.log('Payout ID:', payoutData.id);
    console.log('Status:', payoutData.status);
    console.log('Extra ID (Payout Record):', payoutData.extra_id);

    // Get the payout record
    const { data: payout, error: payoutError } = await supabase
      .from('sower_payouts')
      .select('*')
      .eq('id', payoutData.extra_id)
      .single();

    if (payoutError || !payout) {
      console.error('❌ Payout record not found:', payoutData.extra_id);
      return new Response(
        JSON.stringify({ error: 'Payout record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map NOWPayments status to our status
    let payoutStatus: string;
    switch (payoutData.status) {
      case 'WAITING':
      case 'PENDING':
        payoutStatus = 'processing';
        break;
      case 'SENDING':
        payoutStatus = 'processing';
        break;
      case 'FINISHED':
        payoutStatus = 'completed';
        break;
      case 'FAILED':
      case 'REFUNDED':
        payoutStatus = 'failed';
        break;
      default:
        payoutStatus = 'processing';
    }

    // Update payout record
    const updateData: Record<string, any> = {
      status: payoutStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...payout.metadata,
        webhook_data: payoutData,
      },
    };

    if (payoutStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (payoutStatus === 'failed') {
      updateData.failure_reason = payoutData.error || 'Payout failed';
      
      // Refund the balance
      const { data: balance } = await supabase
        .from('sower_balances')
        .select('*')
        .eq('user_id', payout.user_id)
        .single();

      if (balance) {
        await supabase
          .from('sower_balances')
          .update({
            available_balance: balance.available_balance + payout.amount,
            total_withdrawn: Math.max(0, (balance.total_withdrawn || 0) - payout.amount),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payout.user_id);
      }
    }

    await supabase
      .from('sower_payouts')
      .update(updateData)
      .eq('id', payout.id);

    console.log(`✅ Updated payout status to: ${payoutStatus}`);

    // Create audit log
    await supabase.from('payment_audit_log').insert({
      user_id: payout.user_id,
      action: 'payout_webhook',
      amount: payout.amount,
      currency: 'USD',
      status: payoutStatus,
      ip_address: clientIP,
      metadata: {
        payout_id: payout.id,
        nowpayments_id: payoutData.id,
        nowpayments_status: payoutData.status,
      },
    });

    return new Response(
      JSON.stringify({ success: true, status: payoutStatus }),
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
