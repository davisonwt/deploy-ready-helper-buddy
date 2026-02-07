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

// S2G Platform Wallet Addresses
const S2G_WALLETS = {
  HOLDINGS: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaM',
  ADMIN: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaN',
};

// Distribution percentages - Sowers get 85% by default
// If whisperer is active, they get agreed % from the sower's 85%
const DISTRIBUTION = {
  BASE_SOWER: 0.85,     // 85% to sower (minus whisperer if active)
  TITHING: 0.10,        // 10% tithing
  ADMIN: 0.05,          // 5% admin fee
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

function getClientIP(req: Request): string {
  // Check various headers for the real IP
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

function isWhitelistedIP(ip: string): boolean {
  // In development/testing, allow all IPs
  const isDev = Deno.env.get('ENVIRONMENT') === 'development';
  if (isDev) return true;
  
  // Check if IP is in whitelist
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

async function updateSowerBalance(
  supabase: any,
  userId: string,
  amount: number,
  type: 'add_available' | 'add_pending' | 'move_pending_to_available'
): Promise<void> {
  // Get or create sower balance record
  const { data: existing } = await supabase
    .from('sower_balances')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    // Create new balance record
    await supabase.from('sower_balances').insert({
      user_id: userId,
      available_balance: type === 'add_available' ? amount : 0,
      pending_balance: type === 'add_pending' ? amount : 0,
      total_earned: amount,
    });
  } else {
    // Update existing balance
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (type === 'add_available') {
      updates.available_balance = existing.available_balance + amount;
      updates.total_earned = existing.total_earned + amount;
    } else if (type === 'add_pending') {
      updates.pending_balance = existing.pending_balance + amount;
    } else if (type === 'move_pending_to_available') {
      updates.pending_balance = Math.max(0, existing.pending_balance - amount);
      updates.available_balance = existing.available_balance + amount;
      updates.total_earned = existing.total_earned + amount;
    }

    await supabase
      .from('sower_balances')
      .update(updates)
      .eq('user_id', userId);
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
    console.log('📥 [NOWPayments Webhook] Request from IP:', clientIP);

    if (!isWhitelistedIP(clientIP)) {
      console.error('❌ IP not whitelisted:', clientIP);
      return new Response(
        JSON.stringify({ error: 'IP not whitelisted' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const webhookKey = `nowpayments_${ipnData.payment_id}_${ipnData.payment_status}`;
    const { data: existingWebhook } = await supabase
      .from('processed_webhooks')
      .select('id')
      .eq('webhook_id', webhookKey)
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
      webhook_id: webhookKey,
      provider: 'nowpayments',
      processed_at: new Date().toISOString(),
    });

    // Determine if this is an orchard bestowal or product/tithe payment
    const orderId = ipnData.order_id;
    const isOrchardBestowal = !orderId.startsWith('product_') && 
                              !orderId.startsWith('tithe_') && 
                              !orderId.startsWith('freewill_');

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

    let bestowal: any = null;
    let growerUserId: string | null = null;

    if (isOrchardBestowal) {
      // Get the bestowal by order_id
      const { data, error: bestowalError } = await supabase
        .from('bestowals')
        .select('*, orchards(title, grower_id)')
        .eq('id', orderId)
        .single();

      if (bestowalError || !data) {
        console.error('❌ Bestowal not found:', orderId, bestowalError);
        return new Response(
          JSON.stringify({ error: 'Bestowal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      bestowal = data;
      growerUserId = bestowal.orchards?.grower_id;
      console.log('📦 Found orchard bestowal:', bestowal.id);

      // Update bestowal status
      const updateData: Record<string, any> = {
        payment_status: paymentStatus,
        payment_reference: String(ipnData.payment_id),
        updated_at: new Date().toISOString(),
      };

      // For completed payments, determine if immediate release or escrow hold
      if (paymentStatus === 'completed') {
        // Orchards ALWAYS require courier pickup - hold funds in escrow
        updateData.hold_reason = 'awaiting_courier_pickup';
        updateData.release_status = 'held';
        
        console.log('🔒 ESCROW: Orchard bestowal - funds HELD until courier confirms pickup');
        
        // Calculate amounts but add to PENDING balance (not available)
        if (growerUserId) {
          let sowerAmount = ipnData.price_amount * DISTRIBUTION.BASE_SOWER;
          
          // Check if there's a whisperer assignment for this orchard
          const { data: whispererAssignment } = await supabase
            .from('product_whisperer_assignments')
            .select('*, whisperers(user_id, display_name)')
            .eq('orchard_id', bestowal.orchard_id)
            .eq('status', 'active')
            .single();
          
          if (whispererAssignment && whispererAssignment.whisperers) {
            const whispererPercent = whispererAssignment.commission_percent / 100;
            const whispererAmount = ipnData.price_amount * whispererPercent;
            sowerAmount = ipnData.price_amount * DISTRIBUTION.BASE_SOWER - whispererAmount;
            
            console.log(`💰 Whisperer ${whispererAssignment.whisperers.display_name} will earn $${whispererAmount.toFixed(2)} (HELD)`);
            
            // Add to PENDING balance - will be released when courier confirms
            await updateSowerBalance(supabase, whispererAssignment.whisperers.user_id, whispererAmount, 'add_pending');
            
            // Record whisperer earning as pending
            await supabase.from('whisperer_earnings').insert({
              whisperer_id: whispererAssignment.whisperer_id,
              assignment_id: whispererAssignment.id,
              bestowal_id: bestowal.id,
              amount: whispererAmount,
              commission_percent: whispererAssignment.commission_percent,
              status: 'pending', // Not processed yet - awaiting courier
              processed_at: null,
            });
            
            await supabase
              .from('product_whisperer_assignments')
              .update({
                total_bestowals: (whispererAssignment.total_bestowals || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', whispererAssignment.id);
          }
          
          console.log(`💰 Sower ${growerUserId} will receive $${sowerAmount.toFixed(2)} (HELD until courier pickup)`);
          await updateSowerBalance(supabase, growerUserId, sowerAmount, 'add_pending');
        }
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
    } else {
      // Handle product/tithe/freewill payments
      console.log(`📦 Non-orchard payment received: ${orderId}`);
      
      // For product payments, check delivery type to determine escrow vs immediate
      if (orderId.startsWith('product_') && paymentStatus === 'completed') {
        const { data: auditLog } = await supabase
          .from('payment_audit_log')
          .select('metadata')
          .eq('metadata->>bestowal_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (auditLog?.metadata?.product_items) {
          for (const product of auditLog.metadata.product_items) {
            // Get product delivery type
            const { data: productData } = await supabase
              .from('products')
              .select('delivery_type, type')
              .eq('id', product.id)
              .single();
            
            // Determine if this is digital (immediate) or physical (escrow)
            const deliveryType = productData?.delivery_type || 'digital';
            const isDigital = deliveryType === 'digital' || 
                             productData?.type === 'doc' || 
                             productData?.type === 'art' || 
                             productData?.type === 'music';
            
            let creatorAmount = product.price * DISTRIBUTION.BASE_SOWER;
            
            // Check for whisperer assignment
            const { data: whispererAssignment } = await supabase
              .from('product_whisperer_assignments')
              .select('*, whisperers(user_id, display_name)')
              .eq('product_id', product.id)
              .eq('status', 'active')
              .single();
            
            if (isDigital) {
              // DIGITAL PRODUCTS: Immediate release to sower
              console.log(`✅ DIGITAL PRODUCT: ${product.id} - IMMEDIATE RELEASE`);
              
              // Update product bestowal status
              await supabase
                .from('product_bestowals')
                .update({ 
                  release_status: 'released',
                  released_at: new Date().toISOString(),
                })
                .eq('product_id', product.id)
                .eq('payment_reference', orderId);
              
              if (whispererAssignment && whispererAssignment.whisperers) {
                const whispererPercent = whispererAssignment.commission_percent / 100;
                const whispererAmount = product.price * whispererPercent;
                creatorAmount = product.price * DISTRIBUTION.BASE_SOWER - whispererAmount;
                
                console.log(`💰 Whisperer earns $${whispererAmount.toFixed(2)} (IMMEDIATE)`);
                await updateSowerBalance(supabase, whispererAssignment.whisperers.user_id, whispererAmount, 'add_available');
                
                await supabase.from('whisperer_earnings').insert({
                  whisperer_id: whispererAssignment.whisperer_id,
                  assignment_id: whispererAssignment.id,
                  bestowal_id: orderId,
                  amount: whispererAmount,
                  commission_percent: whispererAssignment.commission_percent,
                  status: 'processed',
                  processed_at: new Date().toISOString(),
                });
              }
              
              console.log(`💰 Creator ${product.sower_id} receives $${creatorAmount.toFixed(2)} (IMMEDIATE)`);
              await updateSowerBalance(supabase, product.sower_id, creatorAmount, 'add_available');
              
            } else {
              // PHYSICAL PRODUCTS: Escrow until courier confirms
              console.log(`🔒 PHYSICAL PRODUCT: ${product.id} - HELD IN ESCROW`);
              
              // Update product bestowal status
              await supabase
                .from('product_bestowals')
                .update({ 
                  release_status: 'held',
                  hold_reason: 'awaiting_courier_pickup',
                })
                .eq('product_id', product.id)
                .eq('payment_reference', orderId);
              
              if (whispererAssignment && whispererAssignment.whisperers) {
                const whispererPercent = whispererAssignment.commission_percent / 100;
                const whispererAmount = product.price * whispererPercent;
                creatorAmount = product.price * DISTRIBUTION.BASE_SOWER - whispererAmount;
                
                console.log(`💰 Whisperer will earn $${whispererAmount.toFixed(2)} (HELD)`);
                await updateSowerBalance(supabase, whispererAssignment.whisperers.user_id, whispererAmount, 'add_pending');
                
                await supabase.from('whisperer_earnings').insert({
                  whisperer_id: whispererAssignment.whisperer_id,
                  assignment_id: whispererAssignment.id,
                  bestowal_id: orderId,
                  amount: whispererAmount,
                  commission_percent: whispererAssignment.commission_percent,
                  status: 'pending',
                  processed_at: null,
                });
              }
              
              console.log(`💰 Creator ${product.sower_id} will receive $${creatorAmount.toFixed(2)} (HELD until courier)`);
              await updateSowerBalance(supabase, product.sower_id, creatorAmount, 'add_pending');
            }
          }
        }
      }
      
      // Log it in payment_transactions regardless
      bestowal = { 
        id: orderId, 
        bestower_id: null
      };
    }

    // Log the payment in payment_transactions
    await supabase.from('payment_transactions').insert({
      user_id: bestowal?.bestower_id || null,
      amount: ipnData.price_amount,
      currency: ipnData.price_currency.toUpperCase(),
      payment_method: 'nowpayments',
      payment_provider_id: String(ipnData.payment_id),
      status: paymentStatus,
      metadata: {
        order_id: orderId,
        pay_currency: ipnData.pay_currency,
        pay_amount: ipnData.pay_amount,
        actually_paid: ipnData.actually_paid,
        purchase_id: ipnData.purchase_id,
        pay_address: ipnData.pay_address,
        holding_wallet: S2G_WALLETS.HOLDINGS,
        admin_wallet: S2G_WALLETS.ADMIN,
      },
    });

    // Create audit log
    await supabase.from('payment_audit_log').insert({
      user_id: bestowal?.bestower_id || null,
      action: 'nowpayments_webhook',
      amount: ipnData.price_amount,
      currency: ipnData.price_currency.toUpperCase(),
      status: paymentStatus,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        payment_id: ipnData.payment_id,
        order_id: orderId,
        ipn_status: ipnData.payment_status,
        holding_wallet: S2G_WALLETS.HOLDINGS,
        funds_location: paymentStatus === 'completed' ? 'S2G Holdings Wallet' : 'pending',
      },
    });

    // If payment completed, send notifications and create activity feed
    if (paymentStatus === 'completed' && isOrchardBestowal && bestowal) {
      console.log('🎉 Payment completed! Sending notifications...');
      
      // Create activity feed entry for the grower
      if (growerUserId) {
        await supabase.from('activity_feed').insert({
          user_id: growerUserId,
          actor_id: bestowal.bestower_id,
          action_type: 'bestowal_received',
          mode_type: 'orchard',
          entity_type: 'bestowal',
          entity_id: bestowal.id,
          content: `New bestowal of ${ipnData.price_amount} ${ipnData.price_currency} received for ${bestowal.orchards?.title || 'your orchard'}`,
          metadata: {
            amount: ipnData.price_amount,
            currency: ipnData.price_currency,
            pockets_count: bestowal.pockets_count,
            payment_method: 'nowpayments',
            funds_held: true,
            holding_wallet: S2G_WALLETS.HOLDINGS,
          },
        });
      }

      // Send notification messages via edge function
      try {
        await supabase.functions.invoke('send-bestowal-notifications', {
          body: { 
            bestowalId: bestowal.id,
            paymentCompleted: true,
            amount: ipnData.price_amount,
            currency: ipnData.price_currency.toUpperCase(),
          },
        });
        console.log('✅ Notifications sent successfully');
      } catch (notifError) {
        console.error('⚠️ Notification sending failed (non-critical):', notifError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: paymentStatus,
        order_id: orderId,
        funds_held_in: paymentStatus === 'completed' ? S2G_WALLETS.HOLDINGS : null,
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
