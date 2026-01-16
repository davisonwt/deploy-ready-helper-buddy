import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

// S2G Platform Wallet Addresses
const S2G_WALLETS = {
  // Main Holdings Wallet - receives all product/orchard bestowals (USDC on Solana)
  HOLDINGS: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaM',
  // Admin/Tithings Wallet - receives platform fees, tithings, free-will gifts (USDT on Solana)
  ADMIN: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaN',
};

// Distribution percentages
const DISTRIBUTION = {
  ORCHARD: {
    GROWER: 0.85,     // 85% to grower/sower
    TITHING: 0.10,    // 10% tithing
    ADMIN: 0.05,      // 5% admin fee
  },
  PRODUCT: {
    CREATOR: 0.70,    // 70% to creators
    WHISPERS: 0.15,   // 15% to product whispers
    TITHING: 0.10,    // 10% tithing
    ADMIN: 0.05,      // 5% admin fee
  }
};

interface ProductItem {
  id: string;
  title: string;
  price: number;
  sower_id: string;
}

interface CreateOrderRequest {
  // For orchard bestowals
  orchardId?: string;
  amount: number;
  pocketsCount?: number;
  message?: string;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
  // Payment type determines routing
  paymentType: 'orchard' | 'product' | 'tithe' | 'freewill';
  // For product bestowals
  productItems?: ProductItem[];
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
    const { 
      orchardId, 
      amount, 
      pocketsCount, 
      message, 
      currency = 'USD', 
      successUrl, 
      cancelUrl,
      paymentType = 'orchard',
      productItems
    } = body;

    console.log('📦 Creating order:', { paymentType, amount, orchardId, productCount: productItems?.length || 0 });

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for bestowal
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let orderDescription = '';
    let bestowalData: Record<string, any> = {
      bestower_id: user.id,
      bestower_profile_id: profile?.id || null,
      amount: amount,
      currency: currency,
      payment_method: 'nowpayments',
      payment_status: 'pending',
      distribution_mode: 'manual', // All funds held until confirmed
      message: message || null,
    };

    // Handle different payment types
    if (paymentType === 'orchard' && orchardId) {
      // Validate orchard
      if (!pocketsCount || pocketsCount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid pockets count' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      orderDescription = `Bestowal for orchard: ${orchard.title} (${pocketsCount} pocket${pocketsCount > 1 ? 's' : ''})`;
      bestowalData.orchard_id = orchardId;
      bestowalData.pockets_count = pocketsCount;
      bestowalData.distribution_data = {
        type: 'orchard',
        orchard_id: orchardId,
        orchard_title: orchard.title,
        grower_id: orchard.grower_id,
        pockets_count: pocketsCount,
        distribution: DISTRIBUTION.ORCHARD,
        grower_amount: amount * DISTRIBUTION.ORCHARD.GROWER,
        tithing_amount: amount * DISTRIBUTION.ORCHARD.TITHING,
        admin_amount: amount * DISTRIBUTION.ORCHARD.ADMIN,
        holding_wallet: S2G_WALLETS.HOLDINGS,
        admin_wallet: S2G_WALLETS.ADMIN,
      };

    } else if (paymentType === 'product' && productItems && productItems.length > 0) {
      // Product bestowal
      const productTitles = productItems.map(p => p.title).join(', ');
      orderDescription = `Product bestowal: ${productTitles}`;
      
      // Use a placeholder orchard_id for products (or create product_bestowals table reference)
      // For now, we'll use the bestowals table with null orchard_id and store product data
      bestowalData.pockets_count = productItems.length;
      bestowalData.distribution_data = {
        type: 'product',
        products: productItems.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          sower_id: p.sower_id,
          creator_amount: p.price * DISTRIBUTION.PRODUCT.CREATOR,
          whispers_amount: p.price * DISTRIBUTION.PRODUCT.WHISPERS,
          tithing_amount: p.price * DISTRIBUTION.PRODUCT.TITHING,
          admin_amount: p.price * DISTRIBUTION.PRODUCT.ADMIN,
        })),
        total_amount: amount,
        distribution: DISTRIBUTION.PRODUCT,
        total_creator_amount: amount * DISTRIBUTION.PRODUCT.CREATOR,
        total_whispers_amount: amount * DISTRIBUTION.PRODUCT.WHISPERS,
        total_tithing_amount: amount * DISTRIBUTION.PRODUCT.TITHING,
        total_admin_amount: amount * DISTRIBUTION.PRODUCT.ADMIN,
        holding_wallet: S2G_WALLETS.HOLDINGS,
        admin_wallet: S2G_WALLETS.ADMIN,
      };

    } else if (paymentType === 'tithe' || paymentType === 'freewill') {
      // Tithing or free-will gift - goes directly to admin wallet
      orderDescription = paymentType === 'tithe' 
        ? `Tithing offering: $${amount}` 
        : `Free-will gift: $${amount}`;
      bestowalData.pockets_count = 1;
      bestowalData.distribution_data = {
        type: paymentType,
        total_amount: amount,
        admin_wallet: S2G_WALLETS.ADMIN,
        destination: 'admin', // All goes to admin wallet
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment type or missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create pending bestowal - need to handle products without orchard_id
    // For product bestowals, we need a way to store without orchard_id
    // Let's create a special "products" pseudo-orchard or use null
    if (paymentType === 'product') {
      // Get or create a system orchard for products
      const { data: productOrchard } = await supabase
        .from('orchards')
        .select('id')
        .eq('title', '__PRODUCT_BESTOWALS__')
        .single();

      if (productOrchard) {
        bestowalData.orchard_id = productOrchard.id;
      } else {
        // Products go through product_bestowals table instead
        // For now, skip orchard_id requirement by using first product's related orchard
        // or we need to create product bestowal entries separately
        const { data: newProductBestowal, error: productError } = await supabase
          .from('product_bestowals')
          .insert({
            bestower_id: user.id,
            product_id: productItems![0].id,
            sower_id: productItems![0].sower_id,
            amount: amount,
            s2g_fee: amount * DISTRIBUTION.PRODUCT.ADMIN,
            sower_amount: amount * DISTRIBUTION.PRODUCT.CREATOR,
            grower_amount: amount * DISTRIBUTION.PRODUCT.WHISPERS,
            status: 'pending',
            payment_method: 'nowpayments',
            payment_reference: `pending_${Date.now()}`,
          })
          .select()
          .single();

        if (productError) {
          console.error('Failed to create product bestowal:', productError);
        } else {
          console.log('✅ Created product bestowal:', newProductBestowal.id);
        }
      }
    }

    // For tithe/freewill, we also need an orchard_id workaround
    if ((paymentType === 'tithe' || paymentType === 'freewill') && !bestowalData.orchard_id) {
      // Use a system orchard for tithings
      const { data: tithingOrchard } = await supabase
        .from('orchards')
        .select('id')
        .eq('title', '__TITHING_OFFERINGS__')
        .single();
      
      if (tithingOrchard) {
        bestowalData.orchard_id = tithingOrchard.id;
      }
    }

    // Create bestowal record (only if we have orchard_id for orchard type)
    let bestowal: any = null;
    if (paymentType === 'orchard') {
      const { data, error: bestowalError } = await supabase
        .from('bestowals')
        .insert(bestowalData)
        .select()
        .single();

      if (bestowalError || !data) {
        console.error('❌ Failed to create bestowal:', bestowalError);
        throw bestowalError;
      }
      bestowal = data;
      console.log('✅ Created bestowal:', bestowal.id);
    } else {
      // For products/tithe/freewill, create a payment record directly
      const orderId = `${paymentType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      bestowal = { id: orderId };
    }

    // Build callback URLs
    const origin = req.headers.get('origin') || 'https://sow2growapp.lovable.app';
    const finalSuccessUrl = successUrl || `${origin}/payment-success?orderId=${bestowal.id}&provider=nowpayments&type=${paymentType}`;
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
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        is_fixed_rate: true,
        is_fee_paid_by_user: true, // All fees paid by bestower as per requirements
      }),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('❌ NOWPayments API error:', invoiceResponse.status, errorText);
      
      // Mark bestowal as failed
      if (paymentType === 'orchard' && bestowal?.id) {
        await supabase
          .from('bestowals')
          .update({ payment_status: 'failed' })
          .eq('id', bestowal.id);
      }

      throw new Error(`NOWPayments API error: ${errorText}`);
    }

    const invoiceData = await invoiceResponse.json();
    console.log('✅ NOWPayments invoice created:', invoiceData.id);

    // Update bestowal with invoice ID (for orchard type)
    if (paymentType === 'orchard' && bestowal?.id) {
      await supabase
        .from('bestowals')
        .update({ 
          payment_reference: String(invoiceData.id),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bestowal.id);
    }

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
        payment_type: paymentType,
        invoice_id: invoiceData.id,
        product_count: productItems?.length,
      },
    });

    const responseData = {
      success: true,
      bestowalId: bestowal.id,
      invoiceId: invoiceData.id,
      invoiceUrl: invoiceData.invoice_url,
      paymentType: paymentType,
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
