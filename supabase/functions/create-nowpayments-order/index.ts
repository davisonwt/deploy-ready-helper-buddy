import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

interface CreateOrderRequest {
  orchardId: string;
  amount: number;
  pocketsCount: number;
  message?: string;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Check idempotency
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      const { data: existingPayment } = await supabase
        .from('payment_idempotency')
        .select('response_data')
        .eq('idempotency_key', idempotencyKey)
        .eq('user_id', user.id)
        .single();

      if (existingPayment) {
        console.log('⚠️ Returning cached response for idempotency key:', idempotencyKey);
        return new Response(
          JSON.stringify(existingPayment.response_data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Rate limiting: 5 payments per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPayments } = await supabase
      .from('bestowals')
      .select('*', { count: 'exact', head: true })
      .eq('bestower_id', user.id)
      .gte('created_at', oneHourAgo);

    if (recentPayments && recentPayments >= 5) {
      console.error('❌ Rate limit exceeded for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 5 payments per hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateOrderRequest = await req.json();
    const { orchardId, amount, pocketsCount, message, currency = 'USD', successUrl, cancelUrl } = body;

    console.log('📦 Creating order:', { orchardId, amount, pocketsCount, currency });

    // Validate input
    if (!orchardId || !amount || amount <= 0 || !pocketsCount || pocketsCount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get orchard details
    const { data: orchard, error: orchardError } = await supabase
      .from('orchards')
      .select('id, title, grower_id, pocket_price, available_pockets')
      .eq('id', orchardId)
      .single();

    if (orchardError || !orchard) {
      console.error('❌ Orchard not found:', orchardId, orchardError);
      return new Response(
        JSON.stringify({ error: 'Orchard not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify amount matches expected price
    const expectedAmount = pocketsCount * (orchard.pocket_price || 0);
    if (Math.abs(amount - expectedAmount) > 0.01) {
      console.error('❌ Amount mismatch:', { amount, expectedAmount });
      return new Response(
        JSON.stringify({ error: 'Amount does not match expected price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check available pockets
    if (orchard.available_pockets < pocketsCount) {
      return new Response(
        JSON.stringify({ error: 'Not enough pockets available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for bestowal
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Create pending bestowal
    const { data: bestowal, error: bestowalError } = await supabase
      .from('bestowals')
      .insert({
        bestower_id: user.id,
        bestower_profile_id: profile?.id || null,
        orchard_id: orchardId,
        amount: amount,
        currency: currency,
        pockets_count: pocketsCount,
        message: message || null,
        payment_method: 'nowpayments',
        payment_status: 'pending',
        distribution_mode: 'automatic',
      })
      .select()
      .single();

    if (bestowalError || !bestowal) {
      console.error('❌ Failed to create bestowal:', bestowalError);
      throw bestowalError;
    }

    console.log('✅ Created bestowal:', bestowal.id);

    // Build callback URLs
    const origin = req.headers.get('origin') || 'https://sow2growapp.lovable.app';
    const finalSuccessUrl = successUrl || `${origin}/payment-success?orderId=${bestowal.id}&provider=nowpayments`;
    const finalCancelUrl = cancelUrl || `${origin}/payment-cancelled?orderId=${bestowal.id}&provider=nowpayments`;
    const ipnCallbackUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

    // Create NOWPayments invoice
    const invoiceResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: currency.toLowerCase(),
        order_id: bestowal.id,
        order_description: `Bestowal for orchard: ${orchard.title} (${pocketsCount} pocket${pocketsCount > 1 ? 's' : ''})`,
        ipn_callback_url: ipnCallbackUrl,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        is_fixed_rate: true,
        is_fee_paid_by_user: false,
      }),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('❌ NOWPayments API error:', invoiceResponse.status, errorText);
      
      // Mark bestowal as failed
      await supabase
        .from('bestowals')
        .update({ payment_status: 'failed' })
        .eq('id', bestowal.id);

      throw new Error(`NOWPayments API error: ${errorText}`);
    }

    const invoiceData = await invoiceResponse.json();
    console.log('✅ NOWPayments invoice created:', invoiceData.id);

    // Update bestowal with invoice ID
    await supabase
      .from('bestowals')
      .update({ 
        payment_reference: String(invoiceData.id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bestowal.id);

    // Create audit log
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'create_nowpayments_order',
      amount: amount,
      currency: currency,
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        bestowal_id: bestowal.id,
        orchard_id: orchardId,
        invoice_id: invoiceData.id,
        pockets_count: pocketsCount,
      },
    });

    const responseData = {
      success: true,
      bestowalId: bestowal.id,
      invoiceId: invoiceData.id,
      invoiceUrl: invoiceData.invoice_url,
    };

    // Store idempotency response
    if (idempotencyKey) {
      await supabase.from('payment_idempotency').insert({
        idempotency_key: idempotencyKey,
        user_id: user.id,
        response_data: responseData,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create payment', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
