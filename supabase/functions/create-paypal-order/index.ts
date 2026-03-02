import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders, validatePaymentAmount } from "../_shared/security.ts";

// Same distribution as NOWPayments
const S2G_WALLETS = {
  HOLDINGS: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaM',
  ADMIN: 'Hai8nC5rir14DFdiFTiC5NS4if5XYYgqGRRPctpfTdaN',
};

const DISTRIBUTION = {
  ORCHARD: { GROWER: 0.85, TITHING: 0.10, ADMIN: 0.05 },
  PRODUCT: { CREATOR: 0.70, WHISPERS: 0.15, TITHING: 0.10, ADMIN: 0.05 },
};

interface ProductItem {
  id: string;
  title: string;
  price: number;
  sower_id: string;
}

interface CreateOrderRequest {
  orchardId?: string;
  amount: number;
  pocketsCount?: number;
  message?: string;
  currency?: string;
  paymentType: 'orchard' | 'product' | 'tithe' | 'freewill';
  productItems?: ProductItem[];
}

// Get PayPal access token via client credentials
async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
  const baseUrl = Deno.env.get('PAYPAL_SANDBOX') === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

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
    const errorText = await response.text();
    throw new Error(`PayPal auth failed: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

function getPayPalBaseUrl(): string {
  return Deno.env.get('PAYPAL_SANDBOX') === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ PayPal: User authenticated:', user.id);

    // Rate limiting: 5 payments per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPayments } = await supabase
      .from('bestowals')
      .select('*', { count: 'exact', head: true })
      .eq('bestower_id', user.id)
      .gte('created_at', oneHourAgo);

    if (recentPayments && recentPayments >= 5) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Maximum 5 payments per hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateOrderRequest = await req.json();
    const { orchardId, amount, pocketsCount, message, currency = 'USD', paymentType = 'orchard', productItems } = body;

    console.log('📦 PayPal: Creating order:', { paymentType, amount, orchardId });

    // Validate amount
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.valid) {
      return new Response(
        JSON.stringify({ error: amountValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let orderDescription = '';
    let bestowalData: Record<string, any> = {
      bestower_id: user.id,
      bestower_profile_id: profile?.id || null,
      amount,
      currency,
      payment_method: 'paypal',
      payment_status: 'pending',
      distribution_mode: 'manual',
      message: message || null,
    };

    // Handle payment types (same logic as nowpayments)
    if (paymentType === 'orchard' && orchardId) {
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
        return new Response(
          JSON.stringify({ error: 'Orchard not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expectedAmount = pocketsCount * (orchard.pocket_price || 0);
      if (Math.abs(amount - expectedAmount) > 0.01) {
        return new Response(
          JSON.stringify({ error: 'Amount does not match expected price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
      const productTitles = productItems.map(p => p.title).join(', ');
      orderDescription = `Product bestowal: ${productTitles}`;
      bestowalData.pockets_count = productItems.length;
      bestowalData.distribution_data = {
        type: 'product',
        products: productItems.map(p => ({
          id: p.id, title: p.title, price: p.price, sower_id: p.sower_id,
          creator_amount: p.price * DISTRIBUTION.PRODUCT.CREATOR,
          whispers_amount: p.price * DISTRIBUTION.PRODUCT.WHISPERS,
          tithing_amount: p.price * DISTRIBUTION.PRODUCT.TITHING,
          admin_amount: p.price * DISTRIBUTION.PRODUCT.ADMIN,
        })),
        total_amount: amount,
        distribution: DISTRIBUTION.PRODUCT,
        holding_wallet: S2G_WALLETS.HOLDINGS,
        admin_wallet: S2G_WALLETS.ADMIN,
      };
    } else if (paymentType === 'tithe' || paymentType === 'freewill') {
      orderDescription = paymentType === 'tithe'
        ? `Tithing offering: $${amount}`
        : `Free-will gift: $${amount}`;
      bestowalData.pockets_count = 1;
      bestowalData.distribution_data = {
        type: paymentType,
        total_amount: amount,
        admin_wallet: S2G_WALLETS.ADMIN,
        destination: 'admin',
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment type or missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bestowal record for orchard type
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
    } else if (paymentType === 'product' && productItems) {
      // Create product bestowal
      const { data: newProductBestowal, error: productError } = await supabase
        .from('product_bestowals')
        .insert({
          bestower_id: user.id,
          product_id: productItems[0].id,
          sower_id: productItems[0].sower_id,
          amount,
          s2g_fee: amount * DISTRIBUTION.PRODUCT.ADMIN,
          sower_amount: amount * DISTRIBUTION.PRODUCT.CREATOR,
          grower_amount: amount * DISTRIBUTION.PRODUCT.WHISPERS,
          status: 'pending',
          payment_method: 'paypal',
          payment_reference: `paypal_pending_${Date.now()}`,
        })
        .select()
        .single();

      if (productError) {
        console.error('Failed to create product bestowal:', productError);
      }
      bestowal = newProductBestowal || { id: `product_${Date.now()}_${Math.random().toString(36).substring(7)}` };
    } else {
      bestowal = { id: `${paymentType}_${Date.now()}_${Math.random().toString(36).substring(7)}` };
    }

    // Build callback URLs
    const origin = req.headers.get('origin') || 'https://sow2growapp.lovable.app';
    const returnUrl = `${origin}/payment-success?orderId=${bestowal.id}&provider=paypal&type=${paymentType}`;
    const cancelUrl = `${origin}/payment-cancelled?orderId=${bestowal.id}&provider=paypal`;

    // Create PayPal order
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const paypalOrder = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: bestowal.id,
          description: orderDescription.substring(0, 127),
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
        }],
        application_context: {
          brand_name: 'Sow2Grow',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!paypalOrder.ok) {
      const errorText = await paypalOrder.text();
      console.error('❌ PayPal API error:', paypalOrder.status, errorText);

      if (paymentType === 'orchard' && bestowal?.id) {
        await supabase.from('bestowals').update({ payment_status: 'failed' }).eq('id', bestowal.id);
      }
      throw new Error(`PayPal API error: ${errorText}`);
    }

    const paypalData = await paypalOrder.json();
    console.log('✅ PayPal order created:', paypalData.id);

    // Find approval URL
    const approvalLink = paypalData.links?.find((l: any) => l.rel === 'approve');
    const approvalUrl = approvalLink?.href;

    if (!approvalUrl) {
      throw new Error('No PayPal approval URL returned');
    }

    // Update bestowal with PayPal order ID
    if (paymentType === 'orchard' && bestowal?.id) {
      await supabase.from('bestowals').update({
        payment_reference: paypalData.id,
        updated_at: new Date().toISOString(),
      }).eq('id', bestowal.id);
    }

    // Audit log
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'create_paypal_order',
      amount,
      currency,
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        bestowal_id: bestowal.id,
        payment_type: paymentType,
        paypal_order_id: paypalData.id,
        product_count: productItems?.length,
      },
    });

    const responseData = {
      success: true,
      bestowalId: bestowal.id,
      paypalOrderId: paypalData.id,
      approvalUrl,
      paymentType,
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error creating PayPal order:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create PayPal payment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
