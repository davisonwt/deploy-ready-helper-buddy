import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders, validatePaymentAmount } from "../_shared/security.ts";

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

function respond(
  corsHeaders: Record<string, string>,
  ok: boolean,
  payload: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify({ success: ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePaymentType(
  paymentType: CreateOrderRequest['paymentType'],
  orchardId?: string,
): CreateOrderRequest['paymentType'] {
  if (paymentType === 'orchard' && orchardId === 'tithing') return 'tithe';
  if (paymentType === 'orchard' && orchardId === 'free-will-gift') return 'freewill';
  return paymentType;
}

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

  let errorStage = 'init';
  let requestedPaymentType: CreateOrderRequest['paymentType'] | null = null;
  let normalizedPaymentType: CreateOrderRequest['paymentType'] | null = null;
  let orchardIdForDiagnostics: string | undefined;

  try {
    errorStage = 'authenticate';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return respond(corsHeaders, false, {
        error: 'Missing authorization header',
        diagnostics: { error_stage: 'authenticate' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return respond(corsHeaders, false, {
        error: 'Unauthorized',
        diagnostics: { error_stage: 'authenticate' },
      });
    }

    console.log('✅ PayPal: User authenticated:', user.id);

    errorStage = 'rate_limit';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentPayments } = await supabase
      .from('bestowals')
      .select('*', { count: 'exact', head: true })
      .eq('bestower_id', user.id)
      .gte('created_at', oneHourAgo);

    if (recentPayments && recentPayments >= 5) {
      return respond(corsHeaders, false, {
        error: 'Rate limit exceeded. Maximum 5 payments per hour.',
        diagnostics: { error_stage: 'rate_limit' },
      });
    }

    errorStage = 'parse_request';
    const body: CreateOrderRequest = await req.json();
    const {
      orchardId,
      amount,
      pocketsCount,
      message,
      currency = 'USD',
      paymentType = 'orchard',
      productItems,
    } = body;

    orchardIdForDiagnostics = orchardId;
    requestedPaymentType = paymentType;
    normalizedPaymentType = normalizePaymentType(paymentType, orchardId);

    console.log('📦 PayPal: Creating order:', {
      requestedPaymentType,
      normalizedPaymentType,
      amount,
      orchardId,
    });

    errorStage = 'validate_amount';
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.valid) {
      return respond(corsHeaders, false, {
        error: amountValidation.error,
        diagnostics: {
          error_stage: 'validate_amount',
          requested_payment_type: requestedPaymentType,
          normalized_payment_type: normalizedPaymentType,
        },
      });
    }

    errorStage = 'load_profile';
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let orderDescription = '';
    let bestowalData: Record<string, unknown> = {
      bestower_id: user.id,
      bestower_profile_id: profile?.id || null,
      amount,
      currency,
      payment_method: 'paypal',
      payment_status: 'pending',
      distribution_mode: 'manual',
      message: message || null,
    };

    errorStage = 'build_order_payload';
    if (normalizedPaymentType === 'orchard' && orchardId) {
      if (!pocketsCount || pocketsCount <= 0) {
        return respond(corsHeaders, false, {
          error: 'Invalid pockets count',
          diagnostics: {
            error_stage: 'build_order_payload',
            requested_payment_type: requestedPaymentType,
            normalized_payment_type: normalizedPaymentType,
            orchard_id: orchardId,
          },
        });
      }

      const { data: orchard, error: orchardError } = await supabase
        .from('orchards')
        .select('id, title, grower_id, pocket_price, available_pockets')
        .eq('id', orchardId)
        .single();

      if (orchardError || !orchard) {
        return respond(corsHeaders, false, {
          error: 'Orchard not found',
          diagnostics: {
            error_stage: 'build_order_payload',
            requested_payment_type: requestedPaymentType,
            normalized_payment_type: normalizedPaymentType,
            orchard_id: orchardId,
          },
        });
      }

      const expectedAmount = pocketsCount * (orchard.pocket_price || 0);
      if (Math.abs(amount - expectedAmount) > 0.01) {
        return respond(corsHeaders, false, {
          error: 'Amount does not match expected price',
          diagnostics: {
            error_stage: 'build_order_payload',
            requested_payment_type: requestedPaymentType,
            normalized_payment_type: normalizedPaymentType,
            orchard_id: orchardId,
            expected_amount: expectedAmount,
          },
        });
      }

      if (orchard.available_pockets < pocketsCount) {
        return respond(corsHeaders, false, {
          error: 'Not enough pockets available',
          diagnostics: {
            error_stage: 'build_order_payload',
            requested_payment_type: requestedPaymentType,
            normalized_payment_type: normalizedPaymentType,
            orchard_id: orchardId,
          },
        });
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
    } else if (normalizedPaymentType === 'product' && productItems && productItems.length > 0) {
      const productTitles = productItems.map((p) => p.title).join(', ');
      orderDescription = `Product bestowal: ${productTitles}`;
      bestowalData.pockets_count = productItems.length;
      bestowalData.distribution_data = {
        type: 'product',
        products: productItems.map((p) => ({
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
        holding_wallet: S2G_WALLETS.HOLDINGS,
        admin_wallet: S2G_WALLETS.ADMIN,
      };
    } else if (normalizedPaymentType === 'tithe' || normalizedPaymentType === 'freewill') {
      orderDescription = normalizedPaymentType === 'tithe'
        ? `Tithing offering: $${amount}`
        : `Free-will gift: $${amount}`;
      bestowalData.pockets_count = 1;
      bestowalData.distribution_data = {
        type: normalizedPaymentType,
        total_amount: amount,
        admin_wallet: S2G_WALLETS.ADMIN,
        destination: 'admin',
      };
    } else {
      return respond(corsHeaders, false, {
        error: 'Invalid payment type or missing required data',
        diagnostics: {
          error_stage: 'build_order_payload',
          requested_payment_type: requestedPaymentType,
          normalized_payment_type: normalizedPaymentType,
          orchard_id: orchardId,
        },
      });
    }

    errorStage = 'create_internal_record';
    let bestowal: any = null;
    if (normalizedPaymentType === 'orchard') {
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
    } else if (normalizedPaymentType === 'product' && productItems) {
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
      bestowal = { id: `${normalizedPaymentType}_${Date.now()}_${Math.random().toString(36).substring(7)}` };
    }

    errorStage = 'create_paypal_order';
    const origin = req.headers.get('origin') || 'https://sow2growapp.lovable.app';
    const returnUrl = `${origin}/payment-success?orderId=${bestowal.id}&provider=paypal&type=${normalizedPaymentType}`;
    const cancelUrl = `${origin}/payment-cancelled?orderId=${bestowal.id}&provider=paypal`;

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

      if (normalizedPaymentType === 'orchard' && bestowal?.id) {
        await supabase.from('bestowals').update({ payment_status: 'failed' }).eq('id', bestowal.id);
      }

      return respond(corsHeaders, false, {
        error: `PayPal API error: ${errorText}`,
        diagnostics: {
          error_stage: 'create_paypal_order',
          requested_payment_type: requestedPaymentType,
          normalized_payment_type: normalizedPaymentType,
          orchard_id: orchardId,
          paypal_status: paypalOrder.status,
        },
      });
    }

    errorStage = 'parse_paypal_response';
    const paypalData = await paypalOrder.json();
    console.log('✅ PayPal order created:', paypalData.id);

    const approvalLink = paypalData.links?.find((l: any) => l.rel === 'approve');
    const approvalUrl = approvalLink?.href;

    if (!approvalUrl) {
      return respond(corsHeaders, false, {
        error: 'No PayPal approval URL returned',
        diagnostics: {
          error_stage: 'parse_paypal_response',
          requested_payment_type: requestedPaymentType,
          normalized_payment_type: normalizedPaymentType,
          orchard_id: orchardId,
          paypal_order_id: paypalData.id,
        },
      });
    }

    errorStage = 'update_internal_record';
    if (normalizedPaymentType === 'orchard' && bestowal?.id) {
      await supabase.from('bestowals').update({
        payment_reference: paypalData.id,
        updated_at: new Date().toISOString(),
      }).eq('id', bestowal.id);
    }

    errorStage = 'audit_log';
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'create_paypal_order',
      amount,
      currency,
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        bestowal_id: bestowal.id,
        payment_type: normalizedPaymentType,
        requested_payment_type: requestedPaymentType,
        paypal_order_id: paypalData.id,
        product_count: productItems?.length,
      },
    });

    return respond(corsHeaders, true, {
      bestowalId: bestowal.id,
      paypalOrderId: paypalData.id,
      approvalUrl,
      paymentType: normalizedPaymentType,
      requestedPaymentType,
    });
  } catch (error) {
    console.error('❌ Error creating PayPal order:', error);
    return respond(corsHeaders, false, {
      error: error instanceof Error ? error.message : 'Failed to create PayPal payment',
      diagnostics: {
        error_stage: errorStage,
        requested_payment_type: requestedPaymentType,
        normalized_payment_type: normalizedPaymentType,
        orchard_id: orchardIdForDiagnostics,
      },
    });
  }
});
